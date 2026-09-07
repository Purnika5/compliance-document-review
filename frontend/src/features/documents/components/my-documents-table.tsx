"use client";

/**
 * DOCU: Renders the advisor's submitted document list adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The submissions table view.
 * @author Keith
 */
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDocuments } from "../hooks/use-documents";
import { useUploadDocument } from "../hooks/use-upload-document";
import { UploadDocumentModal } from "./upload-document-modal";
import { EditDocumentModal } from "./edit-document-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Download,
  Folder,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  BarChart3,
  XCircle,
  Percent,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import type { DocumentItem } from "@/lib/validation/document";
import { cn } from "@/lib/utils";

/**
 * DOCU: Renders the authenticated advisor's document submissions.
 * Last Updated Date: September 8, 2026
 * @returns The submissions table view.
 * @author Keith
 */
export function MyDocumentsTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("tab") || "dashboard";
  const isDashboardView = activeView === "dashboard";
  const { documents, isPending, refetch } = useDocuments("my-submissions");
  const {
    isOpen,
    openModal,
    closeModal,
    isPending: isUploading,
    error,
    submitUpload,
  } = useUploadDocument(() => {
    refetch();
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Needs Revision" && doc.status === "Needs Revision") ||
      (activeFilter === "Pending" && doc.status === "Pending") ||
      (activeFilter === "Approved" && doc.status === "Approved") ||
      (activeFilter === "Rejected" && doc.status === "Rejected");

    if (!searchQuery.trim()) return matchesFilter;
    const q = searchQuery.toLowerCase();
    return (
      matchesFilter &&
      (doc.title.toLowerCase().includes(q) ||
        doc.id.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q))
    );
  });

  const pendingCount = documents.filter((d) => d.status === "Pending").length;
  const approvedCount = documents.filter((d) => d.status === "Approved").length;
  const needsRevisionItems = documents.filter((d) => d.status === "Needs Revision");
  const needsRevisionCount = needsRevisionItems.length;
  const rejectedCount = documents.filter((d) => d.status === "Rejected").length;
  const completionRate = documents.length ? Math.round((approvedCount / documents.length) * 100) : 0;
  const revisionRate = documents.length ? Math.round((needsRevisionCount / documents.length) * 100) : 0;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthLabel = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const submissionDays = new Set(
    documents
      .map((document) => new Date(document.submittedAt))
      .filter((submittedDate) => submittedDate.getMonth() === currentMonth && submittedDate.getFullYear() === currentYear)
      .map((submittedDate) => submittedDate.getDate())
  );
  const calendarCells = Array.from({ length: firstDayOffset + daysInCurrentMonth }, (_, index) =>
    index < firstDayOffset ? null : index - firstDayOffset + 1
  );
  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(currentYear, currentMonth - (5 - index), 1);
    const monthDocuments = documents.filter((document) => {
      const submittedDate = new Date(document.submittedAt);
      return submittedDate.getMonth() === monthDate.getMonth() && submittedDate.getFullYear() === monthDate.getFullYear();
    });
    return {
      label: monthDate.toLocaleDateString(undefined, { month: "short" }),
      count: monthDocuments.length,
    };
  });
  const highestMonthlyActivity = Math.max(...monthlyActivity.map((month) => month.count), 1);

  const handleSaveEdit = (updated: Partial<DocumentItem> & { id: string }) => {
    const target = documents.find((d) => d.id === updated.id);
    if (target) {
      if (updated.title) target.title = updated.title;
      if (updated.category) target.category = updated.category;
      if (updated.status) target.status = updated.status;
      setActionMessage(`Updated document ${updated.id} metadata successfully.`);
      refetch();
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* Advisor Header Bar */}
      <div className="relative overflow-hidden p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-foreground tracking-tight">
                Advisor Submissions Workspace
              </h1>
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                Portfolio Management
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Submit, track, and manage institutional wealth allocation proposals and compliance filings.
            </p>
          </div>
        </div>

        <Button
          onClick={openModal}
          className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md gap-1.5 shrink-0 shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Submit Proposal Document</span>
        </Button>
      </div>

      {actionMessage && (
        <Alert variant="success" title="Action Completed" message={actionMessage} />
      )}

      {/* PROMINENT REVISION REQUEST SURFACING */}
      {needsRevisionCount > 0 && (
        <div className="relative overflow-hidden p-4 rounded-xl border border-orange-800/60 bg-orange-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down shadow-xs">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-amber-500 animate-pulse" />
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-orange-900/50 border border-orange-700/60 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-orange-200">
                  {needsRevisionCount} Submission Requires Revision Attention
                </h4>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-900/70 text-orange-200 border border-orange-700/60">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-orange-300/80 mt-0.5 leading-snug">
                Compliance requested revisions on{" "}
                <span className="font-semibold text-orange-100">{needsRevisionItems[0]?.title}</span>.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (needsRevisionItems[0]?.id) {
                router.push(`/documents/${needsRevisionItems[0].id}`);
              }
            }}
            className="h-8 px-3 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded gap-1 shrink-0 shadow-xs cursor-pointer"
          >
            <span>Inspect &amp; Respond</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isDashboardView && (
        <>
          {/* Bento overview */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            {/* Total Submissions Card */}
            <div
              onClick={() => setActiveFilter("All")}
              className={cn(
                "rounded-xl p-5 space-y-3 cursor-pointer hover-lift sm:col-span-2 lg:col-span-5 lg:row-span-2 animate-slide-up stagger-1 border bg-card",
                activeFilter === "All"
                  ? "border-primary/70 bg-primary/5 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio activity</p>
                  <h3 className="mt-2 text-5xl font-bold tracking-tight text-foreground">{documents.length}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Total submissions in your workspace</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-emerald-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-7 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-400">{approvedCount} approved</span>
                <span className="mx-1.5 text-muted-foreground/40">/</span>
                <span>{pendingCount} awaiting review</span>
              </div>
            </div>

            {/* Pending Card */}
            <div
              onClick={() => setActiveFilter("Pending")}
              className={cn(
                "rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-2 border bg-card",
                activeFilter === "Pending"
                  ? "border-amber-500/70 bg-amber-950/20 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Under review</p>
                <Clock3 className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">{pendingCount}</h3>
              <p className="text-[11px] text-muted-foreground">Awaiting officer evaluation</p>
            </div>

            {/* Needs Revision Card */}
            <div
              onClick={() => setActiveFilter("Needs Revision")}
              className={cn(
                "rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-4 animate-slide-up stagger-3 border bg-card",
                activeFilter === "Needs Revision"
                  ? "border-orange-500/70 bg-orange-950/20 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Revisions requested</p>
                <AlertTriangle className="h-4 w-4 text-orange-400" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">{needsRevisionCount}</h3>
              <p className="text-[11px] text-muted-foreground">Documents needing your attention</p>
            </div>

            {/* Approved Card */}
            <div
              onClick={() => setActiveFilter("Approved")}
              className={cn(
                "rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-4 border bg-card",
                activeFilter === "Approved"
                  ? "border-emerald-500/70 bg-emerald-950/20 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Approved</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">{approvedCount}</h3>
              <p className="text-[11px] text-muted-foreground">Signed and verified</p>
            </div>

            {/* Review Health Card */}
            <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4 hover-lift animate-slide-up stagger-5 border border-border bg-card">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Review health</p>
                <span className="text-[10px] font-semibold text-emerald-400">Active</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                <span className="pb-1 text-[11px] text-muted-foreground">approval completion</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            {/* Rejected Card */}
            <div
              onClick={() => setActiveFilter("Rejected")}
              className={cn(
                "rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-5 border bg-card",
                activeFilter === "Rejected"
                  ? "border-rose-500/70 bg-rose-950/20 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Rejected</p>
                <XCircle className="h-4 w-4 text-rose-400" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">{rejectedCount}</h3>
              <p className="text-[11px] text-muted-foreground">Not approved for filing</p>
            </div>

            {/* Revision Rate Card */}
            <div className="rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4 hover-lift animate-slide-up stagger-5 border border-border bg-card">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Revision rate</p>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">{revisionRate}%</h3>
              <p className="text-[11px] text-muted-foreground">Submissions needing changes</p>
            </div>
          </div>
        </>
      )}

      {isDashboardView && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
          {/* Submission Activity Chart */}
          <div className="rounded-xl bg-card border border-border p-4 lg:col-span-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submission activity</p>
                <p className="mt-1 text-xs text-muted-foreground">Documents submitted over the last six months</p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex h-36 items-end gap-2 border-b border-border pb-2">
              {monthlyActivity.map((month) => (
                <div key={`${month.label}-${month.count}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-bold text-foreground">{month.count}</span>
                  <div className="flex h-24 w-full items-end rounded-t bg-muted">
                    <div className="w-full rounded-t bg-primary transition-all duration-500" style={{ height: `${(month.count / highestMonthlyActivity) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{month.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Calendar */}
          <div className="rounded-xl bg-card border border-border p-4 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submission calendar</p>
                <p className="mt-1 text-xs font-semibold text-foreground">{monthLabel}</p>
              </div>
              <CalendarDays className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-muted-foreground/70">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
              {calendarCells.map((day, index) => (
                <span
                  key={day ?? `empty-${index}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded text-[10px]",
                    day && submissionDays.has(day)
                      ? "bg-primary font-bold text-primary-foreground shadow-xs"
                      : "text-muted-foreground"
                  )}
                >
                  {day}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">{submissionDays.size} active submission date{submissionDays.size === 1 ? "" : "s"} this month</p>
          </div>
        </div>
      )}

      {!isDashboardView && (
        <>
          {/* Toolbar: Search and Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-border">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {["All", "Pending", "Needs Revision", "Approved", "Rejected"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap",
                    activeFilter === tab
                      ? "bg-[#062a20] text-[#54d0a2] font-semibold shadow-xs"
                      : "bg-transparent text-muted-foreground hover:text-[#54d0a2] hover:bg-[#062a20]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search documents by title, ID, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-md bg-background border-border text-foreground"
              />
            </div>
          </div>

          {/* Main Submissions Table */}
          <div className="rounded-xl overflow-hidden text-xs border border-border bg-card shadow-xs">
            {isPending ? (
              <LoadingState rows={5} />
            ) : filteredDocuments.length === 0 ? (
              <EmptyState
                title="No Documents Found"
                description={
                  searchQuery
                    ? `No proposals matched "${searchQuery}".`
                    : "Submit your first wealth allocation document or compliance proposal to begin evaluation."
                }
                actionLabel="Submit Document"
                onAction={openModal}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40">
                    <TableHead className="w-32 pl-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      DOC ID
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      TITLE &amp; CLASSIFICATION
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      DATE SUBMITTED
                    </TableHead>
                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      FILE SIZE
                    </TableHead>
                    <TableHead className="w-28 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      STATUS
                    </TableHead>
                    <TableHead className="text-right pr-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      ACTION
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredDocuments.map((doc, rowIdx) => (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50 animate-fade-in"
                      style={{ animationDelay: `${rowIdx * 25}ms` }}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                    >
                      <TableCell className="pl-4 font-mono font-semibold text-foreground">
                        {doc.id}
                      </TableCell>

                      <TableCell>
                        <div className="border-l-2 border-emerald-500 pl-2 font-medium text-foreground">{doc.title}</div>
                        <div className="pl-2 text-[10px] text-muted-foreground font-medium">
                          {doc.category}
                        </div>
                        <div className="pl-2 text-[10px] text-emerald-400/90 font-medium">
                          Submitted by {doc.submittedBy}
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground">
                        {doc.fileSize || "2.4 MB"}
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
                            <span>View</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-7 w-7 rounded-md bg-transparent hover:bg-[#062a20] text-muted-foreground hover:text-[#54d0a2] hover:border-emerald-800/60 flex items-center justify-center transition-colors cursor-pointer border border-border">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 bg-card shadow-xl rounded-xl border-border p-1">
                              <DropdownMenuItem
                                className="text-xs cursor-pointer gap-2 font-medium rounded-md px-2 py-1.5 text-foreground/90 hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors"
                                onClick={() => router.push(`/documents/${doc.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Open Document
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs cursor-pointer gap-2 font-medium rounded-md px-2 py-1.5 text-foreground/90 hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors"
                                onClick={() => setEditingDoc(doc)}
                              >
                                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs cursor-pointer gap-2 font-medium rounded-md px-2 py-1.5 text-foreground/90 hover:bg-[#062a20] hover:text-[#54d0a2] transition-colors"
                                onClick={() => window.print()}
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" /> Export PDF
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
        </>
      )}

      {/* Modals */}
      <UploadDocumentModal
        isOpen={isOpen}
        onClose={closeModal}
        onUpload={submitUpload}
        isPending={isUploading}
        error={error}
      />

      <EditDocumentModal
        document={editingDoc}
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
