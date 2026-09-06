"use client";

/**
 * DOCU: Renders the advisor's submitted document list.
 * Last Updated Date: September 7, 2026
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
 * Last Updated Date: September 7, 2026
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
      <div className="neu-surface relative overflow-hidden p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary">
        <div className="flex items-center gap-3">
          <div className="glass-accent h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Advisor Submissions Workspace
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                Portfolio Management
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Submit, track, and manage institutional wealth allocation proposals and compliance filings.
            </p>
          </div>
        </div>

        <Button
          onClick={openModal}
          className="h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-md gap-1.5 shrink-0 shadow-[3px_3px_7px_hsl(215_20%_78%_/_0.7)]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Submit Proposal Document</span>
        </Button>
      </div>

      {actionMessage && (
        <Alert variant="success" title="Action Completed" message={actionMessage} />
      )}

      {/* PROMINENT REVISION REQUEST SURFACING (User Story 2 & 3: Revision unmissable) */}
      {needsRevisionCount > 0 && (
        <div className="relative overflow-hidden neu-soft p-4 rounded-xl border border-amber-300 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-down">
          {/* Animated gradient left strip */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-400 to-amber-400 animate-pulse" />
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-950">
                  {needsRevisionCount} Submission Requires Revision Attention
                </h4>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                  Action Required
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-snug">
                Compliance Officer Alex Smith requested additional beneficial ownership disclosures on{" "}
                <span className="font-semibold">{needsRevisionItems[0]?.title}</span>.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => router.push(`/documents/${needsRevisionItems[0]?.id || "DOC-2026-003"}`)}
            className="h-8 px-3 text-xs font-semibold bg-amber-900 hover:bg-amber-950 text-white rounded gap-1 shrink-0"
          >
            <span>Inspect & Respond</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isDashboardView && (
      <>
      {/* Bento overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div
          onClick={() => setActiveFilter("All")}
          className={cn(
            "neu-soft bg-blue-50/35 rounded-xl p-5 space-y-3 cursor-pointer hover-lift sm:col-span-2 lg:col-span-5 lg:row-span-2 animate-slide-up stagger-1",
            activeFilter === "All" ? "shadow-[inset_3px_3px_7px_hsl(215_20%_78%_/_0.58),inset_-3px_-3px_7px_hsl(0_0%_100%_/_0.86)]" : "hover:shadow-[6px_6px_12px_hsl(215_20%_78%_/_0.72),-6px_-6px_12px_hsl(0_0%_100%_/_0.9)]"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Portfolio activity</p>
              <h3 className="mt-2 text-5xl font-bold tracking-tight text-slate-900">{documents.length}</h3>
              <p className="mt-1 text-xs text-slate-500">Total submissions in your workspace</p>
            </div>
            <div className="neu-inset flex h-11 w-11 items-center justify-center rounded-xl text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-7 border-t border-slate-200/80 pt-3 text-[11px] text-slate-600">
            <span className="font-semibold text-emerald-800">{approvedCount} approved</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span>{pendingCount} awaiting review</span>
          </div>
        </div>

        <div
          onClick={() => setActiveFilter("Pending")}
          className={cn(
            "neu-soft bg-amber-50/45 rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-2",
            activeFilter === "Pending" ? "shadow-[inset_3px_3px_7px_hsl(215_20%_78%_/_0.58),inset_-3px_-3px_7px_hsl(0_0%_100%_/_0.86)]" : "hover:shadow-[6px_6px_12px_hsl(215_20%_78%_/_0.72),-6px_-6px_12px_hsl(0_0%_100%_/_0.9)]"
          )}
        >
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Under review</p><Clock3 className="h-4 w-4 text-amber-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{pendingCount}</h3>
          <p className="text-[11px] text-slate-500">Awaiting officer evaluation</p>
        </div>

        <div
          onClick={() => setActiveFilter("Needs Revision")}
          className={cn(
            "neu-soft bg-pink-50/45 rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-4 animate-slide-up stagger-3",
            activeFilter === "Needs Revision" ? "shadow-[inset_3px_3px_7px_hsl(215_20%_78%_/_0.58),inset_-3px_-3px_7px_hsl(0_0%_100%_/_0.86)]" : "hover:shadow-[6px_6px_12px_hsl(215_20%_78%_/_0.72),-6px_-6px_12px_hsl(0_0%_100%_/_0.9)]"
          )}
        >
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Revisions requested</p><AlertTriangle className="h-4 w-4 text-orange-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{needsRevisionCount}</h3>
          <p className="text-[11px] text-slate-500">Documents needing your attention</p>
        </div>

        <div
          onClick={() => setActiveFilter("Approved")}
          className={cn(
            "neu-soft bg-cyan-50/45 rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-4",
            activeFilter === "Approved" ? "shadow-[inset_3px_3px_7px_hsl(215_20%_78%_/_0.58),inset_-3px_-3px_7px_hsl(0_0%_100%_/_0.86)]" : "hover:shadow-[6px_6px_12px_hsl(215_20%_78%_/_0.72),-6px_-6px_12px_hsl(0_0%_100%_/_0.9)]"
          )}
        >
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Approved</p><CheckCircle2 className="h-4 w-4 text-emerald-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{approvedCount}</h3>
          <p className="text-[11px] text-slate-500">Signed and verified</p>
        </div>

        <div className="neu-soft bg-blue-50/35 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4 hover-lift animate-slide-up stagger-5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Review health</p><span className="text-[10px] font-semibold text-primary">Active</span></div>
          <div className="flex items-end gap-2"><span className="text-3xl font-bold text-slate-900">{completionRate}%</span><span className="pb-1 text-[11px] text-slate-500">approval completion</span></div>
          <div className="neu-inset h-2 overflow-hidden rounded-full"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionRate}%` }} /></div>
        </div>

        <div
          onClick={() => setActiveFilter("Rejected")}
          className={cn(
            "neu-soft bg-rose-50/45 rounded-xl p-4 space-y-2 cursor-pointer hover-lift sm:col-span-1 lg:col-span-3 animate-slide-up stagger-5",
            activeFilter === "Rejected" ? "shadow-[inset_3px_3px_7px_hsl(215_20%_78%_/_0.58),inset_-3px_-3px_7px_hsl(0_0%_100%_/_0.86)]" : "hover:shadow-[6px_6px_12px_hsl(215_20%_78%_/_0.72),-6px_-6px_12px_hsl(0_0%_100%_/_0.9)]"
          )}
        >
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Rejected</p><XCircle className="h-4 w-4 text-rose-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{rejectedCount}</h3>
          <p className="text-[11px] text-slate-500">Not approved for filing</p>
        </div>

        <div className="neu-soft bg-violet-50/45 rounded-xl p-4 space-y-2 sm:col-span-1 lg:col-span-4 hover-lift animate-slide-up stagger-5">
          <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-violet-800 uppercase tracking-wider">Revision rate</p><Percent className="h-4 w-4 text-violet-700" /></div>
          <h3 className="text-3xl font-bold text-slate-900">{revisionRate}%</h3>
          <p className="text-[11px] text-slate-500">Submissions needing changes</p>
        </div>
      </div>
      </>
      )}

      {isDashboardView && <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        <div className="neu-soft rounded-xl bg-white/70 p-4 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submission activity</p>
              <p className="mt-1 text-xs text-slate-500">Documents submitted over the last six months</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="flex h-36 items-end gap-2 border-b border-slate-200 pb-2">
            {monthlyActivity.map((month) => (
              <div key={`${month.label}-${month.count}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-slate-700">{month.count}</span>
                <div className="flex h-24 w-full items-end rounded-t bg-slate-100">
                  <div className="w-full rounded-t bg-primary transition-all" style={{ height: `${(month.count / highestMonthlyActivity) * 100}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="neu-soft rounded-xl bg-white/70 p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Submission calendar</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">{monthLabel}</p>
            </div>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-slate-400">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
            {calendarCells.map((day, index) => (
              <span
                key={day ?? `empty-${index}`}
                className={cn(
                  "flex aspect-square items-center justify-center rounded text-[10px]",
                  day && submissionDays.has(day) ? "bg-primary font-bold text-white" : "text-slate-600"
                )}
              >
                {day}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-500">{submissionDays.size} active submission date{submissionDays.size === 1 ? "" : "s"} this month</p>
        </div>
      </div>}

      {!isDashboardView && <>
      {/* Toolbar: Search and Filter Chips */}
      <div className="neu-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {["All", "Pending", "Needs Revision", "Approved", "Rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap",
                activeFilter === tab
                  ? "bg-slate-900 text-white font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search documents by title, ID, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neu-inset pl-8 h-8 text-xs rounded-md focus-visible:bg-background"
          />
        </div>
      </div>
      </>}

      {!isDashboardView && (
      <>
      {/* Main Submissions Table */}
      <div className="neu-surface rounded-xl overflow-hidden text-xs">
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
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="w-32 pl-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  DOC ID
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  TITLE & CLASSIFICATION
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  DATE SUBMITTED
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  FILE SIZE
                </TableHead>
                <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  STATUS
                </TableHead>
                <TableHead className="text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDocuments.map((doc, rowIdx) => (
                <TableRow
                  key={doc.id}
                  className="hover:bg-slate-50/80 transition-all cursor-pointer border-b border-slate-100 animate-fade-in"
                  style={{ animationDelay: `${rowIdx * 30}ms` }}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                >
                  <TableCell className="pl-4 font-mono font-bold text-slate-900">
                    {doc.id}
                  </TableCell>

                  <TableCell>
                    <div className="border-l-2 border-cyan-400 pl-2 font-bold text-slate-900">{doc.title}</div>
                    <div className="pl-2 text-[10px] text-slate-500 font-medium">
                      {doc.category}
                    </div>
                    <div className="pl-2 text-[10px] text-blue-600/80 font-medium">
                      Submitted by {doc.submittedBy}
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-600 font-mono text-[11px]">
                    {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="font-mono text-slate-500">
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
                        className="h-7 px-2.5 rounded border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg rounded border-slate-200 p-1">
                          <DropdownMenuItem
                            className="text-xs cursor-pointer gap-2 font-medium rounded px-2 py-1.5"
                            onClick={() => router.push(`/documents/${doc.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" /> Open Document
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs cursor-pointer gap-2 font-medium rounded px-2 py-1.5"
                            onClick={() => setEditingDoc(doc)}
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Edit Metadata
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs cursor-pointer gap-2 font-medium rounded px-2 py-1.5"
                            onClick={() => window.print()}
                          >
                            <Download className="h-3.5 w-3.5 text-slate-500" /> Export PDF
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
