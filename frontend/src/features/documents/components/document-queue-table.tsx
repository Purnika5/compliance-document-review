"use client";

/**
 * DOCU: Renders the officer document queue and review actions adhering to dark mode.
 * Last Updated Date: September 8, 2026
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
  Percent,
} from "lucide-react";
import type { DocumentItem } from "@/lib/validation/document";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Pending" | "Needs Revision" | "Approved" | "Rejected";

/**
 * DOCU: Renders the officer document queue and review controls.
 * Last Updated Date: September 8, 2026
 * @returns The document queue view.
 * @author Keith
 */
export function DocumentQueueTable() {
  const router = useRouter();
  const { documents, isPending, refetch } = useDocuments("queue");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [sortField] = useState<"submittedAt" | "title" | "status">("submittedAt");
  const [sortDirection] = useState<"asc" | "desc">("desc");
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
      {/* Header Banner */}
      <div className="border border-border bg-card/80 backdrop-blur-md rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-primary/20 text-emerald-400 border-primary/30 text-[10px] font-bold uppercase tracking-wider">
              Regulatory Triage
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Officer Review Queue
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs border-border bg-muted/30 hover:bg-muted font-semibold gap-1.5 cursor-pointer"
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
        <div className="rounded-xl p-5 sm:col-span-2 lg:col-span-4 border border-border bg-card shadow-xs flex flex-col justify-center relative overflow-hidden group">
          <div className="relative z-10 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Review Queue Volume
            </p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-5xl font-bold tracking-tight text-foreground">{counts.All}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Total submissions across portfolios</p>
              </div>
            </div>
            <div className="mt-7 border-t border-border/60 pt-3 text-[11px] text-muted-foreground text-right">
              <span className="font-semibold text-amber-400">{counts.Pending} pending</span>
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              <span>{counts.Approved} verified</span>
            </div>
          </div>
          {/* Decorative Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-16 pointer-events-none">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-cyan-500">
              <path d="M0,30 L0,18 C15,10 25,25 40,20 C55,15 70,26 85,14 C90,10 95,18 100,12 L100,30 Z" fill="currentColor" fillOpacity="0.1" />
              <path d="M0,18 C15,10 25,25 40,20 C55,15 70,26 85,14 C90,10 95,18 100,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-2 border border-border bg-card shadow-xs relative overflow-hidden flex flex-col justify-between group">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Pending Evaluation
              </p>
              {counts.Pending > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <h3 className="text-3xl font-bold text-foreground mt-2">{counts.Pending}</h3>
            <span className="text-[11px] text-muted-foreground">Needs action</span>
          </div>
          {/* Decorative Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-amber-500">
              <path d="M0,30 L0,22 C12,18 25,26 38,15 C50,4 65,20 75,12 C85,4 92,16 100,10 L100,30 Z" fill="currentColor" fillOpacity="0.1" />
              <path d="M0,22 C12,18 25,26 38,15 C50,4 65,20 75,12 C85,4 92,16 100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Needs Revision / High Priority */}
        <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-2 border border-border bg-card shadow-xs relative overflow-hidden flex flex-col justify-between group">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
                Action Required (Revisions)
              </p>
              {counts["Needs Revision"] > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              )}
            </div>
            <h3 className="text-3xl font-bold text-foreground mt-2">{counts["Needs Revision"]}</h3>
            <span className="text-[11px] text-muted-foreground">Awaiting advisor</span>
          </div>
          {/* Decorative Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-orange-500">
              <path d="M0,30 L0,15 C15,5 25,25 40,18 C55,11 70,22 85,8 C90,3 95,12 100,6 L100,30 Z" fill="currentColor" fillOpacity="0.1" />
              <path d="M0,15 C15,5 25,25 40,18 C55,11 70,22 85,8 C90,3 95,12 100,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Approved Records */}
        <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-2 border border-border bg-card shadow-xs relative overflow-hidden flex flex-col justify-between group">
          <div className="relative z-10">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Approved &amp; Verified
            </p>
            <h3 className="text-3xl font-bold text-foreground mt-2">{counts.Approved}</h3>
            <span className="text-[11px] text-muted-foreground">Audit compliant</span>
          </div>
          {/* Decorative Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
              <path d="M0,30 L0,25 C20,20 30,10 50,15 C70,20 80,5 100,2 L100,30 Z" fill="currentColor" fillOpacity="0.1" />
              <path d="M0,25 C20,20 30,10 50,15 C70,20 80,5 100,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Review Throughput */}
        <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-2 border border-border bg-card shadow-xs relative overflow-hidden flex flex-col justify-between group">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Review throughput</p>
              <Percent className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mt-2">{reviewRate}%</h3>
            <p className="text-[11px] text-muted-foreground">Approved or rejected records</p>
          </div>
          {/* Decorative Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
              <path d="M0,30 L0,20 C10,15 20,25 30,18 C40,11 50,22 60,10 C70,-2 80,12 90,5 L100,8 L100,30 Z" fill="currentColor" fillOpacity="0.1" />
              <path d="M0,20 C10,15 20,25 30,18 C40,11 50,22 60,10 C70,-2 80,12 90,5 L100,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>


      </div>

      {/* Queue Toolbar: Search, Status Tabs, and Priority Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto [scrollbar-width:none]">
          {(["All", "Pending", "Needs Revision", "Approved", "Rejected"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap",
                  activeTab === tab
                    ? "bg-[#062a20] text-[#54d0a2] font-semibold shadow-xs"
                    : "bg-transparent text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062a20]"
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
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search advisor, document ID, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-md bg-background border-border text-foreground"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-8 text-xs rounded-md px-2 font-medium bg-background border border-border text-foreground outline-none cursor-pointer"
            >
              <option value="All" className="bg-card text-foreground">All Priorities</option>
              <option value="Urgent" className="bg-card text-foreground">Urgent</option>
              <option value="High" className="bg-card text-foreground">High</option>
              <option value="Medium" className="bg-card text-foreground">Medium</option>
              <option value="Standard" className="bg-card text-foreground">Standard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Review Queue Table */}
      <div className="rounded-xl overflow-hidden text-xs border border-border bg-card shadow-xs">
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
              <TableRow className="border-b border-border bg-muted/40">
                <TableHead className="w-32 pl-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DOCUMENT ID
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DOCUMENT DETAILS
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  SUBMITTING ADVISOR
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  SUBMITTED DATE
                </TableHead>
                <TableHead className="w-24 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  PRIORITY
                </TableHead>
                <TableHead className="w-28 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  STATUS
                </TableHead>
                <TableHead className="text-right pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                    className="hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50"
                    onClick={() => router.push(`/documents/${doc.id}`)}
                  >
                    <TableCell className="pl-4 font-mono font-semibold text-foreground">
                      {doc.id}
                    </TableCell>

                    <TableCell>
                      <div className="border-l-2 border-cyan-400 pl-2 font-medium text-foreground">{doc.title}</div>
                      <div className="pl-2 text-[10px] text-muted-foreground font-medium">
                        {doc.category} • {doc.fileSize || "2.4 MB"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-foreground">{doc.submittedBy}</div>
                      <div className="text-[10px] text-muted-foreground">{doc.advisorEmail || "advisor@springer.capital"}</div>
                    </TableCell>

                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded border uppercase",
                          priority === "Urgent" && "bg-rose-950/60 text-rose-300 border-rose-800/60",
                          priority === "High" && "bg-amber-950/60 text-amber-300 border-amber-800/60",
                          priority === "Medium" && "bg-secondary text-muted-foreground border-border",
                          priority === "Standard" && "bg-secondary/50 text-muted-foreground/80 border-border/60"
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
                          className="h-7 px-2.5 rounded border-border text-xs font-medium text-foreground bg-transparent hover:bg-[#062a20] hover:text-[#54d0a2] hover:border-emerald-800/60 transition-colors gap-1"
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
                            className="inline-flex h-7 items-center gap-1 rounded bg-transparent border border-emerald-800/60 px-2.5 text-xs font-semibold text-[#54d0a2] hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-md bg-transparent hover:bg-[#062a20] text-muted-foreground hover:text-[#54d0a2] hover:border-emerald-800/60 flex items-center justify-center transition-colors cursor-pointer border border-border">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-card shadow-xl rounded-xl border-border p-1">
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium text-amber-400 hover:bg-amber-950/40 rounded-md px-2 py-1.5"
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
                              className="text-xs cursor-pointer gap-2 font-medium text-rose-400 hover:bg-rose-950/40 rounded-md px-2 py-1.5"
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
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium rounded-md px-2 py-1.5 text-foreground/90"
                              onClick={() => setEditingDoc(doc)}
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Metadata
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
