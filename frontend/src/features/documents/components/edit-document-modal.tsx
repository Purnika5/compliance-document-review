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
      showSuccessToast("Metadata Updated", `Document "${document.id}" changes saved.`);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 bg-card border border-border text-foreground shadow-2xl shadow-black/80">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Edit Submission Metadata
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update classification &amp; properties for <span className="font-mono text-foreground font-semibold">{document.id}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5 pt-1 text-xs">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-foreground/90">
              Document Title <span className="text-rose-400">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              className={cn(
                "h-9 rounded-md text-xs bg-background border-border text-foreground transition-colors",
                titleError && "border-rose-500 ring-1 ring-rose-500"
              )}
            />
            {titleError && (
              <p className="text-[11px] text-rose-400 font-medium animate-fade-in">{titleError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/90">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 rounded-md text-xs bg-background border-border text-foreground">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-card rounded-xl border-border">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs cursor-pointer py-1.5 text-foreground/90">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground/90">
                Review Status
              </label>
              <Select value={status} onValueChange={(val) => setStatus(val as DocumentStatusType)}>
                <SelectTrigger className="h-9 rounded-md text-xs bg-background border-border text-foreground">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-card rounded-xl border-border">
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st.value} value={st.value} className="text-xs cursor-pointer py-1.5 text-foreground/90">
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-foreground/90">
              Audit / Revision Remarks (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record notes on classification changes..."
              className="min-h-[70px] rounded-md text-xs bg-background border-border text-foreground"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="h-8 px-4 rounded-md text-xs font-semibold bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white transition-all shadow-xs cursor-pointer"
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
