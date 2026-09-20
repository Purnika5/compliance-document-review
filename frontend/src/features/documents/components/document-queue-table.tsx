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
import { MetricLineChart } from "@/components/shared/metric-line-chart";
import { generateMetricTrends } from "../utils/metric-trend.util";

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
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const { documents, isPending, refetch, counts: queueCounts } = useDocuments("queue", activeTab);
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

  const trendData = React.useMemo(() => {
    return generateMetricTrends(
      documents,
      dateFilterPreset,
      customStartDate,
      customEndDate
    );
  }, [documents, dateFilterPreset, customStartDate, customEndDate]);

  const handleDecisionExecution = async (
    status: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => {
    if (!decisionDoc) return;
    const docDisplayId = `DOC-${decisionDoc.id.slice(-4).toUpperCase()}`;
    try {
      await updateDocumentStatusAction(decisionDoc.id, status, comment);
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

  const queueVolume = dateFilterPreset !== "All" ? (trendData.total[trendData.total.length - 1] ?? 0) : (queueCounts?.All ?? documents.length);
  const queuePending = dateFilterPreset !== "All" ? (trendData.pending[trendData.pending.length - 1] ?? 0) : (queueCounts?.Pending ?? documents.filter((d) => d.status === "Pending").length);
  const queueRevision = dateFilterPreset !== "All" ? (trendData.needsRevision[trendData.needsRevision.length - 1] ?? 0) : (queueCounts?.["Needs Revision"] ?? documents.filter((d) => d.status === "Needs Revision").length);
  const queueApproved = dateFilterPreset !== "All" ? (trendData.approved[trendData.approved.length - 1] ?? 0) : (queueCounts?.Approved ?? documents.filter((d) => d.status === "Approved").length);
  const queueThroughput = dateFilterPreset !== "All" ? (trendData.throughput[trendData.throughput.length - 1] ?? 0) : (queueVolume ? Math.round(((queueApproved + (queueCounts?.Rejected ?? documents.filter((d) => d.status === "Rejected").length)) / queueVolume) * 100) : 0);

  const counts: Record<FilterTab, number> = {
    All: queueVolume,
    Pending: queuePending,
    "Needs Revision": queueRevision,
    Approved: queueApproved,
    Rejected: dateFilterPreset !== "All"
      ? (trendData.rejected[trendData.rejected.length - 1] ?? 0)
      : (queueCounts?.Rejected ?? documents.filter((d) => d.status === "Rejected").length),
  };

  if (isPending) {
    return <QueueSkeleton />;
  }

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

      {/* Structured Institutional Back-Office Metric Cards (Balanced 5-Column Grid) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Total in Queue */}
        <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Review Queue Volume
              </p>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{queueVolume}</h3>
              <span className="text-[11px] text-muted-foreground font-medium truncate">Total in queue</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <MetricLineChart
              value={queueVolume}
              data={trendData.total}
              labels={trendData.labels}
              color="#0284c7"
              height={36}
            />
          </div>
        </div>

        {/* Pending Review */}
        <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider truncate">
                Pending Evaluation
              </p>
              {queuePending > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{queuePending}</h3>
              <span className="text-[11px] text-muted-foreground font-medium truncate">Needs action</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <MetricLineChart
              value={queuePending}
              data={trendData.pending}
              labels={trendData.labels}
              color="#d97706"
              height={36}
            />
          </div>
        </div>

        {/* Needs Revision / High Priority */}
        <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider truncate">
                Action Required (Revisions)
              </p>
              {queueRevision > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{queueRevision}</h3>
              <span className="text-[11px] text-muted-foreground font-medium truncate">Awaiting advisor</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <MetricLineChart
              value={queueRevision}
              data={trendData.needsRevision}
              labels={trendData.labels}
              color="#ea580c"
              height={36}
            />
          </div>
        </div>

        {/* Approved Records */}
        <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider truncate">
                Approved &amp; Verified
              </p>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{queueApproved}</h3>
              <span className="text-[11px] text-muted-foreground font-medium truncate">Audit compliant</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <MetricLineChart
              value={queueApproved}
              data={trendData.approved}
              labels={trendData.labels}
              color="#16a34a"
              height={36}
            />
          </div>
        </div>

        {/* Review Throughput */}
        <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Review throughput
              </p>
              <Percent className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{queueThroughput}%</h3>
              <span className="text-[11px] text-muted-foreground font-medium truncate">Processed</span>
            </div>
          </div>
          <div className="mt-3 w-full">
            <MetricLineChart
              value={queueThroughput}
              data={trendData.throughput}
              labels={trendData.labels}
              type="percent"
              color="#10b981"
              height={36}
            />
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
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                  activeTab === tab
                    ? "bg-[#C5E86C] text-[#183028] font-bold shadow-xs"
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
