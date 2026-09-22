"use client";

/**
 * DOCU: Renders the Advisor Resubmission modal for documents marked as Needs Revision.
 * Submits new file version and revision notes via POST /documents/:id/resubmit.
 * Last Updated Date: September 13, 2026
 * @author Keith
 */
import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Loader2, RefreshCw, Paperclip, Trash2 } from "lucide-react";
import type { DocumentItem } from "@/entities/interfaces/document.interface";
import { documentService } from "@/services/document.service";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface ResubmitRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentItem: DocumentItem | null;
  onSuccess?: () => void;
}

export function ResubmitRevisionModal({
  isOpen,
  onClose,
  documentItem,
  onSuccess,
}: ResubmitRevisionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setRevisionNotes("");
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentItem) return;
    if (!selectedFile) {
      showErrorToast("File Required", "Please attach a revised document file.");
      return;
    }

    setIsSubmitting(true);
    try {
      await documentService.resubmitDocument(documentItem.id, selectedFile, revisionNotes);
      showSuccessToast(
        "Revision Submitted",
        `New version for "${documentItem.title || 'document'}" uploaded successfully.`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("compliance-notification-refresh"));
      }
      if (onSuccess) onSuccess();
      handleReset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resubmit document revision.";
      showErrorToast("Resubmission Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="max-w-lg p-6 sm:p-7 bg-white border border-slate-200/90 text-slate-900 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-700 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Resubmit Document Revision
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Upload a revised file payload (v2) and submit notes explaining modifications.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {documentItem && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
            {/* Target Document Meta Box */}
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-amber-800">{documentItem.id}</span>
                <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                  {documentItem.status}
                </span>
              </div>
              <p className="font-semibold text-[#183028] text-xs truncate">{documentItem.title}</p>
              <p className="text-[11px] text-[#183028]/60">
                Category: {documentItem.category} • Submitted by {documentItem.submittedBy}
              </p>
            </div>

            {/* File Upload Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">
                Revised Attachment File <span className="text-rose-500">*</span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 shadow-2xs",
                  isDragOver
                    ? "border-[#183028] bg-[#C5E86C]/15"
                    : selectedFile
                    ? "border-[#183028] bg-[#C5E86C]/10"
                    : "border-[#E6E8E7] bg-[#FFFFFF] hover:bg-[#C5E86C]/10 hover:border-[#183028]"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between w-full p-2.5 bg-[#FFFFFF] rounded-xl border border-[#E6E8E7] shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-[#183028] shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-[#183028] truncate text-xs">{selectedFile.name}</p>
                        <p className="text-[10px] text-[#183028]/60 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="p-1 rounded-lg text-[#183028]/40 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-[#183028]/70" />
                    <div>
                      <p className="font-semibold text-[#183028]">Click to upload revised document</p>
                      <p className="text-[10px] text-[#183028]/60 mt-0.5">
                        Supports PDF, DOCX, DOC, or TXT up to 25MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Revision Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#183028]">
                Revision Message
              </label>
              <Textarea
                placeholder="Explain the changes made in this revised version..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="min-h-[90px] w-full text-xs bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 rounded-xl resize-none focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#E6E8E7] gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="h-8.5 px-3.5 text-xs rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="h-8.5 px-4 text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] disabled:opacity-50 text-white rounded-xl gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Upload &amp; Resubmit</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
