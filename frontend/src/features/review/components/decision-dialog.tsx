"use client";

/**
 * DOCU: Renders the review decision dialog for document status updates.
 * Last Updated Date: September 7, 2026
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
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import type { DocumentStatusType } from "@/lib/validation/document";
import { cn } from "@/lib/utils";

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
 * Last Updated Date: September 7, 2026
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

  /**
   * DOCU: Validates compliance remarks and confirms officer decision execution.
   * Last Updated Date: September 7, 2026
   * @returns Void promise.
   * @author Keith
   */
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

  /**
   * DOCU: Computes UI dialog titles, icons, and action text based on decision type.
   * Last Updated Date: September 7, 2026
   * @returns Dialog UI configuration object.
   * @author Keith
   */
  const getDialogConfig = () => {
    if (isApproval) {
      return {
        title: "Confirm Proposal Approval",
        description:
          "Executing this decision will mark the document as Approved in the institutional record and notify the submitting advisor.",
        icon: CheckCircle2,
        iconBg: "bg-[#C5E86C]/20 text-[#183028] border border-[#C5E86C]",
        confirmBtnText: "Execute Approval",
        confirmBtnClass: "bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white shadow-2xs cursor-pointer",
        placeholder: "Optional officer approval remark or regulatory notes...",
      };
    }
    if (isRevision) {
      return {
        title: "Request Document Revision",
        description:
          "Specify the exact regulatory deficiency, rule code, or required amendments for the advisor.",
        icon: AlertCircle,
        iconBg: "bg-amber-100 text-amber-900 border border-amber-300",
        confirmBtnText: "Transmit Revision Request",
        confirmBtnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer",
        placeholder: "Detail the specific passage, missing schedule, or rule citation (required)...",
      };
    }
    return {
      title: "Confirm Proposal Rejection",
      description:
        "Formal rejection terminates evaluation of this submission version. A regulatory reason must be recorded for audit history.",
      icon: XCircle,
      iconBg: "bg-rose-100 text-rose-900 border border-rose-300",
      confirmBtnText: "Confirm Regulatory Rejection",
      confirmBtnClass: "bg-rose-700 hover:bg-rose-800 text-white shadow-2xs cursor-pointer",
      placeholder: "State the regulatory violation or non-compliance reason (required)...",
    };
  };

  const config = getDialogConfig();
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border border-[#E6E8E7] bg-white text-[#183028] p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${config.iconBg}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#183028]">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#183028]/60 font-medium">
                Document <span className="font-mono text-[#183028] font-bold">{documentId}</span> • {documentTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-[#183028]/70 leading-normal">{config.description}</p>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#183028]/60">
              Officer Audit Statement {(isRevision || isRejection) && <span className="text-rose-500">*</span>}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={config.placeholder}
              className={cn(
                "bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 text-xs min-h-[90px] rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] transition-colors shadow-2xs",
                validationError && "border-rose-500 ring-1 ring-rose-500"
              )}
            />
            {validationError && (
              <p className="text-[11px] text-rose-600 font-medium animate-fade-in">{validationError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E8E7]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8.5 px-3.5 text-xs rounded-xl border border-[#E6E8E7] bg-white hover:bg-[#C5E86C]/20 text-[#183028] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`h-8.5 px-4 text-xs font-semibold rounded-xl ${config.confirmBtnClass}`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recording Decision...
              </span>
            ) : (
              config.confirmBtnText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
