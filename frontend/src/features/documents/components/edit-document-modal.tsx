"use client";

/**
 * DOCU: Renders the document metadata editing modal.
 * Last Updated Date: September 7, 2026
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
import { Edit3, CheckCircle2 } from "lucide-react";
import type { DocumentItem, DocumentStatusType } from "@/lib/validation/document";
import { showSuccessToast } from "@/components/ui/toast";

export interface EditDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDoc: Partial<DocumentItem> & { id: string }) => Promise<void> | void;
}

const CATEGORIES = [
  { value: "Investment Proposal", label: "Investment Proposal" },
  { value: "Compliance Document", label: "Compliance Statement" },
  { value: "Audit Report", label: "Audit Report" },
  { value: "Tax Strategy", label: "Tax Strategy" },
  { value: "Portfolio Brief", label: "Portfolio Brief" },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: document.id,
        title: title.trim(),
        category,
        status,
      });
      showSuccessToast("Metadata Updated", `Document "${document.id}" changes saved.`);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg neu-surface p-6">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Edit3 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Submission Metadata
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Update classification & properties for <span className="font-mono text-slate-800">{document.id}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 text-xs">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Document Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="neu-inset h-8 rounded-md text-xs font-semibold text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="neu-inset h-8 rounded-md text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded border-slate-200">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs cursor-pointer py-1.5">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Review Status
              </label>
              <Select value={status} onValueChange={(val) => setStatus(val as DocumentStatusType)}>
                <SelectTrigger className="neu-inset h-8 rounded-md text-xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded border-slate-200">
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st.value} value={st.value} className="text-xs cursor-pointer py-1.5">
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Audit / Revision Remarks (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record notes on classification changes..."
              className="neu-inset min-h-[70px] rounded-md text-xs text-slate-800"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 px-3 rounded text-xs border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="h-8 px-4 rounded text-xs font-semibold bg-primary hover:bg-[#153427] text-white"
            >
              {isSaving ? "Saving..." : "Save Metadata"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
