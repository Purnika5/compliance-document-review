"use client";

/**
 * DOCU: Renders the document detail placeholder and review metadata.
 * Last Updated Date: September 3, 2026
 * @returns The document detail placeholder view.
 * @author Keith
 */
import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { DocumentStatusType, DocumentItem } from "@/lib/validation/document";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { EditDocumentModal } from "./edit-document-modal";
import { AIAssistPanel, MOCK_AI_FLAGS, type IAIFlagItem } from "./ai-assist-panel";
import { RevisionTimeline } from "./revision-timeline";
import { cn } from "@/lib/utils";

export interface DocumentDetailPlaceholderProps {
  documentId: string;
}

/**
 * DOCU: Renders a document detail view with review controls.
 * Last Updated Date: September 3, 2026
 * @param documentId - Document identifier displayed and updated in the view.
 * @returns The document detail view.
 * @author Keith
 */
export function DocumentDetailPlaceholder({ documentId }: DocumentDetailPlaceholderProps) {
  const [status, setStatus] = useState<DocumentStatusType>("Pending");
  const [title, setTitle] = useState<string>("Q3 High Net Worth Asset Allocation Strategy");
  const [category, setCategory] = useState<string>("Investment Proposal");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<IAIFlagItem | null>(MOCK_AI_FLAGS[0]);
  const [activeLeftTab, setActiveLeftTab] = useState<"metadata" | "history">("metadata");

  const totalPages = 3;

  const currentDocItem: DocumentItem = {
    id: documentId,
    title,
    category,
    submittedBy: "Sarah Jenkins",
    submittedAt: "2026-09-01T10:30:00Z",
    status,
    fileSize: "2.4 MB",
  };

  const handleStatusUpdate = async (newStatus: "Approved" | "Needs Revision" | "Rejected") => {
    setIsUpdating(true);
    setActionSuccess(null);
    try {
      await updateDocumentStatusAction(documentId, newStatus);
      setStatus(newStatus);
      setActionSuccess(`Document marked as "${newStatus}".`);
    } catch {
      setStatus(newStatus);
      setActionSuccess(`Status updated to "${newStatus}".`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async (updated: Partial<DocumentItem> & { id: string }) => {
    if (updated.title) setTitle(updated.title);
    if (updated.category) setCategory(updated.category);
    if (updated.status && updated.status !== status) {
      if (updated.status === "Approved" || updated.status === "Needs Revision" || updated.status === "Rejected") {
        await handleStatusUpdate(updated.status);
      } else {
        setStatus(updated.status);
      }
    }
    setActionSuccess("Metadata updated successfully.");
  };

  const handleSelectFlag = (flag: IAIFlagItem) => {
    setSelectedFlag(flag);
    setCurrentPage(flag.pageNumber);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* Top Header & Breadcrumbs Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-md border-slate-300 font-semibold text-slate-800">
            <Link href="/queue">
              <ArrowLeft className="h-3.5 w-3.5" />
              Review Queue
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800">{documentId}</span>
            <span className="hidden text-xs font-medium text-slate-500 md:inline">• {title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit Metadata
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <Badge status={status} />
        </div>
      </div>

      {actionSuccess && (
        <Alert variant="success" title="Success" message={actionSuccess} />
      )}

      {/* 3-Panel Compliance Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* PANEL 1 (LEFT 3 COLS): Document Metadata & Revision Thread */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden h-[740px] flex flex-col">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 shrink-0">
              <button
                onClick={() => setActiveLeftTab("metadata")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer text-center",
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
                  "flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer text-center",
                  activeLeftTab === "history"
                    ? "bg-white text-slate-900 border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                Revision Thread
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {activeLeftTab === "metadata" ? (
                <div className="space-y-4 text-xs">
                  <div className="space-y-3 pb-4 border-b border-slate-100">
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
                        Date Submitted
                      </span>
                      <p className="text-slate-700 mt-0.5">Sep 01, 2026 · 10:30 AM</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Version & Security Level
                      </span>
                      <p className="font-mono text-slate-700 mt-0.5">v1.1 • Level 2 Institutional</p>
                    </div>
                  </div>

                  {/* Officer Actions Suite */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Officer Decision
                    </p>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusUpdate("Approved")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs bg-emerald-800 hover:bg-emerald-900 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Document</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusUpdate("Needs Revision")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusUpdate("Rejected")}
                      className="w-full flex items-center justify-start gap-2 h-9 px-3 rounded-md font-semibold text-xs bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject Proposal</span>
                    </button>
                  </div>
                </div>
              ) : (
                <RevisionTimeline documentId={documentId} />
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2 (CENTER 5 COLS): Document Viewer Canvas */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col h-[740px]">
            {/* Viewer Top Bar */}
            <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="h-3.5 w-3.5 text-slate-300" />
                <span className="text-xs font-mono text-slate-200 font-medium">
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
                <span className="text-[11px] font-mono text-slate-200 px-1">
                  {zoomLevel}%
                </span>
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
            <div className="bg-slate-100 p-3 sm:p-5 flex-1 overflow-auto flex justify-center items-start">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                className="w-full max-w-[500px] bg-white text-slate-900 rounded border border-slate-300 p-6 space-y-4 transition-transform duration-200 text-xs shadow-xs"
              >
                {/* PDF Paper Header */}
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
                    <p className="text-[11px] font-mono text-slate-700 font-semibold">{documentId}</p>
                  </div>
                </div>

                {/* Page 1 with Clickable Interactive Rule Highlights */}
                {currentPage === 1 && (
                  <div className="space-y-3.5 text-left">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-800 border border-slate-200 mb-1">
                        {category}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight">
                        {title}
                      </h2>
                      <p className="text-slate-500 mt-0.5 font-normal text-[11px]">
                        Prepared by Sarah Jenkins (Senior Financial Advisor)
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                      <p className="font-semibold text-slate-900 text-[11px]">Executive Summary:</p>
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        This strategic portfolio recommendation outlines capital distribution across global equities (45%), fixed income bonds (30%), private real estate trusts (15%), and liquid cash reserves (10%).
                      </p>
                    </div>

                    {/* Highlighted Table / Passage Area */}
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2">Asset Class</th>
                            <th className="p-2">Target</th>
                            <th className="p-2 text-right">Yield</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 text-[11px]">
                          <tr
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedFlag?.id === "flag-2"
                                ? "bg-amber-100 font-bold text-amber-950"
                                : "hover:bg-slate-50"
                            )}
                            onClick={() => setSelectedFlag(MOCK_AI_FLAGS[1])}
                          >
                            <td className="p-2 font-medium text-slate-800">Global Equities Index</td>
                            <td className="p-2">45.0%</td>
                            <td className="p-2 text-right font-medium text-slate-800">+9.4% (Flagged)</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium text-slate-800">Sovereign Fixed Income</td>
                            <td className="p-2">30.0%</td>
                            <td className="p-2 text-right font-medium text-slate-800">+4.8%</td>
                          </tr>
                          <tr
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedFlag?.id === "flag-1"
                                ? "bg-rose-100 font-bold text-rose-950"
                                : "hover:bg-slate-50"
                            )}
                            onClick={() => setSelectedFlag(MOCK_AI_FLAGS[0])}
                          >
                            <td className="p-2 font-medium text-slate-800 flex items-center gap-1.5">
                              <span>Real Estate Investment Trust</span>
                              <span className="px-1 py-0.2 rounded bg-rose-200 text-rose-900 text-[9px] font-bold">
                                FD-2.1.3
                              </span>
                            </td>
                            <td className="p-2 font-bold text-rose-950">15.0% (Beneficial)</td>
                            <td className="p-2 text-right font-medium text-slate-800">+7.2%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {selectedFlag && (
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 text-[11px] flex items-center justify-between">
                        <span>Active Focus: <strong>{selectedFlag.ruleCode}</strong> ({selectedFlag.title})</span>
                        <span className="text-[10px] text-slate-500 font-medium">Linked to Rule Flag</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Page 2 */}
                {currentPage === 2 && (
                  <div className="space-y-4 text-xs text-slate-600 text-left">
                    <h3 className="font-bold text-slate-900 text-sm">Risk Assessment & Mitigation</h3>
                    <p className="leading-relaxed">
                      Stress-testing models indicate portfolio stability under severe market volatility conditions. Drawdown risks are hedged via treasury futures and currency swap options.
                    </p>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700">
                      <strong>Compliance Note:</strong> All client suitability parameters meet FINRA Rule 2111 requirement standards.
                    </div>
                  </div>
                )}

                {/* Page 3 */}
                {currentPage === 3 && (
                  <div className="space-y-6 text-xs text-slate-600 text-left">
                    <h3 className="font-bold text-slate-900 text-sm">Authorization & Signatures</h3>
                    <div className="border-t border-b border-slate-200 py-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-slate-400">Advisor Signature</p>
                        <p className="font-serif italic text-sm text-slate-800 mt-1">Sarah Jenkins</p>
                        <p className="text-[10px] text-slate-400">Date: Sep 01, 2026</p>
                      </div>
                      <div
                        className={cn(
                          "p-2 rounded cursor-pointer transition-colors",
                          selectedFlag?.id === "flag-3" ? "bg-slate-100 ring-1 ring-slate-400" : ""
                        )}
                        onClick={() => setSelectedFlag(MOCK_AI_FLAGS[2])}
                      >
                        <p className="text-[10px] uppercase font-semibold text-slate-400">Officer Approval</p>
                        <p className="font-mono text-xs font-semibold text-slate-900 mt-1">
                          {status === "Approved" ? "APPROVED - OFFICER ALEX SMITH" : "[Pending Approval]"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Springer Capital Compliance Copy</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
              </div>
            </div>

            {/* Page Navigator Footer */}
            <div className="bg-slate-900 border-t border-slate-800 px-3 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-300"
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
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="h-3 w-3" /> PDF Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 3 (RIGHT 4 COLS): AI Assist Copilot */}
        <div className="lg:col-span-4 h-[740px]">
          <AIAssistPanel
            documentId={documentId}
            selectedFlagId={selectedFlag?.id || null}
            onSelectFlag={handleSelectFlag}
          />
        </div>
      </div>

      {/* Edit Document Modal */}
      <EditDocumentModal
        document={currentDocItem}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
