"use client";

/**
 * DOCU: Renders the complete document review workspace and decision flow.
 * Last Updated Date: September 7, 2026
 * @returns The document review workspace view.
 * @author Keith
 */
import React, { useState, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
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
  Eye,
  EyeOff,
} from "lucide-react";
import { buildPiiMap, unmaskText } from "@/utils/pii-unmasker";
import type { DocumentStatusType, DocumentItem } from "@/lib/validation/document";
import { getDocumentAction, updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { EditDocumentModal } from "@/features/documents/components/edit-document-modal";
import { AIAssistPanel, type IAIFlagItem } from "@/features/documents/components/ai-assist-panel";
import { RevisionThread } from "@/features/audit/components/revision-thread";
import { AuditTrailTable, type IAuditLogEntry } from "@/features/audit/components/audit-trail-table";
import { auditService } from "@/services/audit.service";
import { documentService } from "@/services/document.service";
import { DecisionDialog } from "./decision-dialog";
import { DocxViewer } from "./docx-viewer";
import { ReviewWorkspaceSkeleton } from "./review-workspace-skeleton";
import { VersionLineageSelector, type LineageEntry } from "./version-lineage-selector";
import { FileTypeIcon } from "@/components/shared/file-type-icon";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/ui/toast";

export interface ReviewWorkspaceProps {
  documentId: string;
}

function renderHighlightedText(text: string, passage?: string) {
  if (!passage || !passage.trim() || !text) {
    return text;
  }
  const cleanPassage = passage.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  const words = cleanPassage.split(/\s+/).filter(Boolean);
  if (words.length === 0) return text;

  // 1. Full exact match with whitespace flexibility
  const fullRegex = new RegExp(
    words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
    "i"
  );
  let match = text.match(fullRegex);

  // 2. Sliding window of longest matching word sequence (down to 3 words)
  if (!match || match.index === undefined) {
    for (let len = words.length - 1; len >= 3; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const sub = words.slice(start, start + len);
        const subRegex = new RegExp(
          sub.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
          "i"
        );
        match = text.match(subRegex);
        if (match && match.index !== undefined) break;
      }
      if (match && match.index !== undefined) break;
    }
  }

  if (!match || match.index === undefined) {
    return text;
  }

  const idx = match.index;
  const matchLength = match[0].length;
  const before = text.slice(0, idx);
  const matchedText = text.slice(idx, idx + matchLength);
  const after = text.slice(idx + matchLength);

  return (
    <>
      {before}
      <mark
        id="flagged-passage-highlight"
        className="bg-amber-400/35 text-amber-900 border-2 border-amber-500 rounded px-1.5 py-0.5 font-bold ring-2 ring-amber-500/60 shadow-lg inline"
      >
        {matchedText}
      </mark>
      {after}
    </>
  );
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
  const [viewMode, setViewMode] = useState<"iframe" | "paper" | "text">("iframe");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(true);
  const [isUnmasked, setIsUnmasked] = useState<boolean>(false);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);
  const [activeDocId, setActiveDocId] = useState<string>(documentId);
  const [lineageVersions, setLineageVersions] = useState<(DocumentItem & { version: number })[]>([]);
  const [lineageEntries, setLineageEntries] = useState<LineageEntry[]>([]);
  const [isLoadingLineage, setIsLoadingLineage] = useState<boolean>(true);

  useEffect(() => {
    setActiveDocId(documentId);
  }, [documentId]);

  const handleSelectVersion = (version: DocumentItem & { version: number }) => {
    setActiveDocId(version.id);
    setSelectedFlag(null);
  };

  const handleRefreshAnalysis = () => {
    setIsLoadingAnalysis(true);
    documentService
      .getAnalysis(activeDocId)
      .then((flags) => {
        setAnalysisFlags(flags);
      })
      .catch(() => {
        setAnalysisFlags([]);
      })
      .finally(() => {
        setIsLoadingAnalysis(false);
      });
  };

  useEffect(() => {
    let isActive = true;

    // 1. Fetch document version history & lineage thread entries (GET /documents/:id/versions)
    setIsLoadingLineage(true);
    documentService
      .getDocumentVersions(activeDocId)
      .then((res) => {
        if (!isActive) return;
        setLineageVersions(res.versions);
        setLineageEntries(res.threadEntries);
      })
      .catch(() => {
        if (!isActive) {
          setLineageVersions([]);
          setLineageEntries([]);
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingLineage(false);
      });

    // 2. Fetch document record for current version
    setIsLoadingDocument(true);
    getDocumentAction(activeDocId)
      .then((document) => {
        if (!isActive) return;
        setLoadedDoc(document);
        setTitle(document.title);
        setCategory(document.category);
        setStatus(document.status);
        setDocumentError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setDocumentError(error instanceof Error ? error.message : "Unable to load this document.");
      })
      .finally(() => {
        if (isActive) setIsLoadingDocument(false);
      });

    // 3. Fetch automated AI analysis flags for current version
    setIsLoadingAnalysis(true);
    documentService
      .getAnalysis(activeDocId)
      .then((flags) => {
        if (!isActive) return;
        setAnalysisFlags(flags);
      })
      .catch(() => {
        if (!isActive) setAnalysisFlags([]);
      })
      .finally(() => {
        if (isActive) setIsLoadingAnalysis(false);
      });

    // 4. Fetch audit trail entries for current document
    auditService
      .getDocumentAuditTrail(activeDocId)
      .then((logs) => {
        if (!isActive) return;
        setAuditLogs(
          logs.map((log, idx) => ({
            id: log.id || `AUDIT-${idx + 1}`,
            documentId: log.document_id || activeDocId,
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
        if (!isActive) setAuditLogs([]);
      });

    return () => {
      isActive = false;
    };
  }, [activeDocId, revisionRefreshKey]);

  const currentDocItem: DocumentItem = loadedDoc || {
    id: activeDocId,
    title: title || "Compliance Document",
    category: category || "Document",
    submittedBy: session?.name || "Advisor",
    advisorEmail: session?.email,
    submittedAt: new Date().toISOString(),
    status,
  };

  const piiMap = useMemo(() => {
    if (!isOfficer || !currentDocItem) return {};
    return buildPiiMap(currentDocItem.originalText, currentDocItem.maskedText);
  }, [isOfficer, currentDocItem.originalText, currentDocItem.maskedText]);

  const isDocx = Boolean(
    currentDocItem.category === "DOCX" ||
    currentDocItem.mimeType?.includes("word") ||
    currentDocItem.fileName?.toLowerCase().endsWith(".docx") ||
    currentDocItem.fileName?.toLowerCase().endsWith(".doc") ||
    currentDocItem.fileUrl?.toLowerCase().endsWith(".docx") ||
    currentDocItem.fileUrl?.toLowerCase().endsWith(".doc")
  );

  const isPdf = Boolean(
    currentDocItem.category === "PDF" ||
    currentDocItem.mimeType?.includes("pdf") ||
    currentDocItem.fileName?.toLowerCase().endsWith(".pdf") ||
    currentDocItem.fileUrl?.toLowerCase().endsWith(".pdf")
  );

  /**
   * DOCU: Selects an AI flag, switches page view, and scrolls to flagged passage.
   * Last Updated Date: September 7, 2026
   * @param flag - The selected AI flag item.
   * @returns Void.
   * @author Keith
   */
  const handleSelectFlag = (flag: IAIFlagItem) => {
    setSelectedFlag(flag);
    setViewMode("text");
  };

  useEffect(() => {
    if (selectedFlag && viewMode === "text") {
      const timer = setTimeout(() => {
        const el = document.getElementById("flagged-passage-highlight");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedFlag, viewMode, isUnmasked]);

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
    const docDisplayId = `DOC-${activeDocId.slice(-4).toUpperCase()}`;
    try {
      await updateDocumentStatusAction(activeDocId, newStatus, comment);
      setStatus(newStatus);
      setRevisionRefreshKey((prev) => prev + 1);

      // Refresh audit logs immediately
      try {
        const freshLogs = await auditService.getDocumentAuditTrail(activeDocId);
        setAuditLogs(
          freshLogs.map((log, idx) => ({
            id: log.id || `AUDIT-${idx + 1}`,
            documentId: log.document_id || activeDocId,
            documentTitle: title || "Document",
            timestamp: log.timestamp || new Date().toISOString(),
            relativeTime: new Date(log.timestamp || Date.now()).toLocaleDateString(),
            user: log.actor_name || "Officer",
            role: (log.actor_role as "Advisor" | "Officer" | "System") || "Officer",
            action: log.action || "STATUS_RECORDED",
            version: "v1.0",
            details: log.notes || "Compliance action recorded.",
            statusResult: log.new_status || newStatus,
          }))
        );
      } catch {
        // preserve existing logs
      }

      setActionSuccess(
        `Decision executed: Document ${docDisplayId} marked as "${newStatus}". Immutable audit log recorded.`
      );
      if (newStatus === "Approved") {
        showSuccessToast("Proposal Approved", `Document ${docDisplayId} marked as Approved.`);
      } else if (newStatus === "Needs Revision") {
        showInfoToast("Revision Requested", `Document ${docDisplayId} marked for Revision.`);
      } else {
        showErrorToast("Proposal Rejected", `Document ${docDisplayId} marked as Rejected.`);
      }
    } catch {
      setStatus(newStatus);
      setActionSuccess(`Status updated to "${newStatus}". Audit log updated.`);
      showSuccessToast("Status Updated", `Document ${docDisplayId} status set to "${newStatus}".`);
    } finally {
      setIsUpdating(false);
      setTimeout(() => {
        setActionSuccess(null);
      }, 5000);
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

  /**
   * DOCU: Downloads and exports the current document.
   */
  const handleDownloadFile = () => {
    if (currentDocItem.fileUrl) {
      const ext = isDocx ? ".docx" : isPdf ? ".pdf" : "";
      const baseName = currentDocItem.fileName || currentDocItem.title || "document";
      const filename = baseName.includes(".") ? baseName : `${baseName}${ext}`;
      const link = document.createElement("a");
      link.href = currentDocItem.fileUrl;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showInfoToast("File not available for download.");
    }
  };

  if (isLoadingDocument) {
    return <ReviewWorkspaceSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* Top Header & Context Bar */}
      <div className="border border-[#E6E8E7] bg-white text-[#183028] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-xl text-xs font-semibold border border-[#E6E8E7] bg-white hover:bg-[#C5E86C] hover:border-[#C5E86C] text-black hover:text-black gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <Link href={isOfficer ? "/queue" : "/dashboard"}>
              <ArrowLeft className="h-3.5 w-3.5 text-black" />
              <span className="text-black font-semibold">Back to Dashboard</span>
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h1 className="text-xs font-bold text-[#183028] truncate max-w-xs sm:max-w-md">
                {title}
              </h1>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#183028] text-[#C5E86C]">
                v{currentDocItem?.version || 1}
              </span>
              <StatusBadge status={status} />
            </div>
            <p className="text-[11px] text-[#183028]/60 hidden sm:block">
              Advisor: {currentDocItem?.submittedBy || "System User"} • Submitted {currentDocItem?.submittedAt ? new Date(currentDocItem.submittedAt).toLocaleDateString() : "Recently"} • Category: {currentDocItem?.category || "General"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadFile}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white transition-all cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDocx ? "Download Word" : isPdf ? "Export PDF" : "Download File"}</span>
          </button>
        </div>
      </div>

      {/* Version Lineage Selector (v1, v2) with Officer Revision Remarks */}
      <VersionLineageSelector
        versions={lineageVersions}
        activeVersionId={activeDocId}
        threadEntries={lineageEntries}
        onSelectVersion={handleSelectVersion}
        isLoading={isLoadingLineage}
      />

      {documentError && (
        <ErrorState title="Unable to load document" message={documentError} />
      )}
      {actionSuccess && (
        <Alert
          variant="success"
          title="Regulatory Action Executed"
          message={actionSuccess}
          onClose={() => setActionSuccess(null)}
        />
      )}

      {/* Mobile/Tablet Zone Switcher Tabs */}
      <div className="border border-[#E6E8E7] bg-white flex lg:hidden p-1.5 rounded-xl shadow-2xs gap-1.5">
        <button
          type="button"
          onClick={() => setMobileActiveZone("document")}
          className={cn(
            "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5",
            mobileActiveZone === "document"
              ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
              : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Canvas</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveZone("ai")}
          className={cn(
            "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5",
            mobileActiveZone === "ai"
              ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
              : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
          )}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>AI Guidance ({analysisFlags.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileActiveZone("decision")}
          className={cn(
            "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5",
            mobileActiveZone === "decision"
              ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
              : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{isOfficer ? "Decision" : "Metadata"}</span>
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
          <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-2xl overflow-hidden h-[740px] flex flex-col shadow-2xs">
            {/* Left Header Tabs */}
            <div className="flex border-b border-[#E6E8E7] bg-white p-1.5 shrink-0 gap-1.5">
              <button
                onClick={() => setActiveLeftTab("metadata")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer",
                  activeLeftTab === "metadata"
                    ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                    : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
                )}
              >
                Metadata
              </button>
              <button
                onClick={() => setActiveLeftTab("history")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer",
                  activeLeftTab === "history"
                    ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                    : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
                )}
              >
                Revision
              </button>
              {isOfficer && (
                <button
                  onClick={() => setActiveLeftTab("audit")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer",
                    activeLeftTab === "audit"
                      ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                      : "bg-transparent text-[#183028]/70 hover:bg-[#C5E86C]/20 hover:text-[#183028]"
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
                  <div className="border border-[#E6E8E7] bg-white rounded-xl space-y-3 p-3.5 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                        Classification
                      </span>
                      <p className="font-semibold text-[#183028] mt-0.5">{currentDocItem.category || category || "Document"}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                        Submitting Advisor
                      </span>
                      <p className="font-semibold text-[#183028] mt-0.5">{currentDocItem.submittedBy || "Advisor"}</p>
                      {currentDocItem.advisorEmail && (
                        <p className="text-[11px] text-[#183028]/60">{currentDocItem.advisorEmail}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                        Submission Timestamp
                      </span>
                      <p className="text-[#183028] mt-0.5 font-medium">
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                          Payload Size
                        </span>
                        <p className="font-mono text-[#183028] mt-0.5 font-semibold">{currentDocItem.fileSize}</p>
                      </div>
                    )}

                    {currentDocItem.notes && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">
                          Filing Remarks
                        </span>
                        <p className="text-[#183028] mt-0.5 leading-relaxed bg-[#E6E8E7]/20 p-2.5 rounded-lg border border-[#E6E8E7]">
                          {currentDocItem.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OFFICER DECISION ACTIONS (User Story 6: Unambiguous human decision) */}
                  {isOfficer && <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#183028]">
                        Officer Decision Suite
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Approved")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-xl font-bold text-xs bg-[#C5E86C] text-[#183028] hover:bg-[#b4db53] border border-[#a8ce4a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#183028]" />
                      <span>Approve Proposal</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Needs Revision")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-xl font-semibold text-xs border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-700" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Rejected")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-xl font-semibold text-xs border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                    >
                      <XCircle className="h-4 w-4 text-rose-700" />
                      <span>Formal Rejection</span>
                    </button>
                  </div>}
                </div>
              ) : activeLeftTab === "history" ? (
                <RevisionThread documentId={activeDocId} refreshKey={revisionRefreshKey} />
              ) : isOfficer ? (
                <AuditTrailTable documentIdFilter={activeDocId} entries={auditLogs} />
              ) : (
                <RevisionThread documentId={activeDocId} readOnly refreshKey={revisionRefreshKey} />
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
          <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-2xl overflow-hidden flex flex-col h-[740px] shadow-2xs">
            {/* Viewer Top Toolbar with View Mode Switcher */}
            <div className="border-b border-[#E6E8E7] bg-white text-[#183028] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center space-x-1.5">
                <FileText className="h-3.5 w-3.5 text-[#183028]" />
                <span className="font-mono text-[#183028] font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                  {currentDocItem.fileName || `${activeDocId}_Document`}
                </span>
              </div>

              {/* View Mode Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#E6E8E7]/40 p-1 rounded-xl border border-[#E6E8E7]">
                <button
                  type="button"
                  onClick={() => setViewMode("iframe")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer",
                    viewMode === "iframe"
                      ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                      : "text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/20"
                  )}
                >
                  {isDocx ? "Word Document" : isPdf ? "PDF Document" : "File Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("text")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer",
                    viewMode === "text"
                      ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                      : "text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/20"
                  )}
                >
                  Extracted Text
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("paper")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer",
                    viewMode === "paper"
                      ? "bg-[#C5E86C] text-[#183028] font-bold shadow-2xs"
                      : "text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/20"
                  )}
                >
                  Overview
                </button>
              </div>

              <div className="flex items-center space-x-1 text-[#183028]">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg bg-white border border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer shadow-2xs"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px] text-[#183028] font-bold px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg bg-white border border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer shadow-2xs"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                <div className="h-4 w-px bg-[#E6E8E7] mx-1" />

                <button
                  onClick={() => window.print()}
                  title="Print Document"
                  className="p-1.5 rounded-lg bg-white border border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>

                {isOfficer && (
                  <>
                    <div className="h-4 w-px bg-[#E6E8E7] mx-1" />
                    <button
                      type="button"
                      onClick={() => setIsUnmasked((prev) => !prev)}
                      title={isUnmasked ? "Switch to Masked PII view" : "Switch to Raw Unmasked PII view (Officer Only)"}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs",
                        isUnmasked
                          ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                          : "bg-white text-[#183028] border-[#E6E8E7] hover:bg-[#E6E8E7]/40"
                      )}
                    >
                      {isUnmasked ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-amber-800" />
                          <span className="hidden sm:inline">Raw PII Active</span>
                          <span className="sm:hidden">Raw</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 text-[#183028]/70" />
                          <span className="hidden sm:inline">Show Raw PII</span>
                          <span className="sm:hidden">Masked</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Active Flag Inspection Banner */}
            {selectedFlag && (
              <div className="border-b border-amber-300 bg-amber-50 text-amber-950 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs animate-fade-in">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 shrink-0">
                    {selectedFlag.severity || "MEDIUM"} • Rule {selectedFlag.ruleCode}
                  </span>
                  {isOfficer && isUnmasked && (
                    <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-200/80 border border-amber-400 text-amber-950 shrink-0">
                      Raw PII
                    </span>
                  )}
                  <span className="truncate text-[11px] text-amber-900 font-serif italic max-w-[320px] sm:max-w-[480px]">
                    &quot;{isOfficer && isUnmasked ? unmaskText(selectedFlag.passage, piiMap) : selectedFlag.passage}&quot;
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {viewMode !== "text" && (
                    <button
                      type="button"
                      onClick={() => setViewMode("text")}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400/80 transition-colors cursor-pointer"
                    >
                      Focus Text Highlight
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedFlag(null)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-white hover:bg-[#E6E8E7]/50 text-[#183028] border border-[#E6E8E7] transition-colors cursor-pointer shadow-2xs"
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            )}

            {/* Document Canvas Display */}
            <div className="bg-[#FAFBFB] p-2 sm:p-4 flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start">
              {viewMode === "iframe" ? (
                <div className="w-full flex-1 flex flex-col items-center justify-start min-h-0">
                  {isDocx && (currentDocItem.fileUrl || currentDocItem.fileName) ? (
                    <DocxViewer
                      fileUrl={
                        currentDocItem.fileUrl ||
                        `/api/raw-file/documents/${currentDocItem.fileName}`
                      }
                      zoomLevel={zoomLevel}
                      title={currentDocItem.title}
                      onFallbackToText={() => setViewMode("text")}
                    />
                  ) : isPdf && (currentDocItem.fileUrl || currentDocItem.fileName) ? (
                    <iframe
                      src={
                        currentDocItem.fileUrl ||
                        `/api/raw-file/documents/${currentDocItem.fileName}`
                      }
                      className="w-full h-[650px] border border-[#E6E8E7] rounded-xl bg-white shadow-2xs"
                      title={currentDocItem.title || "Uploaded Document"}
                    />
                  ) : currentDocItem.fileUrl || currentDocItem.fileName ? (
                    <iframe
                      src={
                        currentDocItem.fileUrl ||
                        `/api/raw-file/documents/${currentDocItem.fileName}`
                      }
                      className="w-full h-[650px] border border-[#E6E8E7] rounded-xl bg-white shadow-2xs"
                      title={currentDocItem.title || "Uploaded Document"}
                    />
                  ) : (
                    <div className="text-center p-8 bg-white border border-[#E6E8E7] rounded-2xl space-y-3 max-w-md shadow-2xs">
                      <FileText className="h-10 w-10 text-[#183028] mx-auto" />
                      <p className="font-semibold text-sm text-[#183028]">File Attachment Render</p>
                      <p className="text-xs text-[#183028]/60">
                        Document stream identifier: <code className="font-mono text-[#183028] bg-[#E6E8E7]/40 px-1.5 py-0.5 rounded">{currentDocItem.id}</code>
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewMode("text")}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white transition-all cursor-pointer shadow-2xs"
                        >
                          View Extracted Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("paper")}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-[#183028] border border-[#E6E8E7] hover:bg-[#C5E86C]/20 transition-all cursor-pointer shadow-2xs"
                        >
                          View Overview
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : viewMode === "text" ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                  }}
                  className="w-full max-w-[640px] bg-white text-[#183028] rounded-xl border border-[#E6E8E7] p-6 space-y-4 transition-transform duration-150 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-[#E6E8E7] pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-[#183028]" />
                      <span className="font-semibold text-xs text-[#183028]">Extracted Document Text</span>
                      {isOfficer && isUnmasked && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">

                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-[#E6E8E7] font-mono text-[11px] leading-relaxed text-[#183028] whitespace-pre-wrap max-h-[520px] overflow-y-auto">
                    {currentDocItem.maskedText || currentDocItem.originalText ? (
                      renderHighlightedText(
                        isOfficer && isUnmasked
                          ? unmaskText(currentDocItem.maskedText || currentDocItem.originalText || "", piiMap)
                          : currentDocItem.maskedText || currentDocItem.originalText || "",
                        isOfficer && isUnmasked && selectedFlag?.passage
                          ? unmaskText(selectedFlag.passage, piiMap)
                          : selectedFlag?.passage
                      )
                    ) : (
                      <div className="text-[#183028]/70 italic space-y-2 font-sans">
                        <p className="font-semibold text-[#183028] not-italic">Extracted Content Preview:</p>
                        <p>
                          Title: {currentDocItem.title}
                        </p>
                        <p>
                          Category: {currentDocItem.category}
                        </p>
                        <p>
                          Submitting Advisor: {currentDocItem.submittedBy}
                        </p>
                        {currentDocItem.notes && (
                          <p>
                            Remarks: {currentDocItem.notes}
                          </p>
                        )}
                        <p className="pt-2 text-[10px] text-[#183028] font-semibold">
                          Automated OCR/Text Extraction layer loaded for regulatory inspection.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                  }}
                  className="w-full max-w-[560px] bg-white text-[#183028] rounded-2xl border border-[#E6E8E7] p-6 sm:p-8 space-y-5 transition-transform duration-150 text-xs shadow-2xs"
                >
                  {/* Paper Header */}
                  <div className="flex items-center justify-between border-b border-[#E6E8E7] pb-4">
                    <div>
                      <h4 className="font-bold text-[#183028] text-sm tracking-tight">
                        SPRINGER CAPITAL
                      </h4>
                      <p className="text-[9px] text-[#183028]/60 uppercase tracking-wider">
                        Regulatory Compliance Document
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[9px] font-bold text-[#183028]/60 uppercase block">
                        OFFICIAL FILING
                      </span>
                      <p className="text-[11px] font-mono text-[#183028] font-bold">
                        {documentId}
                      </p>
                    </div>
                  </div>

                  {/* Main Document Content */}
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase rounded-lg bg-[#E6E8E7]/50 text-[#183028] border border-[#E6E8E7]">
                        {currentDocItem.category || "General Document"}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-[#183028] leading-tight">
                        {currentDocItem.title || "Compliance Document"}
                      </h2>
                      <p className="text-[#183028]/70 mt-1 text-[11px]">
                        Submitted by <strong className="text-[#183028]">{currentDocItem.submittedBy}</strong>
                        {currentDocItem.advisorEmail && ` (${currentDocItem.advisorEmail})`}
                      </p>
                      <p className="text-[10px] text-[#183028]/50 mt-0.5">
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
                      <div className="bg-[#E6E8E7]/20 border border-[#E6E8E7] rounded-xl p-3 space-y-1">
                        <p className="font-semibold text-[#183028] text-[11px]">Filing Remarks &amp; Scope:</p>
                        <p className="text-[#183028]/80 leading-relaxed text-[11px] whitespace-pre-wrap">
                          {currentDocItem.notes}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#E6E8E7]/10 border border-[#E6E8E7] rounded-xl p-3 text-[11px] text-[#183028]/60 italic">
                        No additional filing remarks accompanied this document submission.
                      </div>
                    )}

                    {/* Attached File Summary Card */}
                    <div className="border border-[#E6E8E7] rounded-xl p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/60">
                          Attached Submission File
                        </span>
                        {currentDocItem.fileSize && (
                          <span className="text-[10px] font-mono font-semibold text-[#183028]">
                            {currentDocItem.fileSize}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileTypeIcon
                            filename={currentDocItem.fileName}
                            title={currentDocItem.title}
                            category={currentDocItem.category}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#183028] truncate text-[11px]">
                              {currentDocItem.fileName || `${currentDocItem.title}.pdf`}
                            </p>
                            <p className="text-[10px] text-[#183028]/50">
                              Verified regulatory upload payload
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const url =
                              currentDocItem.fileUrl ||
                              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/uploads/documents/${currentDocItem.fileName}`;
                            if (url) {
                              window.open(url, "_blank");
                            } else {
                              showInfoToast("File not available for viewing.");
                            }
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold bg-white hover:bg-[#C5E86C]/20 text-[#183028] rounded-xl border border-[#E6E8E7] transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Download className="h-3 w-3" />
                          <span>View / Print</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#E6E8E7] pt-3 flex items-center justify-between text-[10px] text-[#183028]/50 font-mono">
                    <span>Springer Capital Compliance Copy</span>
                    <span>Document Record</span>
                  </div>
                </div>
              )}
            </div>

            {/* Viewer Bottom Controls */}
            <div className="border-t border-[#E6E8E7] bg-white px-3.5 py-2.5 flex items-center justify-between text-xs text-[#183028] shrink-0">
              <span className="font-mono text-[11px] text-[#183028]/60">
                Document {activeDocId}
              </span>
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
              documentId={activeDocId}
              flags={analysisFlags}
              selectedFlagId={selectedFlag?.id || null}
              onSelectFlag={handleSelectFlag}
              isLoading={isLoadingAnalysis}
              onRefresh={handleRefreshAnalysis}
              isUnmasked={isUnmasked}
              onToggleUnmask={() => setIsUnmasked((prev) => !prev)}
              piiMap={piiMap}
              isOfficer={isOfficer}
            />
          ) : (
            <div className="border border-[#E6E8E7] bg-white text-[#183028] rounded-2xl h-full p-6 text-sm shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50">Document feedback</p>
              <h2 className="mt-2 text-base font-bold text-[#183028]">Review status and revision history</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#183028]/70">Officer feedback and revision requests appear in the Revision tab. AI compliance analysis is available to compliance officers.</p>
            </div>
          )}
        </div>
      </div>

      {/* Officer Decision Dialog */}
      {isOfficer && <DecisionDialog
        isOpen={!!activeDecision}
        onClose={() => setActiveDecision(null)}
        documentId={activeDocId}
        documentTitle={title}
        decisionType={activeDecision}
        onConfirmDecision={handleExecuteDecision}
        isSubmitting={isUpdating}
      />}

      {/* Edit Metadata Modal */}
      {isOfficer && (
        <EditDocumentModal
          document={currentDocItem}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
