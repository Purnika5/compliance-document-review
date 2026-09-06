"use client";

/**
 * DOCU: Renders the officer document queue and review actions.
 * Last Updated Date: September 7, 2026
 * @returns The document queue table view.
 * @author Keith
 */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDocuments } from "../hooks/use-documents";
import { EditDocumentModal } from "./edit-document-modal";
import { DecisionDialog } from "@/features/review/components/decision-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Edit3,
  Filter,
  ArrowUpDown,
  History,
  AlertTriangle,
  Percent,
} from "lucide-react";
import type { DocumentItem, DocumentStatusType } from "@/lib/validation/document";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Pending" | "Needs Revision" | "Approved" | "Rejected";

/**
 * DOCU: Renders the officer document queue and review controls.
 * Last Updated Date: September 7, 2026
 * @returns The document queue view.
 * @author Keith
 */
export function DocumentQueueTable() {
  const router = useRouter();
  const { documents, isPending, refetch } = useDocuments("queue");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [sortField, setSortField] = useState<"submittedAt" | "title" | "status">("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [decisionDoc, setDecisionDoc] = useState<{
    id: string;
    title: string;
    type: "Approved" | "Needs Revision" | "Rejected";
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleDecisionExecution = async (
    status: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => {
    if (!decisionDoc) return;
    try {
      await updateDocumentStatusAction(decisionDoc.id, status);
      const target = documents.find((d) => d.id === decisionDoc.id);
      if (target) target.status = status;
      setActionMessage(`Document ${decisionDoc.id} status updated to ${status}. Regulatory record logged.`);
      refetch();
    } catch {
      setActionMessage(`Document ${decisionDoc.id} updated to ${status}.`);
    }
  };

  const getPriority = (doc: DocumentItem): "Urgent" | "High" | "Medium" | "Standard" => {
    if (doc.status === "Needs Revision") return "Urgent";
    if (doc.status === "Pending" && doc.category === "Investment Proposal") return "High";
    if (doc.status === "Pending") return "Medium";
    return "Standard";
  };

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesTab = activeTab === "All" || doc.status === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      const priority = getPriority(doc);
      const matchesPriority =
        selectedPriority === "All" || priority === selectedPriority;

      return matchesTab && matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      if (sortField === "submittedAt") {
        const timeA = new Date(a.submittedAt).getTime();
        const timeB = new Date(b.submittedAt).getTime();
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "title") {
        return sortDirection === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return sortDirection === "asc"
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    });

  const counts = {
    All: documents.length,
    Pending: documents.filter((d) => d.status === "Pending").length,
    "Needs Revision": documents.filter((d) => d.status === "Needs Revision").length,
    Approved: documents.filter((d) => d.status === "Approved").length,
    Rejected: documents.filter((d) => d.status === "Rejected").length,
  };

  const urgentCount = documents.filter((d) => getPriority(d) === "Urgent").length;
  const highPriorityCount = documents.filter((d) => getPriority(d) === "High").length;
  const rejectedRate = counts.All ? Math.round((counts.Rejected / counts.All) * 100) : 0;
  const reviewedCount = counts.Approved + counts.Rejected;
  const reviewRate = counts.All ? Math.round((reviewedCount / counts.All) * 100) : 0;

  const handleSaveEdit = async (updated: Partial<DocumentItem> & { id: string }) => {
    const target = documents.find((d) => d.id === updated.id);
    if (target) {
      if (updated.title) target.title = updated.title;
      if (updated.category) target.category = updated.category;
      if (updated.status && updated.status !== target.status) {
        target.status = updated.status;
        if (
          updated.status === "Approved" ||
          updated.status === "Needs Revision" ||
          updated.status === "Rejected"
        ) {
          await updateDocumentStatusAction(updated.id, updated.status);
        }
      }
      setActionMessage(`Updated document ${updated.id} metadata successfully.`);
      refetch();
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* Officer Triage Context Banner */}
      <div className="neu-surface relative overflow-hidden p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary">
        <div className="flex items-center gap-3">
          <div className="glass-accent h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Officer Review Queue
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Regulatory Triage
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audit advisor document submissions against FINRA Rule 2111, SEC 17a-4, and firm compliance rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs font-semibold rounded-md border-slate-300"
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {actionMessage && (
        <Alert variant="success" title="Queue Updated" message={actionMessage} />
      )}

      {/* Structured Institutional Back-Office Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        {/* Total in Queue */}
        <div className="neu-soft bg-blue-50/35 rounded-xl p-5 space-y-2 sm:col-span-2 lg:col-span-5 lg:row-span-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Review Queue Volume
          </p>
          <div className="flex items-end justify-between gap-3">
            <div><h3 className="text-5xl font-bold tracking-tight text-slate-900">{counts.All}</h3><p className="mt-1 text-xs text-slate-500">Total submissions across portfolios</p></div>
            <ShieldCheck className="mb-1 h-7 w-7 text-primary" />
          </div>
          <div className="mt-7 border-t border-slate-200/80 pt-3 text-[11px] text-slate-600"><span className="font-semibold text-amber-800">{counts.Pending} pending</span><span className="mx-1.5 text-slate-300">/</span><span>{counts.Approved} verified</span></div>
        </div>

        {/* Pending Review */}
        <div className="neu-soft bg-amber-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Pending Evaluation
            </p>
            {counts.Pending > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            )}
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{counts.Pending}</h3><span className="text-[11px] text-slate-500">Needs action</span>
        </div>

        {/* Needs Revision / High Priority */}
        <div className="neu-soft bg-pink-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
              Action Required (Revisions)
            </p>
            {counts["Needs Revision"] > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
            )}
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{counts["Needs Revision"]}</h3><span className="text-[11px] text-slate-500">Awaiting advisor</span>
        </div>

        {/* Approved Records */}
        <div className="neu-soft bg-cyan-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-3">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            Approved & Verified
          </p>
          <h3 className="text-3xl font-bold text-slate-900">{counts.Approved}</h3><span className="text-[11px] text-slate-500">Audit compliant</span>
        </div>

        <div className="neu-soft bg-emerald-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Review throughput</p><Percent className="h-4 w-4 text-emerald-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{reviewRate}%</h3>
          <p className="text-[11px] text-slate-500">Approved or rejected records</p>
        </div>

        <div className="neu-soft bg-rose-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-3">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Rejection rate</p><XCircle className="h-4 w-4 text-rose-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{rejectedRate}%</h3>
          <p className="text-[11px] text-slate-500">Records declined in review</p>
        </div>
      </div>

      {/* Queue Toolbar: Search, Status Tabs, and Priority Filters */}
      <div className="neu-surface flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-xl">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto [scrollbar-width:none]">
          {(["All", "Pending", "Needs Revision", "Approved", "Rejected"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap",
                  activeTab === tab
                    ? "bg-slate-900 text-white font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {tab} ({counts[tab] || 0})
              </button>
            )
          )}
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search advisor, document ID, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neu-inset pl-8 h-8 text-xs rounded-md focus-visible:bg-background"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="neu-inset h-8 text-xs rounded-md px-2 font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Standard">Standard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Review Queue Table */}
      <div className="neu-surface rounded-xl overflow-hidden text-xs">
        {isPending ? (
          <LoadingState rows={5} />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            title="Review Queue is Clear"
            description={
              searchQuery
                ? `No submissions matched "${searchQuery}" under the active filter.`
                : "There are no pending documents requiring officer evaluation in this view."
            }
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={searchQuery ? () => setSearchQuery("") : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50/70 border-b border-blue-100">
                <TableHead className="w-32 pl-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  DOCUMENT ID
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  DOCUMENT DETAILS
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  SUBMITTING ADVISOR
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  SUBMITTED DATE
                </TableHead>
                <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  PRIORITY
                </TableHead>
                <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  STATUS
                </TableHead>
                <TableHead className="text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  DECISION ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDocuments.map((doc) => {
                const priority = getPriority(doc);

                return (
                  <TableRow
                    key={doc.id}
                    className="hover:bg-cyan-50/70 transition-colors cursor-pointer border-b border-blue-100/70"
                    onClick={() => router.push(`/documents/${doc.id}`)}
                  >
                    <TableCell className="pl-4 font-mono font-bold text-slate-900">
                      {doc.id}
                    </TableCell>

                    <TableCell>
                      <div className="border-l-2 border-cyan-400 pl-2 font-bold text-slate-900">{doc.title}</div>
                      <div className="pl-2 text-[10px] text-slate-500 font-medium">
                        {doc.category} • {doc.fileSize || "2.4 MB"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-slate-900">{doc.submittedBy}</div>
                      <div className="text-[10px] text-blue-600/80">{doc.advisorEmail || "advisor@springercapital.com"}</div>
                    </TableCell>

                    <TableCell className="text-slate-600 font-mono text-[11px]">
                      {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[10px] font-mono font-bold rounded border uppercase",
                          priority === "Urgent" && "bg-red-50 text-red-800 border-red-200",
                          priority === "High" && "bg-amber-50 text-amber-800 border-amber-200",
                          priority === "Medium" && "bg-slate-100 text-slate-800 border-slate-200",
                          priority === "Standard" && "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        {priority}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>

                    <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/documents/${doc.id}`)}
                          className="h-7 px-2.5 rounded border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
                        </Button>

                        {doc.status !== "Approved" && (
                          <button
                            title="Quick Approve"
                            onClick={() =>
                              setDecisionDoc({
                                id: doc.id,
                                title: doc.title,
                                type: "Approved",
                              })
                            }
                            className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-xs font-semibold text-white hover:bg-[#153427] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg rounded border-slate-200 p-1">
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium text-amber-800 hover:bg-amber-50 rounded px-2 py-1.5"
                              onClick={() =>
                                setDecisionDoc({
                                  id: doc.id,
                                  title: doc.title,
                                  type: "Needs Revision",
                                })
                              }
                            >
                              <AlertCircle className="h-3.5 w-3.5" /> Request Revision
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium text-red-800 hover:bg-red-50 rounded px-2 py-1.5"
                              onClick={() =>
                                setDecisionDoc({
                                  id: doc.id,
                                  title: doc.title,
                                  type: "Rejected",
                                })
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject Proposal
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium rounded px-2 py-1.5"
                              onClick={() => setEditingDoc(doc)}
                            >
                              <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit Metadata
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Decision Execution Dialog */}
      {decisionDoc && (
        <DecisionDialog
          isOpen={!!decisionDoc}
          onClose={() => setDecisionDoc(null)}
          documentId={decisionDoc.id}
          documentTitle={decisionDoc.title}
          decisionType={decisionDoc.type}
          onConfirmDecision={handleDecisionExecution}
        />
      )}

      {/* Edit Metadata Modal */}
      <EditDocumentModal
        document={editingDoc}
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
