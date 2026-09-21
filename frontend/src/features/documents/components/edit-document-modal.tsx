"use client";

/**
 * DOCU: Renders the document metadata editing modal adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The edit document modal view.
 * @author Keith
 */
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit3, Loader2 } from "lucide-react";
import type { DocumentItem, DocumentStatusType } from "@/lib/validation/document";
import { showSuccessToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface EditDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDoc: Partial<DocumentItem> & { id: string }) => Promise<void> | void;
}

const CATEGORIES = [
  { value: "Compliance Document", label: "Compliance Statement" },
  { value: "Audit Report", label: "Audit Report" },
  { value: "Regulatory Filing", label: "Regulatory Filing" },
  { value: "Policy Agreement", label: "Policy Agreement" },
  { value: "Identity & KYC Verification", label: "Identity & KYC Verification" },
];

const STATUS_OPTIONS: { value: DocumentStatusType; label: string }[] = [
  { value: "Pending", label: "Pending Review" },
  { value: "Approved", label: "Approved" },
  { value: "Needs Revision", label: "Needs Revision" },
  { value: "Rejected", label: "Rejected" },
];

export function EditDocumentModal({
  document,
  isOpen,
  onClose,
  onSave,
}: EditDocumentModalProps) {
  if (!document) return null;

  return (
    <EditDocumentForm document={document} isOpen={isOpen} onClose={onClose} onSave={onSave} />
  );
}

function EditDocumentForm({
  document,
  isOpen,
  onClose,
  onSave,
}: EditDocumentModalProps & { document: DocumentItem }) {
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category || "Investment Proposal");
  const [status, setStatus] = useState<DocumentStatusType>(document.status || "Pending");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;

    if (!title.trim()) {
      setTitleError("Document title cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: document.id,
        title: title.trim(),
        category,
        status,
      });
      showSuccessToast("Metadata Updated", `Document "${title.trim()}" changes saved.`);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 sm:p-7 bg-white border border-slate-200/90 text-slate-900 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Submission Metadata
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Update classification &amp; properties for <span className="text-slate-900 font-semibold">{document.title}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 pt-1 text-xs">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              className={cn(
                "h-9 rounded-xl text-xs bg-[#FFFFFF] border-[#E6E8E7] text-[#183028] focus:border-[#183028] focus:ring-1 focus:ring-[#183028] transition-colors shadow-2xs",
                titleError && "border-rose-500 ring-1 ring-rose-500"
              )}
            />
            {titleError && (
              <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{titleError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#183028]">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-full rounded-xl text-xs bg-white border border-[#E6E8E7] text-[#183028] focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs cursor-pointer">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-[#E6E8E7] shadow-xl text-[#183028]">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#183028]">
                Review Status
              </label>
              <Select value={status} onValueChange={(val) => setStatus(val as DocumentStatusType)}>
                <SelectTrigger className="h-9 w-full rounded-xl text-xs bg-white border border-[#E6E8E7] text-[#183028] focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs cursor-pointer">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-[#E6E8E7] shadow-xl text-[#183028]">
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st.value} value={st.value} className="text-xs cursor-pointer py-1.5 text-[#183028] hover:bg-[#C5E86C]/20">
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#183028]">
              Audit / Revision Remarks (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record notes on classification changes..."
              className="min-h-[70px] w-full rounded-xl text-xs bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 focus:border-[#183028] focus:ring-1 focus:ring-[#183028] shadow-2xs resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E8E7]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8.5 px-3.5 rounded-xl text-xs border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="h-8.5 px-4 rounded-xl text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] disabled:opacity-50 text-white transition-all shadow-2xs cursor-pointer"
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Changes...
                </span>
              ) : (
                "Save Metadata"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
