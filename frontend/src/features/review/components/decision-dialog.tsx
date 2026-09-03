"use client";

/**
 * DOCU: Renders the review decision dialog for document status updates.
 * Last Updated Date: September 3, 2026
 * @returns The decision dialog view.
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
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck } from "lucide-react";
import type { DocumentStatusType } from "@/lib/validation/document";

export interface DecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  decisionType: "Approved" | "Needs Revision" | "Rejected" | null;
  onConfirmDecision: (
    decision: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * DOCU: Renders a confirmation dialog for document review decisions.
 * Last Updated Date: September 3, 2026
 * @param props - Decision state, selected status, and callbacks.
 * @returns The decision dialog view.
 * @author Keith
 */
export function DecisionDialog({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  decisionType,
  onConfirmDecision,
  isSubmitting = false,
}: DecisionDialogProps) {
  const [comment, setComment] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!decisionType) return null;

  const isApproval = decisionType === "Approved";
  const isRevision = decisionType === "Needs Revision";
  const isRejection = decisionType === "Rejected";

  const handleConfirm = async () => {
    // Revisions and rejections require mandatory officer remarks for audit compliance
    if ((isRevision || isRejection) && !comment.trim()) {
      setValidationError(
        `Mandatory compliance remark required when issuing a ${
          isRevision ? "revision request" : "formal rejection"
        }.`
      );
      return;
    }

    setValidationError(null);
    await onConfirmDecision(decisionType, comment.trim());
    setComment("");
    onClose();
  };

  const getDialogConfig = () => {
    if (isApproval) {
      return {
        title: "Confirm Proposal Approval",
        description:
          "Executing this decision will mark the document as Approved in the institutional record and notify the submitting advisor.",
        icon: CheckCircle2,
        iconBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        confirmBtnText: "Execute Approval",
        confirmBtnClass: "bg-primary hover:bg-[#153427] text-white",
        placeholder: "Optional officer approval remark or regulatory notes...",
      };
    }
    if (isRevision) {
      return {
        title: "Request Document Revision",
        description:
          "Specify the exact regulatory deficiency, rule code, or required amendments for the advisor.",
        icon: AlertCircle,
        iconBg: "bg-amber-100 text-amber-800 border-amber-200",
        confirmBtnText: "Transmit Revision Request",
        confirmBtnClass: "bg-slate-900 hover:bg-slate-800 text-white",
        placeholder: "Detail the specific passage, missing schedule, or rule citation (required)...",
      };
    }
    return {
      title: "Confirm Proposal Rejection",
      description:
        "Formal rejection terminates evaluation of this submission version. A regulatory reason must be recorded for audit history.",
      icon: XCircle,
      iconBg: "bg-red-100 text-red-800 border-red-200",
      confirmBtnText: "Confirm Regulatory Rejection",
      confirmBtnClass: "bg-destructive hover:bg-red-700 text-white",
      placeholder: "State the regulatory violation or non-compliance reason (required)...",
    };
  };

  const config = getDialogConfig();
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg neu-surface p-6">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded border flex items-center justify-center shrink-0 ${config.iconBg}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Document <span className="font-mono text-slate-700">{documentId}</span> • {documentTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-slate-600 leading-normal">{config.description}</p>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Officer Audit Statement {(isRevision || isRejection) && <span className="text-red-600">*</span>}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={config.placeholder}
              className="neu-inset text-xs min-h-[90px] rounded-md focus-visible:ring-1 focus-visible:ring-ring"
            />
            {validationError && (
              <p className="text-[11px] font-semibold text-red-600">{validationError}</p>
            )}
          </div>

          <div className="neu-inset p-2.5 rounded-md flex items-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Decision execution is immutably logged with officer credential and timestamp.
            </span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 px-3 text-xs rounded border-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`h-8 px-4 text-xs font-semibold rounded ${config.confirmBtnClass}`}
          >
            {isSubmitting ? "Recording Decision..." : config.confirmBtnText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
