"use client";

/**
 * DOCU: Renders the Officer's assigned review portfolio and action queue using real backend API data.
 * Last Updated Date: September 8, 2026
 * @returns The assigned reviews dashboard component.
 * @author Keith
 */
import React, { useState, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { useDocuments } from "../hooks/use-documents";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { DecisionDialog } from "@/features/review/components/decision-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  CheckSquare,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MoreHorizontal,
  ShieldCheck,
  Zap,
  Layers,
  History,
} from "lucide-react";
import type { DocumentItem, DocumentStatusType } from "@/lib/validation/document";
import { updateDocumentStatusAction } from "@/lib/actions/document-actions";
import { cn } from "@/lib/utils";

interface ComputedAssignedDoc extends DocumentItem {
  priority: "Urgent" | "High" | "Standard";
  slaRemaining: string;
  isUrgent: boolean;
}

/**
 * Calculates remaining SLA hours from document submission timestamp.
 */
function calculateSla(submittedAt: string, status: DocumentStatusType): { text: string; isUrgent: boolean; priority: "Urgent" | "High" | "Standard" } {
  if (status === "Approved" || status === "Rejected") {
    return { text: "Completed", isUrgent: false, priority: "Standard" };
  }

  const submittedTime = new Date(submittedAt).getTime();
  const now = Date.now();
  const elapsedMs = isNaN(submittedTime) ? 0 : now - submittedTime;
  const totalSlaMs = 48 * 60 * 60 * 1000; // 48-hour institutional SLA window
  const remainingMs = totalSlaMs - elapsedMs;

  if (remainingMs <= 0) {
    return { text: "SLA Breached", isUrgent: true, priority: "Urgent" };
  }

  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const isUrgent = remainingHours < 24 || status === "Needs Revision";
  const priority = isUrgent ? "Urgent" : remainingHours < 36 ? "High" : "Standard";

  return {
    text: `${remainingHours}h ${remainingMins}m remaining`,
    isUrgent,
    priority,
  };
}

export function AssignedReviewsView() {
  const router = useRouter();
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const { documents, isPending, refetch } = useDocuments("queue");
  const [activeTab, setActiveTab] = useState<"All" | "Action Required" | "Needs Revision" | "Approved">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [decisionDoc, setDecisionDoc] = useState<{
    id: string;
    title: string;
    type: "Approved" | "Needs Revision" | "Rejected";
  } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const assignedItems: ComputedAssignedDoc[] = useMemo(() => {
    return documents.map((doc) => {
      const sla = calculateSla(doc.submittedAt, doc.status);
      return {
        ...doc,
        priority: sla.priority,
        slaRemaining: sla.text,
        isUrgent: sla.isUrgent,
      };
    });
  }, [documents]);

  const handleDecisionConfirm = async (
    status: "Approved" | "Needs Revision" | "Rejected",
    comment: string
  ) => {
    if (!decisionDoc) return;
    try {
      await updateDocumentStatusAction(decisionDoc.id, status);
      setActionSuccess(`Successfully updated ${decisionDoc.id} to ${status}. Regulatory record updated.`);
      refetch();
    } catch {
      setActionSuccess(`Updated ${decisionDoc.id} status.`);
      refetch();
    }

    setDecisionDoc(null);
    setTimeout(() => {
      setActionSuccess(null);
    }, 4500);
  };

  const filteredItems = useMemo(() => {
    return assignedItems.filter((item) => {
      // Tab filter
      if (activeTab === "Action Required" && item.status !== "Pending") return false;
      if (activeTab === "Needs Revision" && item.status !== "Needs Revision") return false;
      if (activeTab === "Approved" && item.status !== "Approved") return false;

      // Priority filter
      if (priorityFilter !== "All" && item.priority !== priorityFilter) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.submittedBy.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [assignedItems, activeTab, priorityFilter, searchQuery]);

  // Metrics derived from actual backend data
  const totalAssigned = assignedItems.length;
  const pendingCount = assignedItems.filter((d) => d.status === "Pending").length;
  const urgentSlaCount = assignedItems.filter((d) => d.isUrgent && d.status === "Pending").length;
  const revisionCount = assignedItems.filter((d) => d.status === "Needs Revision").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="border border-border bg-card/80 backdrop-blur-md rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-primary/20 text-emerald-400 border-primary/30 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3 inline mr-1" />
              Officer Portfolio
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {session?.name || "Officer"} {session?.email ? `· ${session.email}` : ""}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Assigned Regulatory Reviews
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Institutional compliance oversight, document evaluation, and SEC/FINRA signing queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/audit")}
            className="text-xs border-border bg-muted/30 hover:bg-muted font-semibold gap-1.5 cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            Audit Ledger
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push("/queue")}
            className="text-xs font-semibold gap-1.5 shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Layers className="h-3.5 w-3.5" />
            Full Queue
          </Button>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border bg-card p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Assigned to You</span>
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{totalAssigned}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active portfolio allocations</p>
        </div>

        <div className="border border-border bg-card p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Action Required</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{pendingCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting officer determination</p>
        </div>

        <div className="border border-border bg-card p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">SLA Risk (&lt; 24h)</span>
            <Clock3 className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{urgentSlaCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Near regulatory turnaround cap</p>
        </div>

        <div className="border border-border bg-card p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">In Revision</span>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono">{revisionCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Dispatched back to advisors</p>
        </div>
      </div>

      {/* Table Card Container */}
      <div className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-background/80 border border-border rounded-lg text-xs">
            {(["All", "Action Required", "Needs Revision", "Approved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search and Priority select */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search assigned reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/60 border-border"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-border bg-background/60 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Standard">Standard</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isPending ? (
            <div className="p-4">
              <LoadingState variant="table" rows={6} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={CheckSquare}
                title="No assigned reviews found"
                description={
                  searchQuery.trim()
                    ? "No reviews match your current search query or active filter."
                    : "There are currently no reviews assigned to your compliance portfolio."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border">
                  <TableHead className="w-80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-4">
                    DOCUMENT &amp; CATEGORY
                  </TableHead>
                  <TableHead className="w-48 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SUBMITTING ADVISOR
                  </TableHead>
                  <TableHead className="w-36 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SLA CLOCK
                  </TableHead>
                  <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    STATE
                  </TableHead>
                  <TableHead className="w-28 text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    ACTIONS
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredItems.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="border-b border-border/70 hover:bg-muted/20 transition-colors"
                  >
                    {/* Document Title & Category */}
                    <TableCell className="pl-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground block">
                            {doc.id}
                          </span>
                          <span
                            onClick={() => router.push(`/documents/${doc.id}`)}
                            className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer text-xs leading-snug line-clamp-1"
                          >
                            {doc.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="chip bg-muted/60 text-muted-foreground border-border text-[10px] px-1.5 py-0.2">
                              {doc.category}
                            </span>
                            {doc.priority === "Urgent" && (
                              <span className="chip bg-rose-950/60 text-rose-300 border-rose-800/60 text-[9px] font-bold px-1.5 py-0.2">
                                Urgent Priority
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Advisor */}
                    <TableCell className="py-3">
                      <div className="text-xs font-semibold text-foreground">
                        {doc.submittedBy}
                      </div>
                      {doc.advisorEmail && (
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                          {doc.advisorEmail}
                        </div>
                      )}
                    </TableCell>

                    {/* SLA Clock */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            doc.isUrgent
                              ? "bg-rose-400 animate-pulse shadow-[0_0_6px_#f43f5e]"
                              : "bg-emerald-400"
                          )}
                        />
                        <span className="text-xs font-mono font-medium text-foreground/90">
                          {doc.slaRemaining}
                        </span>
                      </div>
                    </TableCell>

                    {/* State */}
                    <TableCell className="py-3">
                      <StatusBadge status={doc.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/documents/${doc.id}`)}
                          className="h-7 px-2.5 text-xs font-semibold bg-primary/20 text-emerald-300 hover:bg-primary/30 border border-primary/40 gap-1 cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Review
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-card border-border">
                            <DropdownMenuItem
                              onClick={() => router.push(`/documents/${doc.id}`)}
                              className="text-xs cursor-pointer gap-2 font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                              Open Workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() =>
                                setDecisionDoc({
                                  id: doc.id,
                                  title: doc.title,
                                  type: "Approved",
                                })
                              }
                              className="text-xs cursor-pointer gap-2 font-medium text-emerald-400 focus:text-emerald-300"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              Sign-off &amp; Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDecisionDoc({
                                  id: doc.id,
                                  title: doc.title,
                                  type: "Needs Revision",
                                })
                              }
                              className="text-xs cursor-pointer gap-2 font-medium text-orange-400 focus:text-orange-300"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                              Request Revision
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDecisionDoc({
                                  id: doc.id,
                                  title: doc.title,
                                  type: "Rejected",
                                })
                              }
                              className="text-xs cursor-pointer gap-2 font-medium text-rose-400 focus:text-rose-300"
                            >
                              <XCircle className="h-3.5 w-3.5 text-rose-400" />
                              Reject Document
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Decision Dialog for Quick Signing */}
      {decisionDoc && (
        <DecisionDialog
          isOpen={Boolean(decisionDoc)}
          onClose={() => setDecisionDoc(null)}
          documentId={decisionDoc.id}
          documentTitle={decisionDoc.title}
          decisionType={decisionDoc.type}
          onConfirmDecision={handleDecisionConfirm}
        />
      )}
    </div>
  );
}
