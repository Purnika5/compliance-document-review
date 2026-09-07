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
import { CheckCircle2, AlertCircle, XCircle, ShieldCheck } from "lucide-react";
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
        iconBg: "bg-primary/15 text-primary border-primary/30",
        confirmBtnText: "Execute Approval",
        confirmBtnClass: "bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white shadow-xs cursor-pointer",
        placeholder: "Optional officer approval remark or regulatory notes...",
      };
    }
    if (isRevision) {
      return {
        title: "Request Document Revision",
        description:
          "Specify the exact regulatory deficiency, rule code, or required amendments for the advisor.",
        icon: AlertCircle,
        iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        confirmBtnText: "Transmit Revision Request",
        confirmBtnClass: "bg-amber-600 hover:bg-amber-500 text-white shadow-xs",
        placeholder: "Detail the specific passage, missing schedule, or rule citation (required)...",
      };
    }
    return {
      title: "Confirm Proposal Rejection",
      description:
        "Formal rejection terminates evaluation of this submission version. A regulatory reason must be recorded for audit history.",
      icon: XCircle,
      iconBg: "bg-destructive/15 text-destructive border-destructive/30",
      confirmBtnText: "Confirm Regulatory Rejection",
      confirmBtnClass: "bg-destructive hover:bg-destructive/90 text-white shadow-xs",
      placeholder: "State the regulatory violation or non-compliance reason (required)...",
    };
  };

  const config = getDialogConfig();
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border border-border bg-card text-card-foreground p-6 shadow-2xl">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded border flex items-center justify-center shrink-0 ${config.iconBg}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {config.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-medium">
                Document <span className="font-mono text-foreground/80">{documentId}</span> • {documentTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground leading-normal">{config.description}</p>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Officer Audit Statement {(isRevision || isRejection) && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={config.placeholder}
              className={cn(
                "bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/60 text-xs min-h-[90px] rounded-md focus-visible:ring-1 focus-visible:ring-primary transition-colors",
                validationError && "border-rose-500/80 focus-visible:ring-rose-500"
              )}
            />
            {validationError && (
              <p className="text-[11px] text-rose-400 font-medium animate-fade-in">{validationError}</p>
            )}
          </div>

          <div className="bg-muted/20 border border-border/80 p-2.5 rounded-md flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              Decision execution is immutably logged with officer credential and timestamp.
            </span>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 px-3 text-xs rounded border-border bg-transparent hover:bg-[#062A20] hover:text-[#54d0a2] hover:border-emerald-800/60 text-foreground"
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
