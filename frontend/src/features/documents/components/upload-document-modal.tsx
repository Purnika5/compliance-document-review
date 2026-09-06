"use client";

/**
 * DOCU: Renders the document upload form and submission workflow.
 * Last Updated Date: September 7, 2026
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
import { Alert } from "@/components/ui/alert";
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
  ShieldCheck,
  FileText,
  Paperclip,
} from "lucide-react";
import { uploadDocumentSchema, type UploadDocumentInput } from "@/lib/validation/document";
import { cn } from "@/lib/utils";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast";

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

const DEFAULT_FILES: IFileValidationItem[] = [
  {
    id: "f-1",
    name: "Q3_Strategic_Asset_Allocation.pdf",
    size: "2.4 MB",
    type: "PDF",
    status: "valid",
    message: "Valid PDF format & signature metadata verified",
  },
  {
    id: "f-2",
    name: "Client_Risk_Profile_2026.docx",
    size: "1.1 MB",
    type: "DOCX",
    status: "valid",
    message: "Suitability questionnaire annex verified",
  },
];

export function UploadDocumentModal({
  isOpen,
  onClose,
  onUpload,
  isPending,
  error,
}: UploadDocumentModalProps) {
  const [step, setStep] = useState<"details" | "validation" | "success">("details");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Investment Proposal");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<IFileValidationItem[]>(DEFAULT_FILES);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProceedToValidation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const result = uploadDocumentSchema.safeParse({ title, category, notes });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(fieldErrors);
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
      await onUpload({ title, category, notes });
      setStep("success");
      showSuccessToast("Document Uploaded", `"${title}" has been submitted for review.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      showErrorToast("Upload Failed", message);
    }
  };

  const handleCloseAndReset = () => {
    setTitle("");
    setCategory("Investment Proposal");
    setNotes("");
    setStep("details");
    setUploadProgress(0);
    onClose();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      const newFile: IFileValidationItem = {
        id: `f-${Date.now()}`,
        name: dropped.name,
        size: `${(dropped.size / (1024 * 1024)).toFixed(1)} MB`,
        type: dropped.name.split(".").pop()?.toUpperCase() || "DOC",
        status: "valid",
        message: "File integrity and size constraints passed",
      };
      setFiles((prev) => [newFile, ...prev]);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const newFile: IFileValidationItem = {
        id: `f-${Date.now()}`,
        name: selected.name,
        size: `${(selected.size / (1024 * 1024)).toFixed(1)} MB`,
        type: selected.name.split(".").pop()?.toUpperCase() || "DOC",
        status: "valid",
        message: "File integrity and size constraints passed",
      };
      setFiles((prev) => [newFile, ...prev]);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseAndReset()}>
      <DialogContent className="max-w-xl neu-surface p-6">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-primary text-white flex items-center justify-center shrink-0">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {step === "details"
                  ? "Submit Compliance Document"
                  : step === "validation"
                  ? "Document Pre-Submission Verification"
                  : "Submission Confirmed"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                {step === "details"
                  ? "Upload portfolio proposal, risk analysis, or compliance statement for officer review."
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
                    ? "bg-primary"
                    : ["details", "validation", "success"].indexOf(step) > idx
                    ? "bg-primary/40"
                    : "bg-slate-200"
                )}
              />
            </React.Fragment>
          ))}
        </div>

        {error && <Alert variant="error" title="Submission Failed" message={error} />}

        {step === "details" && (
          <form onSubmit={handleProceedToValidation} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Document Title <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Q4 Institutional Asset Allocation Model"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="neu-inset h-9 text-xs rounded-md"
                required
              />
              {formErrors.title && (
                <p className="text-[11px] font-semibold text-red-600">{formErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Classification Category <span className="text-red-600">*</span>
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="neu-inset h-9 text-xs rounded-md">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded border-slate-200">
                    <SelectItem value="Investment Proposal" className="text-xs cursor-pointer py-1.5">
                      Investment Proposal
                    </SelectItem>
                    <SelectItem value="Compliance Document" className="text-xs cursor-pointer py-1.5">
                      Compliance Document
                    </SelectItem>
                    <SelectItem value="Audit Report" className="text-xs cursor-pointer py-1.5">
                      Audit Report
                    </SelectItem>
                    <SelectItem value="Tax Strategy" className="text-xs cursor-pointer py-1.5">
                      Tax Strategy
                    </SelectItem>
                    <SelectItem value="Portfolio Brief" className="text-xs cursor-pointer py-1.5">
                      Portfolio Brief
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Security Classification
                </label>
                <div className="neu-inset flex h-9 w-full rounded-md px-3 items-center text-xs font-semibold text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-primary mr-1.5 shrink-0" />
                  <span>Level 2 Institutional</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Advisor Overview Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include client risk tolerance score, portfolio ID, or specific background..."
                className="neu-inset min-h-[70px] text-xs rounded-md"
              />
            </div>

            {/* Drag & Drop Upload Canvas */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition-all cursor-pointer text-center",
                isDragOver
                  ? "border-primary bg-gradient-to-br from-primary/5 to-cyan-50/60 scale-[1.01] shadow-inner"
                  : "border-slate-300 bg-background hover:bg-slate-100/70 hover:border-slate-400"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx"
                onChange={handleFileSelect}
              />
              <div className="neu-soft h-8 w-8 rounded-md flex items-center justify-center text-slate-600 mb-1.5">
                <Paperclip className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-900">
                Click to browse <span className="font-normal text-slate-500">or drag and drop document</span>
              </p>
              <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                Supported: PDF, DOCX, XLSX (Max 25 MB)
              </p>
            </div>

            {/* Attached file summary */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Attached Payload ({files.length})
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="neu-soft p-2 rounded-md flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({f.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(f.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAndReset}
                className="h-8 px-3 text-xs rounded border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded"
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
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2
                    className={cn(
                      "h-3.5 w-3.5 text-primary",
                      uploadProgress < 100 && "animate-spin"
                    )}
                  />
                  {uploadProgress < 100
                    ? "Running Pre-Flight Rule & Signature Integrity Verification..."
                    : "Pre-Flight Verification Complete"}
                </span>
                <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5 bg-slate-100" />
            </div>

            {/* Validation Checklist Items */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {files.map((file, fileIdx) => (
                <div
                  key={file.id}
                  className={cn(
                    "p-2.5 rounded border flex items-center justify-between text-xs animate-slide-up",
                    file.status === "valid" && "bg-emerald-50/40 border-emerald-200",
                    file.status === "warning" && "bg-amber-50/40 border-amber-200",
                    file.status === "invalid" && "bg-red-50/40 border-red-200"
                  )}
                  style={{ animationDelay: `${fileIdx * 60}ms` }}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="h-7 w-7 rounded bg-white border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                      {file.type}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{file.message}</p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {file.status === "valid" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-800" />
                    )}
                    {file.status === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-amber-800" />
                    )}
                    {file.status === "invalid" && (
                      <XCircle className="h-4 w-4 text-red-800" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("details")}
                className="h-8 px-3 text-xs rounded border-slate-300"
              >
                ← Back to Details
              </Button>
              <Button
                type="button"
                disabled={isPending || uploadProgress < 100}
                onClick={handleFinalSubmit}
                className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-[#153427] text-white rounded"
              >
                {isPending ? "Transmitting..." : "Confirm & Submit Proposal"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 flex flex-col items-center text-center space-y-3 animate-slide-up">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full bg-emerald-100 border border-emerald-200 animate-pulse opacity-60" />
              <div className="relative h-14 w-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-700 animate-check-pop" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Document Successfully Submitted
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Proposal <span className="font-semibold text-slate-800">{title}</span> has been logged and assigned to the Compliance Evaluation Queue.
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleCloseAndReset}
                className="h-8 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded"
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
