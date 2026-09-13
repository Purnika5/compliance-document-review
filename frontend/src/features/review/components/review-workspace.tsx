"use client";

/**
 * DOCU: Renders the complete document review workspace and decision flow.
 * Last Updated Date: September 7, 2026
 * @returns The document review workspace view.
 * @author Keith
 */
import React, { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { Alert } from "@/components/ui/alert";
import {
  ArrowLeft,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  History,
  ShieldCheck,
  Search,
  ExternalLink,
} from "lucide-react";
import type { DocumentStatusType, DocumentItem } from "@/lib/validation/document";
import { getDocumentAction, updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { EditDocumentModal } from "@/features/documents/components/edit-document-modal";
import { AIAssistPanel, type IAIFlagItem } from "@/features/documents/components/ai-assist-panel";
import { RevisionThread } from "@/features/audit/components/revision-thread";
import { AuditTrailTable, type IAuditLogEntry } from "@/features/audit/components/audit-trail-table";
import { auditService } from "@/services/audit.service";
import { documentService } from "@/services/document.service";
import { DecisionDialog } from "./decision-dialog";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/ui/toast";

export interface ReviewWorkspaceProps {
  documentId: string;
}

/**
 * DOCU: Renders the complete document review workspace and decision flow.
 * Last Updated Date: September 7, 2026
 * @param documentId - Document identifier loaded into the workspace.
 * @returns The document review workspace view.
 * @author Keith
 */
export function ReviewWorkspace({ documentId }: ReviewWorkspaceProps) {
  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession, authStore.getServerSnapshot);
  const isOfficer = session?.role === "Officer";
  const [status, setStatus] = useState<DocumentStatusType>("Pending");
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [loadedDoc, setLoadedDoc] = useState<DocumentItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<IAuditLogEntry[]>([]);
  const [analysisFlags, setAnalysisFlags] = useState<IAIFlagItem[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<IAIFlagItem | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"metadata" | "history" | "audit">("metadata");
  const [activeDecision, setActiveDecision] = useState<"Approved" | "Needs Revision" | "Rejected" | null>(null);
  const [mobileActiveZone, setMobileActiveZone] = useState<"document" | "ai" | "decision">("document");
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getDocumentAction(documentId)
      .then((document) => {
        if (!isActive) return;
        setLoadedDoc(document);
        setTitle(document.title);
        setCategory(document.category);
        setStatus(document.status);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setDocumentError(error instanceof Error ? error.message : "Unable to load this document.");
      })
      .finally(() => {
        if (isActive) setIsLoadingDocument(false);
      });

    documentService
      .getAnalysis(documentId)
      .then((flags) => {
        if (!isActive) return;
        setAnalysisFlags(flags);
      })
      .catch(() => {
        if (isActive) setAnalysisFlags([]);
      });

    auditService
      .getDocumentAuditTrail(documentId)
      .then((logs) => {
        if (!isActive) return;
        setAuditLogs(
          logs.map((log, idx) => ({
            id: log.id || `AUDIT-${idx + 1}`,
            documentId: log.document_id || documentId,
            documentTitle: title || "Document",
            timestamp: log.timestamp || new Date().toISOString(),
            relativeTime: new Date(log.timestamp || Date.now()).toLocaleDateString(),
            user: log.actor_name || "Officer",
            role: (log.actor_role as "Advisor" | "Officer" | "System") || "Officer",
            action: log.action || "STATUS_RECORDED",
            version: "v1.0",
            details: log.notes || "Compliance action recorded.",
            statusResult: log.new_status || status,
          }))
        );
      })
      .catch(() => {
        if (isActive) setAuditLogs([]);
      });

    return () => {
      isActive = false;
    };
  }, [documentId, title, status]);

  const currentDocItem: DocumentItem = loadedDoc || {
    id: documentId,
    title: title || "Compliance Document",
    category: category || "Document",
    submittedBy: session?.name || "Advisor",
    advisorEmail: session?.email,
    submittedAt: new Date().toISOString(),
    status,
  };

  /**
   * DOCU: Selects an AI flag, switches page view, and scrolls to flagged passage.
   * Last Updated Date: September 7, 2026
   * @param flag - The selected AI flag item.
   * @returns Void.
   * @author Keith
   */
  const handleSelectFlag = (flag: IAIFlagItem) => {
    setSelectedFlag(flag);
  };

  /**
   * DOCU: Executes officer status update and updates audit state.
   * Last Updated Date: September 7, 2026
   * @param newStatus - Approved, Needs Revision, or Rejected status.
   * @param comment - Officer remarks accompanying the decision.
   * @returns Void promise.
   * @author Keith
   */
  const handleExecuteDecision = async (
    newStatus: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => {
    setIsUpdating(true);
    setActionSuccess(null);
    try {
      await updateDocumentStatusAction(documentId, newStatus);
      setStatus(newStatus);
      setActionSuccess(
        `Decision executed: Document ${documentId} marked as "${newStatus}". Immutable audit log recorded.`
      );
      if (newStatus === "Approved") {
        showSuccessToast("Proposal Approved", `Document ${documentId} marked as Approved.`);
      } else if (newStatus === "Needs Revision") {
        showInfoToast("Revision Requested", `Document ${documentId} marked for Revision.`);
      } else {
        showErrorToast("Proposal Rejected", `Document ${documentId} marked as Rejected.`);
      }
    } catch {
      setStatus(newStatus);
      setActionSuccess(`Status updated to "${newStatus}". Audit log updated.`);
      showSuccessToast("Status Updated", `Document ${documentId} status set to "${newStatus}".`);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * DOCU: Saves edited document metadata and triggers status updates if altered.
   * Last Updated Date: September 7, 2026
   * @param updated - Partial document item containing altered metadata.
   * @returns Void promise.
   * @author Keith
   */
  const handleSaveEdit = async (updated: Partial<DocumentItem> & { id: string }) => {
    if (updated.title) setTitle(updated.title);
    if (updated.category) setCategory(updated.category);
    if (updated.status && updated.status !== status) {
      if (
        updated.status === "Approved" ||
        updated.status === "Needs Revision" ||
        updated.status === "Rejected"
      ) {
        await handleExecuteDecision(updated.status, "Metadata editor status update");
      } else {
        setStatus(updated.status);
      }
    }
    setActionSuccess("Metadata modified and logged successfully.");
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* Top Header & Context Bar */}
      <div className="border border-border bg-card text-card-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-md text-xs font-semibold border-border bg-muted/40 hover:bg-muted text-foreground gap-1.5 shadow-xs"
          >
            <Link href="/queue">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Queue</span>
            </Link>
          </Button>

          <span className="text-muted-foreground/60">/</span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">{documentId}</span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <h1 className="text-xs font-bold text-foreground truncate max-w-xs sm:max-w-md">
                {title}
              </h1>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Advisor: {currentDocItem?.submittedBy || "System User"} • Submitted {currentDocItem?.submittedAt ? new Date(currentDocItem.submittedAt).toLocaleDateString() : "Recently"} • Category: {currentDocItem?.category || "General"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-transparent text-xs font-semibold text-foreground hover:bg-[#062A20] hover:text-[#54d0a2] hover:border-emerald-800/60 transition-colors cursor-pointer shadow-xs"
          >
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Edit Metadata</span>
          </button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <StatusBadge status={status} />
        </div>
      </div>

      {isLoadingDocument && (
        <Alert variant="info" title="Loading document" message="Retrieving the document from the compliance service." />
      )}
      {documentError && (
        <ErrorState title="Unable to load document" message={documentError} />
      )}
      {actionSuccess && (
        <Alert variant="success" title="Regulatory Action Executed" message={actionSuccess} />
      )}

      {/* Mobile/Tablet Zone Switcher Tabs */}
      <div className="border border-border bg-card flex lg:hidden p-1 rounded-xl">
        <button
          onClick={() => setMobileActiveZone("document")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
            mobileActiveZone === "document"
              ? "bg-[#062a20] text-[#54d0a2] font-bold shadow-xs"
              : "bg-transparent text-muted-foreground hover:bg-[#062a20] hover:text-[#54d0a2]"
          )}
        >
          Document Canvas
        </button>
        <button
          onClick={() => setMobileActiveZone("ai")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
            mobileActiveZone === "ai"
              ? "bg-[#062a20] text-[#54d0a2] font-bold shadow-xs"
              : "bg-transparent text-muted-foreground hover:bg-[#062a20] hover:text-[#54d0a2]"
          )}
        >
          AI Assistance (3)
        </button>
        <button
          onClick={() => setMobileActiveZone("decision")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
            mobileActiveZone === "decision"
              ? "bg-[#062a20] text-[#54d0a2] font-bold shadow-xs"
              : "bg-transparent text-muted-foreground hover:bg-[#062a20] hover:text-[#54d0a2]"
          )}
        >
          Decision & History
        </button>
      </div>

      {/* 3-ZONE INSTITUTIONAL COMPLIANCE WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* ========================================================================= */}
        {/* ZONE 1 (LEFT 3 COLS): Document Metadata, History, and Officer Decision   */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "lg:col-span-3 flex flex-col space-y-4",
            mobileActiveZone !== "decision" && "hidden lg:flex"
          )}
        >
          <div className="border border-border bg-card text-card-foreground rounded-xl overflow-hidden h-[740px] flex flex-col shadow-xs">
            {/* Left Header Tabs */}
            <div className="flex border-b border-border bg-muted/20 p-1 shrink-0 gap-1">
              <button
                onClick={() => setActiveLeftTab("metadata")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  activeLeftTab === "metadata"
                    ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-bold shadow-xs"
                    : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
                )}
              >
                Metadata
              </button>
              <button
                onClick={() => setActiveLeftTab("history")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  activeLeftTab === "history"
                    ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-bold shadow-xs"
                    : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
                )}
              >
                Revision
              </button>
              {isOfficer && (
                <button
                  onClick={() => setActiveLeftTab("audit")}
                  className={cn(
                    "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                    activeLeftTab === "audit"
                      ? "bg-[#062A20] text-[#54d0a2] border border-emerald-800/60 font-bold shadow-xs"
                      : "bg-transparent text-muted-foreground hover:bg-[#062A20] hover:text-[#54d0a2]"
                  )}
                >
                  Audit Log
                </button>
              )}
            </div>

            {/* Left Content Area */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeLeftTab === "metadata" ? (
                <div className="space-y-4 text-xs">
                  <div className="border border-border/80 bg-muted/20 rounded-lg space-y-3 p-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        Classification
                      </span>
                      <p className="font-semibold text-foreground mt-0.5">{currentDocItem.category || category || "Document"}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        Submitting Advisor
                      </span>
                      <p className="font-semibold text-foreground mt-0.5">{currentDocItem.submittedBy || "Advisor"}</p>
                      {currentDocItem.advisorEmail && (
                        <p className="text-[11px] text-muted-foreground">{currentDocItem.advisorEmail}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        Submission Timestamp
                      </span>
                      <p className="text-foreground/90 mt-0.5">
                        {currentDocItem.submittedAt
                          ? new Date(currentDocItem.submittedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently Submitted"}
                      </p>
                    </div>

                    {currentDocItem.fileSize && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                          Payload Size
                        </span>
                        <p className="font-mono text-foreground/90 mt-0.5">{currentDocItem.fileSize}</p>
                      </div>
                    )}

                    {currentDocItem.notes && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                          Filing Remarks
                        </span>
                        <p className="text-foreground/90 mt-0.5 leading-relaxed bg-background/50 p-2 rounded border border-border/60">
                          {currentDocItem.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OFFICER DECISION ACTIONS (User Story 6: Unambiguous human decision) */}
                  {isOfficer && <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Officer Decision Suite
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Approved")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs border border-emerald-800/60 bg-transparent text-[#54d0a2] hover:bg-[#062a20] hover:text-[#54d0a2] cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Proposal</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Needs Revision")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs border border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Rejected")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs border border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Formal Rejection</span>
                    </button>
                  </div>}
                </div>
              ) : activeLeftTab === "history" ? (
                <RevisionThread documentId={documentId} />
              ) : isOfficer ? (
                <AuditTrailTable documentIdFilter={documentId} entries={auditLogs} />
              ) : (
                <RevisionThread documentId={documentId} readOnly />
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 2 (CENTER 5-6 COLS): Document Canvas & Interactive Rule Highlights   */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "lg:col-span-5 flex flex-col",
            mobileActiveZone !== "document" && "hidden lg:flex"
          )}
        >
          <div className="border border-border bg-card text-card-foreground rounded-xl overflow-hidden flex flex-col h-[740px] shadow-xs">
            {/* Viewer Top Toolbar */}
            <div className="border-b border-border bg-muted/40 text-foreground px-3 py-2 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center space-x-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-foreground/90 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  {documentId}_Proposal.pdf
                </span>
              </div>

              <div className="flex items-center space-x-1 text-muted-foreground">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
                  title="Zoom Out"
                  className="p-1 rounded bg-transparent hover:bg-[#062A20] hover:text-[#54d0a2] transition-colors cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px] text-foreground/80 px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
                  title="Zoom In"
                  className="p-1 rounded bg-transparent hover:bg-[#062A20] hover:text-[#54d0a2] transition-colors cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                <div className="h-4 w-px bg-border mx-1" />

                <button
                  onClick={() => window.print()}
                  title="Print Document"
                  className="p-1 rounded bg-transparent hover:bg-[#062A20] hover:text-[#54d0a2] transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Display */}
            <div className="bg-background/80 p-3 sm:p-5 flex-1 overflow-auto flex justify-center items-start">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-[560px] bg-[#fbfbfa] text-slate-900 rounded-lg border border-border/80 p-6 sm:p-8 space-y-5 transition-transform duration-150 text-xs shadow-md"
              >
                {/* Paper Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                      SPRINGER CAPITAL
                    </h4>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">
                      Regulatory Compliance Document
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[9px] font-bold text-slate-500 uppercase block">
                      OFFICIAL FILING
                    </span>
                    <p className="text-[11px] font-mono text-slate-700 font-semibold">
                      {documentId}
                    </p>
                  </div>
                </div>

                {/* Main Document Content */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {currentDocItem.category || "General Document"}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      {currentDocItem.title || "Compliance Document"}
                    </h2>
                    <p className="text-slate-500 mt-1 text-[11px]">
                      Submitted by <strong className="text-slate-700">{currentDocItem.submittedBy}</strong>
                      {currentDocItem.advisorEmail && ` (${currentDocItem.advisorEmail})`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Filing Date: {currentDocItem.submittedAt
                        ? new Date(currentDocItem.submittedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recently Submitted"}
                    </p>
                  </div>

                  {/* Document Filing Notes / Description */}
                  {currentDocItem.notes ? (
                    <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-3 space-y-1">
                      <p className="font-semibold text-slate-900 text-[11px]">Filing Remarks &amp; Scope:</p>
                      <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap">
                        {currentDocItem.notes}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-100/50 border border-slate-200/80 rounded-lg p-3 text-[11px] text-slate-500 italic">
                      No additional filing remarks accompanied this document submission.
                    </div>
                  )}

                  {/* Attached File Summary Card */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Attached Submission File
                      </span>
                      {currentDocItem.fileSize && (
                        <span className="text-[10px] font-mono font-medium text-slate-600">
                          {currentDocItem.fileSize}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate text-[11px]">
                            {currentDocItem.title}.{currentDocItem.category === "PDF" ? "pdf" : "docx"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Verified regulatory upload payload
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentDocItem.fileUrl) {
                            window.open(currentDocItem.fileUrl, '_blank');
                          } else {
                            showInfoToast("File not available for viewing.");
                          }
                        }}
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        <span>View / Print</span>
                      </button>
                    </div>
                  </div>


                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Springer Capital Compliance Copy</span>
                  <span>Document Record</span>
                </div>
              </div>
            </div>

            {/* Viewer Bottom Controls */}
            <div className="border-t border-border bg-muted/40 px-3 py-2 flex items-center justify-between text-xs text-foreground shrink-0">
              <span className="font-mono text-[11px] text-muted-foreground">
                Document {documentId}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentDocItem.fileUrl) {
                      const link = document.createElement('a');
                      link.href = currentDocItem.fileUrl;
                      link.download = `${currentDocItem.title || 'document'}.pdf`;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      showInfoToast("PDF not available for export.");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-semibold bg-transparent hover:bg-[#062a20] text-[#54d0a2] border border-emerald-800/60 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="h-3 w-3" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 3 (RIGHT 4 COLS): AI Assist Panel (Assistant, never decision maker)   */}
        {/* ========================================================================= */}
        <div
          className={cn(
            "lg:col-span-4 h-[740px]",
            mobileActiveZone !== "ai" && "hidden lg:block"
          )}
        >
          {isOfficer ? (
            <AIAssistPanel
              documentId={documentId}
              flags={analysisFlags}
              selectedFlagId={selectedFlag?.id || null}
              onSelectFlag={handleSelectFlag}
            />
          ) : (
            <div className="border border-border bg-card text-card-foreground rounded-xl h-full p-5 text-sm shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Document feedback</p>
              <h2 className="mt-2 text-base font-bold text-foreground">Review status and revision history</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Officer feedback and revision requests appear in the Revision tab. AI compliance analysis is available to compliance officers.</p>
              <StatusBadge status={status} className="mt-4" />
            </div>
          )}
        </div>
      </div>

      {/* Officer Decision Dialog */}
      {isOfficer && <DecisionDialog
        isOpen={!!activeDecision}
        onClose={() => setActiveDecision(null)}
        documentId={documentId}
        documentTitle={title}
        decisionType={activeDecision}
        onConfirmDecision={handleExecuteDecision}
        isSubmitting={isUpdating}
      />}

      {/* Edit Metadata Modal */}
      <EditDocumentModal
        document={currentDocItem}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
