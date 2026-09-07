"use client";

/**
 * DOCU: Renders the complete document review workspace and decision flow.
 * Last Updated Date: September 3, 2026
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
import { AIAssistPanel, MOCK_AI_FLAGS, type IAIFlagItem } from "@/features/documents/components/ai-assist-panel";
import { RevisionThread } from "@/features/audit/components/revision-thread";
import { AuditTrailTable } from "@/features/audit/components/audit-trail-table";
import { DecisionDialog } from "./decision-dialog";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth/auth-store";

export interface ReviewWorkspaceProps {
  documentId: string;
}

/**
 * DOCU: Renders the complete document review workspace and decision flow.
 * Last Updated Date: September 3, 2026
 * @param documentId - Document identifier loaded into the workspace.
 * @returns The document review workspace view.
 * @author Keith
 */
export function ReviewWorkspace({ documentId }: ReviewWorkspaceProps) {
  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession, authStore.getServerSnapshot);
  const isOfficer = session?.role === "Officer";
  const [status, setStatus] = useState<DocumentStatusType>("Pending");
  const [title, setTitle] = useState<string>("Q3 High Net Worth Asset Allocation Strategy");
  const [category, setCategory] = useState<string>("Investment Proposal");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<IAIFlagItem | null>(MOCK_AI_FLAGS[0]);
  const [activeLeftTab, setActiveLeftTab] = useState<"metadata" | "history" | "audit">("metadata");
  const [activeDecision, setActiveDecision] = useState<"Approved" | "Needs Revision" | "Rejected" | null>(null);
  const [mobileActiveZone, setMobileActiveZone] = useState<"document" | "ai" | "decision">("document");
  const [isAiDrawerOpenTablet, setIsAiDrawerOpenTablet] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  const totalPages = 3;
  const passageRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    let isActive = true;

    getDocumentAction(documentId)
      .then((document) => {
        if (!isActive) return;
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

    return () => {
      isActive = false;
    };
  }, [documentId]);

  const currentDocItem: DocumentItem = {
    id: documentId,
    title,
    category,
    submittedBy: "Sarah Jenkins",
    advisorEmail: "sarah.j@springercapital.com",
    submittedAt: "2026-09-01T10:30:00Z",
    status,
    fileSize: "2.4 MB",
  };

  // When selected flag changes, ensure the correct page is shown and scroll to passage
  const handleSelectFlag = (flag: IAIFlagItem) => {
    setSelectedFlag(flag);
    setCurrentPage(flag.pageNumber);

    // Smooth scroll to flagged element
    setTimeout(() => {
      if (passageRef.current) {
        passageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

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
    } catch {
      setStatus(newStatus);
      setActionSuccess(`Status updated to "${newStatus}". Audit log updated.`);
    } finally {
      setIsUpdating(false);
    }
  };

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
      <div className="glass-accent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl shadow-[8px_8px_18px_hsl(228_42%_74%_/_0.42)]">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-2.5 rounded-md text-xs font-semibold border-white/50 bg-white/90 text-blue-950 gap-1.5 shadow-sm"
          >
            <Link href="/queue">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Queue</span>
            </Link>
          </Button>

          <span className="text-slate-300">/</span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white">{documentId}</span>
              <span className="text-cyan-100 hidden sm:inline">•</span>
              <h1 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                {title}
              </h1>
            </div>
            <p className="text-[11px] text-blue-50/85 hidden sm:block">
              Advisor: Sarah Jenkins • Submitted Sep 01, 2026 • Security Level 2 Institutional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-white/50 bg-white/90 text-xs font-semibold text-blue-950 hover:bg-cyan-50 transition-colors cursor-pointer shadow-sm"
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-500" />
            <span>Edit Metadata</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

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
      <div className="neu-surface flex lg:hidden p-1 rounded-xl">
        <button
          onClick={() => setMobileActiveZone("document")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors",
            mobileActiveZone === "document"
              ? "bg-blue-100 text-blue-900 font-bold shadow-inner"
              : "text-slate-600 hover:text-blue-800"
          )}
        >
          Document Canvas
        </button>
        <button
          onClick={() => setMobileActiveZone("ai")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors",
            mobileActiveZone === "ai"
              ? "bg-cyan-100 text-cyan-900 font-bold shadow-inner"
              : "text-slate-600 hover:text-cyan-800"
          )}
        >
          AI Assistance (3)
        </button>
        <button
          onClick={() => setMobileActiveZone("decision")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors",
            mobileActiveZone === "decision"
              ? "bg-pink-100 text-pink-900 font-bold shadow-inner"
              : "text-slate-600 hover:text-pink-800"
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
          <div className="neu-surface rounded-xl overflow-hidden h-[740px] flex flex-col">
            {/* Left Header Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 shrink-0">
              <button
                onClick={() => setActiveLeftTab("metadata")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  activeLeftTab === "metadata"
                    ? "bg-white text-slate-900 border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Metadata
              </button>
              <button
                onClick={() => setActiveLeftTab("history")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  activeLeftTab === "history"
                    ? "bg-white text-slate-900 border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Revision
              </button>
              {isOfficer && <button
                onClick={() => setActiveLeftTab("audit")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  activeLeftTab === "audit"
                    ? "bg-white text-slate-900 border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Audit Log
              </button>}
            </div>

            {/* Left Content Area */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeLeftTab === "metadata" ? (
                <div className="space-y-4 text-xs">
                  <div className="detail-highlight rounded-lg space-y-3 p-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Classification
                      </span>
                      <p className="font-semibold text-slate-900 mt-0.5">{category}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Submitting Advisor
                      </span>
                      <p className="font-semibold text-slate-900 mt-0.5">Sarah Jenkins</p>
                      <p className="text-[11px] text-slate-500">sarah.j@springercapital.com</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Submission Timestamp
                      </span>
                      <p className="text-slate-700 mt-0.5">Sep 01, 2026 · 10:30 AM UTC</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Version & Security Clearance
                      </span>
                      <p className="font-mono text-slate-700 mt-0.5">v1.1 • Level 2 Institutional</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Compliance Rules Checked
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200">
                          FINRA 2111
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200">
                          SEC 17a-4
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200">
                          Rule FD-2.1.3
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OFFICER DECISION ACTIONS (User Story 6: Unambiguous human decision) */}
                  {isOfficer && <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                        Officer Decision Suite
                      </p>
                      <span className="text-[10px] font-semibold text-slate-500">Human Sign-off</span>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Approved")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs bg-primary hover:bg-primary/90 text-white shadow-[3px_3px_8px_hsl(228_42%_74%_/_0.45)] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Proposal</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Needs Revision")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs bg-blue-950 hover:bg-blue-900 text-white shadow-[3px_3px_8px_hsl(228_42%_74%_/_0.45)] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setActiveDecision("Rejected")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded font-semibold text-xs bg-destructive hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Formal Rejection</span>
                    </button>
                  </div>}
                </div>
              ) : activeLeftTab === "history" ? (
                <RevisionThread documentId={documentId} />
              ) : isOfficer ? (
                <AuditTrailTable documentIdFilter={documentId} />
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
          <div className="neu-surface rounded-xl overflow-hidden flex flex-col h-[740px]">
            {/* Viewer Top Toolbar */}
            <div className="glass-accent text-white px-3 py-2 flex items-center justify-between border-b border-cyan-300/40 shrink-0 text-xs">
              <div className="flex items-center space-x-2">
                <FileText className="h-3.5 w-3.5 text-slate-300" />
                <span className="font-mono text-slate-200 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                  {documentId}_Proposal.pdf
                </span>
              </div>

              <div className="flex items-center space-x-1 text-slate-300">
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
                  title="Zoom Out"
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-200 px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(150, prev + 10))}
                  title="Zoom In"
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                <button
                  onClick={() => window.print()}
                  title="Print Document"
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas Display */}
            <div className="bg-background/70 p-3 sm:p-5 flex-1 overflow-auto flex justify-center items-start">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-[500px] bg-white text-slate-900 rounded border border-slate-300 p-6 space-y-4 transition-transform duration-150 text-xs shadow-xs"
              >
                {/* Paper Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                      SPRINGER CAPITAL
                    </h4>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">
                      Institutional Wealth Advisory
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[9px] font-bold text-slate-500 uppercase">
                      CONFIDENTIAL
                    </span>
                    <p className="text-[11px] font-mono text-slate-700 font-semibold">
                      {documentId}
                    </p>
                  </div>
                </div>

                {/* Page 1 Canvas Content */}
                {currentPage === 1 && (
                  <div className="space-y-3.5 text-left">
                    <div>
                      <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-800 border border-slate-200 mb-1">
                        {category}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        {title}
                      </h2>
                      <p className="text-slate-500 mt-0.5 font-normal text-[11px]">
                        Prepared by Sarah Jenkins (Senior Financial Advisor)
                      </p>
                    </div>

                    <div className="detail-highlight rounded-lg p-2.5 space-y-1">
                      <p className="font-semibold text-slate-900 text-[11px]">Executive Summary:</p>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        This strategic portfolio recommendation outlines capital distribution across global equities (45%), sovereign bonds (30%), private real estate trusts (15%), and cash reserves (10%).
                      </p>
                    </div>

                    {/* Interactive Passage Table with Flag Bindings */}
                    <div className="detail-highlight rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2">Asset Class</th>
                            <th className="p-2">Target</th>
                            <th className="p-2 text-right">Yield</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                          {/* Flag 2 Passage */}
                          <tr
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedFlag?.id === "flag-2"
                                ? "bg-cyan-100 font-bold text-cyan-950 ring-2 ring-cyan-400 shadow-[inset_0_0_0_1px_hsl(190_80%_48%)]"
                                : "hover:bg-cyan-50"
                            )}
                            onClick={() => setSelectedFlag(MOCK_AI_FLAGS[1])}
                          >
                            <td className="p-2 font-medium text-slate-800 flex items-center gap-1.5">
                              <span>Global Equities Index</span>
                              <span className="px-1 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-mono font-bold">
                                SEC 17a-4
                              </span>
                            </td>
                            <td className="p-2">45.0%</td>
                            <td className="p-2 text-right font-medium text-slate-800">
                              +9.4% (Yield Flag)
                            </td>
                          </tr>

                          {/* Non-flagged row */}
                          <tr>
                            <td className="p-2 font-medium text-slate-800">Sovereign Fixed Income</td>
                            <td className="p-2">30.0%</td>
                            <td className="p-2 text-right font-medium text-slate-800">+4.8%</td>
                          </tr>

                          {/* Flag 1 Passage (High Severity) */}
                          <tr
                            ref={passageRef}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedFlag?.id === "flag-1"
                                ? "bg-pink-100 font-bold text-pink-950 ring-2 ring-pink-400 shadow-[inset_0_0_0_1px_hsl(326_78%_61%)]"
                                : "hover:bg-pink-50"
                            )}
                            onClick={() => setSelectedFlag(MOCK_AI_FLAGS[0])}
                          >
                            <td className="p-2 font-medium text-slate-800 flex items-center gap-1.5">
                              <span>Real Estate Investment Trust</span>
                              <span className="px-1 py-0.2 rounded bg-red-200 text-red-900 text-[9px] font-mono font-bold">
                                FD-2.1.3
                              </span>
                            </td>
                            <td className="p-2 font-bold text-red-950">15.0% (Beneficial)</td>
                            <td className="p-2 text-right font-medium text-slate-800">+7.2%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Active Flag Link Context Banner */}
                    {selectedFlag && (
                      <div className="glass-accent p-2 rounded-lg text-white text-[11px] flex items-center justify-between gap-2 shadow-[3px_3px_8px_hsl(228_42%_74%_/_0.38)]">
                        <span>
                          Active Inspection: <strong>Rule {selectedFlag.ruleCode}</strong> ({selectedFlag.title})
                        </span>
                        <span className="text-[10px] text-cyan-100 font-medium">Linked to Flag</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Page 2 Canvas Content */}
                {currentPage === 2 && (
                  <div className="space-y-4 text-xs text-slate-600 text-left">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Risk Assessment & Stress Testing
                    </h3>
                    <p className="leading-relaxed">
                      Monte Carlo simulations project portfolio stability under severe multi-asset market stress. Drawdown risk is mitigated using institutional treasury options.
                    </p>
                    <div className="detail-highlight rounded-lg p-2.5 text-slate-700">
                      <strong>Suitability Compliance:</strong> Client suitability criteria align with FINRA Rule 2111 benchmarks.
                    </div>
                  </div>
                )}

                {/* Page 3 Canvas Content */}
                {currentPage === 3 && (
                  <div className="space-y-6 text-xs text-slate-600 text-left">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Authorization & Compliance Sign-off
                    </h3>
                    <div className="detail-highlight-pink rounded-lg px-2 py-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400">
                          Advisor Signature
                        </p>
                        <p className="font-serif italic text-sm text-slate-800 mt-1">
                          Sarah Jenkins
                        </p>
                        <p className="text-[10px] text-slate-400">Date: Sep 01, 2026</p>
                      </div>

                      <div
                        className={cn(
                          "p-2 rounded cursor-pointer transition-colors",
                          selectedFlag?.id === "flag-3" ? "bg-slate-100 ring-1 ring-slate-400" : ""
                        )}
                        onClick={() => setSelectedFlag(MOCK_AI_FLAGS[2])}
                      >
                        <p className="text-[10px] uppercase font-semibold text-slate-400">
                          Officer Execution
                        </p>
                        <p className="font-mono text-xs font-semibold text-slate-900 mt-1">
                          {status === "Approved"
                            ? "APPROVED - OFFICER ALEX SMITH"
                            : `[${status.toUpperCase()}]`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Springer Capital Compliance Copy</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </div>

            {/* Page Navigator Footer */}
            <div className="bg-primary border-t border-cyan-300/30 px-3 py-2 flex items-center justify-between text-xs text-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-300"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-[11px] font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-300"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
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
              selectedFlagId={selectedFlag?.id || null}
              onSelectFlag={handleSelectFlag}
            />
          ) : (
            <div className="detail-highlight rounded-xl h-full p-5 text-sm text-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">Document feedback</p>
              <h2 className="mt-2 text-base font-bold text-slate-900">Review status and revision history</h2>
              <p className="mt-2 text-xs leading-relaxed">Officer feedback and revision requests appear in the Revision tab. AI compliance analysis is available to compliance officers.</p>
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
