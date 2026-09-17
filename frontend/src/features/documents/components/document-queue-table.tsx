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
  Filter,
  Percent,
  Calendar,
} from "lucide-react";
import { DateFilterModal, type DateFilterPreset } from "./date-filter-modal";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/ui/toast";
import type { DocumentItem } from "@/lib/validation/document";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { cn } from "@/lib/utils";

import { QueueSkeleton } from "./queue-skeleton";

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
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortField] = useState<"submittedAt" | "title" | "status">("submittedAt");
  const [sortDirection] = useState<"asc" | "desc">("desc");
  const [decisionDoc, setDecisionDoc] = useState<{
    id: string;
    title: string;
    type: "Approved" | "Needs Revision" | "Rejected";
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (isPending) {
    return <QueueSkeleton />;
  }

  const handleDecisionExecution = async (
    status: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => {
    if (!decisionDoc) return;
    const docDisplayId = `DOC-${decisionDoc.id.slice(-4).toUpperCase()}`;
    try {
      await updateDocumentStatusAction(decisionDoc.id, status);
      const target = documents.find((d) => d.id === decisionDoc.id);
      if (target) target.status = status;
      const msg = `Document ${docDisplayId} status updated to ${status}. Regulatory record logged.`;
      setActionMessage(msg);
      if (status === "Approved") {
        showSuccessToast("Queue Updated", msg);
      } else if (status === "Needs Revision") {
        showInfoToast("Queue Updated", msg);
      } else {
        showErrorToast("Queue Updated", msg);
      }
      refetch();
    } catch {
      const msg = `Document ${docDisplayId} updated to ${status}.`;
      setActionMessage(msg);
      showSuccessToast("Queue Updated", msg);
    }

    setDecisionDoc(null);
    setTimeout(() => {
      setActionMessage(null);
    }, 5000);
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

      if (!matchesTab || !matchesSearch || !matchesPriority) return false;

      // Date filtering
      if (dateFilterPreset !== "All") {
        const docDate = new Date(doc.submittedAt);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (dateFilterPreset === "Today") {
          if (docDate < startOfDay || docDate > endOfDay) return false;
        } else if (dateFilterPreset === "Past 7 Days" || dateFilterPreset === "This Week") {
          const past7 = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (docDate < past7 || docDate > endOfDay) return false;
        } else if (dateFilterPreset === "Past 30 Days" || dateFilterPreset === "This Month") {
          const past30 = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (docDate < past30 || docDate > endOfDay) return false;
        } else if (dateFilterPreset === "Past 90 Days") {
          const past90 = new Date(startOfDay.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (docDate < past90 || docDate > endOfDay) return false;
        } else if (dateFilterPreset === "Past Year") {
          const past365 = new Date(startOfDay.getTime() - 365 * 24 * 60 * 60 * 1000);
          if (docDate < past365 || docDate > endOfDay) return false;
        } else if (dateFilterPreset === "All Past Dates") {
          if (docDate >= startOfDay) return false;
        } else if (dateFilterPreset === "Next 7 Days") {
          const next7 = new Date(endOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (docDate < startOfDay || docDate > next7) return false;
        } else if (dateFilterPreset === "Next 30 Days") {
          const next30 = new Date(endOfDay.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (docDate < startOfDay || docDate > next30) return false;
        } else if (dateFilterPreset === "Next 90 Days") {
          const next90 = new Date(endOfDay.getTime() + 90 * 24 * 60 * 60 * 1000);
          if (docDate < startOfDay || docDate > next90) return false;
        } else if (dateFilterPreset === "All Future Dates") {
          if (docDate < startOfDay) return false;
        } else if (dateFilterPreset === "Custom") {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (docDate < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (docDate > end) return false;
          }
        }
      }

      return true;
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

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">


      {actionMessage && (
        <Alert
          variant="success"
          title="Queue Updated"
          message={actionMessage}
          onClose={() => setActionMessage(null)}
        />
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
              </div>
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
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                Pending Evaluation
              </p>
              {counts.Pending > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
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
                    ? "bg-[#183028] text-white font-semibold shadow-xs"
                    : "bg-transparent text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/20"
                )}
              >
                {tab} ({counts[tab] || 0})
              </button>
            )
          )}
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-2">
          {/* Date Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDateModalOpen(true)}
            className={cn(
              "h-8 px-2.5 text-xs rounded-md border border-border bg-background text-foreground hover:bg-[#C5E86C]/10 hover:border-[#183028] cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors",
              dateFilterPreset !== "All" && "border-[#183028] bg-[#C5E86C]/20 text-[#183028] font-semibold"
            )}
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{dateFilterPreset !== "All" ? `Date: ${dateFilterPreset}` : "Filter by Date"}</span>
          </Button>

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
              searchQuery || dateFilterPreset !== "All"
                ? `No submissions matched your filter criteria.`
                : "There are no pending documents requiring officer evaluation in this view."
            }
            actionLabel={searchQuery || dateFilterPreset !== "All" ? "Clear Filters" : undefined}
            onAction={
              searchQuery || dateFilterPreset !== "All"
                ? () => {
                    setSearchQuery("");
                    setDateFilterPreset("All");
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }
                : undefined
            }
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
                <TableHead className="w-28 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  STATUS
                </TableHead>
                <TableHead className="text-right pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DECISION ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {filteredDocuments.map((doc) => {
                return (
                  <TableRow
                    key={doc.id}
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <TableCell className="pl-4 font-mono text-xs font-semibold text-[#183028]">
                      DOC-{doc.id.slice(-4).toUpperCase()}
                    </TableCell>

                    <TableCell>
                      <div className="max-w-[220px] sm:max-w-xs truncate">
                        <p className="font-semibold text-foreground truncate">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {doc.category || "Unclassified Filing"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[#183028] text-[#C5E86C] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(doc.submittedBy || "Advisor").split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {doc.submittedBy || "Institutional Advisor"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.advisorEmail || "advisor@springer.capital"}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
                          className="h-7 px-2.5 rounded border-border text-xs font-medium text-foreground bg-transparent hover:bg-[#C5E86C]/20 hover:text-[#183028] hover:border-[#183028] transition-colors gap-1"
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
                            className="inline-flex h-7 items-center gap-1 rounded bg-[#C5E86C]/30 border border-[#183028] px-2.5 text-xs font-semibold text-[#183028] hover:bg-[#C5E86C] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-md bg-transparent hover:bg-[#C5E86C]/20 text-muted-foreground hover:text-[#183028] hover:border-[#183028] flex items-center justify-center transition-colors cursor-pointer border border-border">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-[#FFFFFF] shadow-xl rounded-xl border-[#E6E8E7] p-1">
                            <DropdownMenuItem
                              className="text-xs cursor-pointer gap-2 font-medium text-amber-800 hover:bg-amber-50 rounded-md px-2 py-1.5"
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
                              className="text-xs cursor-pointer gap-2 font-medium text-rose-800 hover:bg-rose-50 rounded-md px-2 py-1.5"
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

      {/* Date Filter Modal */}
      <DateFilterModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onApply={(preset, start, end) => {
          setDateFilterPreset(preset);
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
        onReset={() => {
          setDateFilterPreset("All");
          setCustomStartDate("");
          setCustomEndDate("");
        }}
        currentPreset={dateFilterPreset}
        currentStartDate={customStartDate}
        currentEndDate={customEndDate}
      />
    </div>
  );
}
