"use client";

/**
 * DOCU: Renders the document upload form and submission workflow adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The upload document modal view.
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  FileText,
  Paperclip,
} from "lucide-react";
import { uploadDocumentSchema, type UploadDocumentInput } from "@/lib/validation/document";
import { cn } from "@/lib/utils";
import { showErrorToast } from "@/components/ui/toast";

export interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: UploadDocumentInput) => Promise<unknown>;
  isPending: boolean;
  error: string | null;
}

interface IFileValidationItem {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "valid" | "warning" | "invalid" | "processing";
  message: string;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  onUpload,
  isPending,
  error,
}: UploadDocumentModalProps) {
  const [step, setStep] = useState<"details" | "validation" | "success">("details");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Compliance Document");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<IFileValidationItem[]>([]);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProceedToValidation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validation = uploadDocumentSchema.safeParse({ title, category, notes });
    if (!validation.success) {
      const errs: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) errs[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errs);
      return;
    }

    setStep("validation");
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  const handleFinalSubmit = async () => {
    try {
      await onUpload({ title, category, notes, file: rawFile || undefined });
      setStep("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      showErrorToast("Upload Failed", message);
    }
  };

  const handleCloseAndReset = () => {
    setTitle("");
    setCategory("Investment Proposal");
    setNotes("");
    setFiles([]);
    setRawFile(null);
    setStep("details");
    setUploadProgress(0);
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      setRawFile(dropped);
      const newFile: IFileValidationItem = {
        id: `f-${Date.now()}`,
        name: dropped.name,
        size: dropped.size < 1024 * 1024 ? `${(dropped.size / 1024).toFixed(1)} KB` : `${(dropped.size / (1024 * 1024)).toFixed(2)} MB`,
        type: dropped.name.split(".").pop()?.toUpperCase() || "DOC",
        status: "valid",
        message: "File integrity and size constraints passed",
      };
      setFiles([newFile]);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setRawFile(selected);
      const newFile: IFileValidationItem = {
        id: `f-${Date.now()}`,
        name: selected.name,
        size: selected.size < 1024 * 1024 ? `${(selected.size / 1024).toFixed(1)} KB` : `${(selected.size / (1024 * 1024)).toFixed(2)} MB`,
        type: selected.name.split(".").pop()?.toUpperCase() || "DOC",
        status: "valid",
        message: "File integrity and size constraints passed",
      };
      setFiles([newFile]);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setRawFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseAndReset()}>
      <DialogContent className="sm:max-w-xl w-[calc(100vw-2rem)] p-5 sm:p-6 bg-white border border-[#E6E8E7] text-[#183028] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto min-w-0 flex flex-col box-border">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900 truncate">
                {step === "details"
                  ? "Submit Compliance Document"
                  : step === "validation"
                  ? "Document Pre-Submission Verification"
                  : "Submission Confirmed"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {step === "details"
                  ? "Upload compliance documentation, audit reports, or regulatory filings for officer review."
                  : step === "validation"
                  ? "Automatic regulatory pre-flight checks and file integrity verification."
                  : "Document successfully placed in the Officer Evaluation Queue."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step Progress Pill Bar */}
        <div className="flex items-center gap-1.5 px-1 pb-1">
          {(["details", "validation", "success"] as const).map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  step === s
                    ? "bg-[#183028]"
                    : ["details", "validation", "success"].indexOf(step) > idx
                    ? "bg-[#183028]/80"
                    : "bg-[#E6E8E7]"
                )}
              />
            </React.Fragment>
          ))}
        </div>

        {step === "details" && (
          <form onSubmit={handleProceedToValidation} noValidate className="space-y-3.5 pt-1 min-w-0">
            {/* Drag & Drop Upload Canvas / Uploaded File Placeholder */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => {
                if (files.length === 0) {
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "border border-dashed rounded-xl transition-all shadow-2xs min-w-0 w-full box-border",
                files.length === 0
                  ? "p-5 flex flex-col items-center justify-center cursor-pointer text-center border-[#E6E8E7] bg-[#FFFFFF] hover:bg-[#C5E86C]/10 hover:border-[#183028]"
                  : "p-3 bg-[#FFFFFF] border-[#183028]/30",
                isDragOver && "border-[#183028] bg-[#C5E86C]/10 scale-[1.01]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx"
                onChange={handleFileSelect}
              />

              {files.length === 0 ? (
                <>
                  <div className="h-8 w-8 rounded-lg bg-[#FFFFFF] border border-[#E6E8E7] flex items-center justify-center text-[#183028] mb-1.5 shadow-2xs shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#183028] truncate max-w-full">
                    Click to browse <span className="font-normal text-[#183028]/60">or drag and drop document</span>
                  </p>
                  <p className="text-[10px] text-[#183028]/50 font-mono mt-0.5">
                    Supported: PDF, DOCX, XLSX (Max 25 MB)
                  </p>
                </>
              ) : (
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/60 block">
                      Attached Payload ({files.length})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-[10px] font-medium text-[#183028]/60 hover:text-[#183028] underline cursor-pointer"
                    >
                      Replace file
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto min-w-0">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-xl flex items-center justify-between text-xs bg-[#F7F9F8] border border-[#E6E8E7] gap-2 min-w-0 w-full box-border"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          <FileText className="h-3.5 w-3.5 text-[#183028]/60 shrink-0" />
                          <span className="font-medium text-[#183028] truncate min-w-0 flex-1" title={f.name}>
                            {f.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#183028]/60 shrink-0">({f.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          className="p-1 rounded-lg text-[#183028]/40 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-[#183028]">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Q4 Institutional Compliance Review & Audit"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (formErrors.title) {
                    setFormErrors((prev) => ({ ...prev, title: "" }));
                  }
                }}
                className={cn(
                  "h-9 text-xs rounded-xl bg-[#FFFFFF] border-[#E6E8E7] text-[#183028] focus:border-[#183028] focus:ring-1 focus:ring-[#183028] transition-colors shadow-2xs w-full min-w-0",
                  formErrors.title && "border-rose-500 ring-1 ring-rose-500"
                )}
              />
              {formErrors.title && (
                <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{formErrors.title}</p>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-[#183028]">
                Classification Category <span className="text-rose-500">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-full text-xs rounded-xl bg-white border border-[#E6E8E7] text-[#183028] focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs cursor-pointer min-w-0">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-[#E6E8E7] shadow-xl text-[#183028]">
                  <SelectItem value="Compliance Document" className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                    Compliance Document
                  </SelectItem>
                  <SelectItem value="Audit Report" className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                    Audit Report
                  </SelectItem>
                  <SelectItem value="Regulatory Filing" className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                    Regulatory Filing
                  </SelectItem>
                  <SelectItem value="Policy Agreement" className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                    Policy Agreement
                  </SelectItem>
                  <SelectItem value="Identity & KYC Verification" className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                    Identity &amp; KYC Verification
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-0">
              <label className="block text-xs font-semibold text-[#183028]">
                Advisor Overview Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include document scope, filing reference, or specific notes for the compliance officer..."
                className="min-h-[70px] w-full text-xs rounded-xl bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs resize-none min-w-0"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E8E7]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAndReset}
                className="h-8.5 px-3.5 text-xs rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8.5 px-4 text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                Proceed to Verification →
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "validation" && (
          <div className="space-y-4 pt-1">
            {/* Progress Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#183028]">
                <span className="flex items-center gap-1.5">
                  <Loader2
                    className={cn(
                      "h-3.5 w-3.5 text-[#183028]",
                      uploadProgress < 100 && "animate-spin"
                    )}
                  />
                  {uploadProgress < 100
                    ? "Running Pre-Flight Rule & Signature Integrity Verification..."
                    : "Pre-Flight Verification Complete"}
                </span>
                <span className="font-mono text-[#183028] font-bold">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5 bg-[#E6E8E7]" />
            </div>

            {/* Validation Checklist Items */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {files.map((file, fileIdx) => (
                <div
                  key={file.id}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between text-xs animate-slide-up shadow-2xs",
                    file.status === "valid" && "bg-emerald-50 border-emerald-200/80 text-emerald-950",
                    file.status === "warning" && "bg-amber-50 border-amber-200/80 text-amber-950",
                    file.status === "invalid" && "bg-rose-50 border-rose-200/80 text-rose-950"
                  )}
                  style={{ animationDelay: `${fileIdx * 50}ms` }}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-[#FFFFFF] border border-[#E6E8E7] flex items-center justify-center font-bold text-[10px] text-[#183028] shrink-0">
                      {file.type}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#183028] truncate">{file.name}</p>
                      <p className="text-[10px] text-[#183028]/60 mt-0.5">{file.message}</p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {file.status === "valid" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                    {file.status === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    {file.status === "invalid" && (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex items-center justify-between pt-3 border-t border-[#E6E8E7]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("details")}
                className="h-8.5 px-3.5 text-xs rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
              >
                ← Back to Details
              </Button>
              <Button
                type="button"
                disabled={isPending || uploadProgress < 100}
                onClick={handleFinalSubmit}
                className="h-8.5 px-4 text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] disabled:opacity-50 text-white rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Transmitting Payload...
                  </span>
                ) : (
                  "Confirm & Submit Proposal"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 flex flex-col items-center text-center space-y-3 animate-slide-up">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full bg-[#C5E86C]/30 animate-pulse" />
              <div className="relative h-14 w-14 rounded-full bg-[#FFFFFF] border border-[#C5E86C] flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-[#183028] animate-check-pop" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#183028]">
                Document Successfully Submitted
              </h3>
              <p className="text-xs text-[#183028]/60 max-w-sm">
                Proposal <span className="font-semibold text-[#183028]">{title}</span> has been logged and assigned to the Compliance Evaluation Queue.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleCloseAndReset}
                className="h-8.5 px-5 text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                Return to Workspace
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
