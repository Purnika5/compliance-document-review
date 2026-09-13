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
        `New version for document ${documentItem.id} uploaded successfully.`
      );
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
      <DialogContent className="max-w-lg p-6 bg-card border border-border text-foreground shadow-2xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Resubmit Document Revision
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Upload a revised file payload (v2) and submit notes explaining modifications.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {documentItem && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
            {/* Target Document Meta Box */}
            <div className="p-3 rounded-lg border border-amber-800/40 bg-amber-950/20 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-amber-400">{documentItem.id}</span>
                <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/60">
                  {documentItem.status}
                </span>
              </div>
              <p className="font-semibold text-foreground text-xs truncate">{documentItem.title}</p>
              <p className="text-[11px] text-muted-foreground">
                Category: {documentItem.category} • Submitted by {documentItem.submittedBy}
              </p>
            </div>

            {/* File Upload Box */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Revised Attachment File <span className="text-rose-400">*</span>
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
                  "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2",
                  isDragOver
                    ? "border-emerald-500 bg-emerald-950/20"
                    : selectedFile
                    ? "border-emerald-600/70 bg-emerald-950/30"
                    : "border-border hover:border-emerald-600/60 hover:bg-muted/30"
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
                  <div className="flex items-center justify-between w-full p-2 bg-background rounded-lg border border-border">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-semibold text-foreground truncate text-xs">{selectedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
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
                      className="p-1 rounded text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-amber-400/80" />
                    <div>
                      <p className="font-semibold text-foreground">Click to upload revised document</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Supports PDF, DOCX, DOC, or TXT up to 25MB
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Revision Notes / Explanation */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Revision Notes &amp; Addressed Changes
              </label>
              <Textarea
                placeholder="Explain the changes made in this revised version..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="min-h-[90px] text-xs bg-background border-border text-foreground rounded-md resize-none"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="h-8 text-xs border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 cursor-pointer"
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
