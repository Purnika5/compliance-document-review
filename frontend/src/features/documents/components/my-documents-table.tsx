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
import { ResubmitRevisionModal } from "./resubmit-revision-modal";
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
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
} from "lucide-react";
import type { DocumentItem } from "@/lib/validation/document";
import { cn } from "@/lib/utils";
import { showInfoToast } from "@/components/ui/toast";
import { DateFilterModal, type DateFilterPreset } from "./date-filter-modal";

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
  const [dateFilter, setDateFilter] = useState<string>("All");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [resubmitDoc, setResubmitDoc] = useState<DocumentItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Date Filter Modal & Range States
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  const baseDate = new Date();
  const viewedCalendarDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + calendarMonthOffset, 1);
  const currentMonth = viewedCalendarDate.getMonth();
  const currentYear = viewedCalendarDate.getFullYear();
  const monthLabel = viewedCalendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Needs Revision" && doc.status === "Needs Revision") ||
      (activeFilter === "Pending" && doc.status === "Pending") ||
      (activeFilter === "Approved" && doc.status === "Approved") ||
      (activeFilter === "Rejected" && doc.status === "Rejected");

    const docDate = new Date(doc.submittedAt);

    // Filter by calendar selected day
    if (selectedDay !== null) {
      if (
        docDate.getDate() !== selectedDay ||
        docDate.getMonth() !== currentMonth ||
        docDate.getFullYear() !== currentYear
      ) {
        return false;
      }
    }

    // Filter by date filter preset or dropdown
    const activePreset = dateFilterPreset !== "All" ? dateFilterPreset : (dateFilter as DateFilterPreset);

    if (activePreset !== "All") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (activePreset === "Today") {
        if (docDate < startOfDay || docDate > endOfDay) return false;
      } else if (activePreset === "Past 7 Days" || activePreset === "This Week") {
        const past7 = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (docDate < past7 || docDate > endOfDay) return false;
      } else if (activePreset === "Past 30 Days" || activePreset === "This Month") {
        const past30 = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (docDate < past30 || docDate > endOfDay) return false;
      } else if (activePreset === "Past 90 Days") {
        const past90 = new Date(startOfDay.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (docDate < past90 || docDate > endOfDay) return false;
      } else if (activePreset === "Past Year") {
        const past365 = new Date(startOfDay.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (docDate < past365 || docDate > endOfDay) return false;
      } else if (activePreset === "All Past Dates") {
        if (docDate >= startOfDay) return false;
      } else if (activePreset === "Next 7 Days") {
        const next7 = new Date(endOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (docDate < startOfDay || docDate > next7) return false;
      } else if (activePreset === "Next 30 Days") {
        const next30 = new Date(endOfDay.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (docDate < startOfDay || docDate > next30) return false;
      } else if (activePreset === "Next 90 Days") {
        const next90 = new Date(endOfDay.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (docDate < startOfDay || docDate > next90) return false;
      } else if (activePreset === "All Future Dates") {
        if (docDate < startOfDay) return false;
      } else if (activePreset === "Custom") {
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

    if (!searchQuery.trim()) return matchesFilter;
    const q = searchQuery.toLowerCase();
    return (
      matchesFilter &&
      (doc.title.toLowerCase().includes(q) ||
        doc.id.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredDocuments.length / pageSize) || 1;
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = documents.filter((d) => d.status === "Pending").length;
  const approvedCount = documents.filter((d) => d.status === "Approved").length;
  const needsRevisionItems = documents.filter((d) => d.status === "Needs Revision");
  const needsRevisionCount = needsRevisionItems.length;
  const rejectedCount = documents.filter((d) => d.status === "Rejected").length;
  const completionRate = documents.length ? Math.round((approvedCount / documents.length) * 100) : 0;
  const revisionRate = documents.length ? Math.round((needsRevisionCount / documents.length) * 100) : 0;
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
          className="h-8 px-3 text-xs font-semibold bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 active:bg-[#1d8342] text-white rounded-md gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
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
          {/* Bento overview: 1 Big Card (left) + 6 Uniform Cards (3x2 right grid) */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* 1 Bigger Card (Left Side) */}
            <div
              onClick={() => {
                setActiveFilter("All");
                setCurrentPage(1);
              }}
              className={cn(
                "rounded-xl p-5 space-y-3 cursor-pointer hover-lift lg:col-span-4 animate-slide-up stagger-1 border bg-card relative overflow-hidden group flex flex-col justify-between min-h-[220px]",
                activeFilter === "All"
                  ? "border-primary/70 bg-primary/5 shadow-xs"
                  : "border-border hover:border-border/80"
              )}
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Portfolio activity</p>
                    <h3 className="mt-2 text-5xl font-bold tracking-tight text-foreground font-mono">{documents.length}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Total submissions in your workspace</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-6 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-400">{approvedCount} approved</span>
                <span className="mx-1.5 text-muted-foreground/40">/</span>
                <span>{pendingCount} awaiting review</span>
              </div>

              {/* Sparkline background */}
              <div className="absolute bottom-0 left-0 w-full h-24 pointer-events-none">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
                  <path d="M0,30 L0,18 C15,10 25,25 40,20 C55,15 70,26 85,14 C90,10 95,18 100,12 L100,30 Z" fill="currentColor" fillOpacity="0.08" />
                  <path d="M0,18 C15,10 25,25 40,20 C55,15 70,26 85,14 C90,10 95,18 100,12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* 4 Status Stat Cards (Right Side: 2 cols x 2 rows) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Under Review */}
              <div
                onClick={() => {
                  setActiveFilter("Pending");
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-xl p-4 cursor-pointer hover-lift animate-slide-up stagger-2 border bg-card relative overflow-hidden group flex flex-col justify-between h-[104px]",
                  activeFilter === "Pending"
                    ? "border-amber-500/70 bg-amber-950/20 shadow-xs"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Under review</p>
                    <Clock3 className="h-4 w-4 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground font-mono">{pendingCount}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting officer evaluation</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-amber-500">
                    <path d="M0,30 L0,22 C12,18 25,26 38,15 C50,4 65,20 75,12 C85,4 92,16 100,10 L100,30 Z" fill="currentColor" fillOpacity="0.08" />
                    <path d="M0,22 C12,18 25,26 38,15 C50,4 65,20 75,12 C85,4 92,16 100,10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Revisions Requested */}
              <div
                onClick={() => {
                  setActiveFilter("Needs Revision");
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-xl p-4 cursor-pointer hover-lift animate-slide-up stagger-3 border bg-card relative overflow-hidden group flex flex-col justify-between h-[104px]",
                  activeFilter === "Needs Revision"
                    ? "border-orange-500/70 bg-orange-950/20 shadow-xs"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Revisions requested</p>
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground font-mono">{needsRevisionCount}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Documents needing attention</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-orange-500">
                    <path d="M0,30 L0,15 C15,5 25,25 40,18 C55,11 70,22 85,8 C90,3 95,12 100,6 L100,30 Z" fill="currentColor" fillOpacity="0.08" />
                    <path d="M0,15 C15,5 25,25 40,18 C55,11 70,22 85,8 C90,3 95,12 100,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card 3: Approved */}
              <div
                onClick={() => {
                  setActiveFilter("Approved");
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-xl p-4 cursor-pointer hover-lift animate-slide-up stagger-4 border bg-card relative overflow-hidden group flex flex-col justify-between h-[104px]",
                  activeFilter === "Approved"
                    ? "border-emerald-500/70 bg-emerald-950/20 shadow-xs"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Approved</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground font-mono">{approvedCount}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Signed and verified</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
                    <path d="M0,30 L0,25 C20,20 30,10 50,15 C70,20 80,5 100,2 L100,30 Z" fill="currentColor" fillOpacity="0.08" />
                    <path d="M0,25 C20,20 30,10 50,15 C70,20 80,5 100,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Rejected */}
              <div
                onClick={() => {
                  setActiveFilter("Rejected");
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-xl p-4 cursor-pointer hover-lift animate-slide-up stagger-5 border bg-card relative overflow-hidden group flex flex-col justify-between h-[104px]",
                  activeFilter === "Rejected"
                    ? "border-rose-500/70 bg-rose-950/20 shadow-xs"
                    : "border-border hover:border-border/80"
                )}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Rejected</p>
                    <XCircle className="h-4 w-4 text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground font-mono">{rejectedCount}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Not approved for filing</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 pointer-events-none">
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-rose-500">
                    <path d="M0,30 L0,25 C15,10 30,30 45,15 C60,5 75,25 90,10 L100,20 L100,30 Z" fill="currentColor" fillOpacity="0.08" />
                    <path d="M0,25 C15,10 30,30 45,15 C60,5 75,25 90,10 L100,20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
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
          <div className="rounded-xl bg-card border border-border p-4 lg:col-span-3 flex flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Submission calendar</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs font-semibold text-foreground">{monthLabel}</p>
                    {calendarMonthOffset !== 0 && (
                      <button
                        onClick={() => setCalendarMonthOffset(0)}
                        className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold cursor-pointer hover:bg-emerald-900"
                      >
                        Today
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsDateModalOpen(true)}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-950/50 cursor-pointer transition-colors"
                    title="Open Date Filter Modal"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-muted-foreground/70 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarCells.map((day, index) => {
                  if (!day) {
                    return <span key={`empty-${index}`} className="flex aspect-square items-center justify-center rounded text-[10px]" />;
                  }

                  const isHasSubmission = submissionDays.has(day);
                  const isSelected = selectedDay === day;

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => {
                        setSelectedDay((prev) => (prev === day ? null : day));
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded text-[10px] transition-all cursor-pointer font-medium relative group",
                        isSelected
                          ? "bg-[#062a20] text-[#54d0a2] ring-2 ring-emerald-400 font-bold shadow-md scale-105"
                          : isHasSubmission
                          ? "bg-primary text-primary-foreground font-bold shadow-xs hover:scale-105 hover:bg-emerald-600"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                      title={isHasSubmission ? `Submissions recorded on ${day} ${monthLabel}` : `Filter by ${day} ${monthLabel}`}
                    >
                      {day}
                      {isHasSubmission && !isSelected && (
                        <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Date Filter Bar */}
            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10px]">
              {selectedDay !== null ? (
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-emerald-400">
                    Filtered: {monthLabel.split(" ")[0]} {selectedDay}, {currentYear} ({filteredDocuments.length} doc{filteredDocuments.length === 1 ? "" : "s"})
                  </span>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline ml-2"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  Click any calendar date to filter submissions by day
                </span>
              )}
            </div>
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
                  onClick={() => {
                    setActiveFilter(tab);
                    setCurrentPage(1);
                  }}
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Date Filter Modal Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDateModalOpen(true)}
                className={cn(
                  "h-8 px-2.5 text-xs font-medium border-border gap-1.5 cursor-pointer whitespace-nowrap",
                  dateFilterPreset !== "All"
                    ? "bg-[#062a20] text-[#54d0a2] border-emerald-700/60 font-semibold shadow-xs"
                    : "bg-background/60 text-foreground hover:bg-muted"
                )}
              >
                <Filter className="h-3.5 w-3.5 text-emerald-400" />
                <span>{dateFilterPreset !== "All" ? `Date: ${dateFilterPreset}` : "Date Filter Modal"}</span>
              </Button>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setDateFilterPreset("All");
                  setSelectedDay(null);
                  setCurrentPage(1);
                }}
                className="h-8 px-2.5 text-xs rounded-md border border-border bg-background/60 text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Submission Dates</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search title, ID, category..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-8 text-xs rounded-md bg-background border-border text-foreground"
                />
              </div>
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
              <>
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
                    {paginatedDocuments.map((doc, rowIdx) => (
                      <TableRow
                        key={doc.id}
                        className="hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50 animate-fade-in"
                        style={{ animationDelay: `${rowIdx * 25}ms` }}
                        onClick={() => router.push(`/documents/${doc.id}`)}
                      >
                        <TableCell className="pl-4 py-2 font-mono font-semibold text-foreground">
                          {doc.id}
                        </TableCell>

                        <TableCell className="py-2">
                          <div className="border-l-2 border-emerald-500 pl-2 font-medium text-foreground text-xs">{doc.title}</div>
                          <div className="pl-2 text-[10px] text-muted-foreground font-medium">
                            {doc.category}
                          </div>
                          <div className="pl-2 text-[10px] text-emerald-400/90 font-medium">
                            Submitted by {doc.submittedBy}
                          </div>
                        </TableCell>

                        <TableCell className="py-2 text-muted-foreground font-mono text-[11px]">
                          {new Date(doc.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>

                        <TableCell className="py-2 font-mono text-muted-foreground text-xs">
                          {doc.fileSize || "2.4 MB"}
                        </TableCell>

                        <TableCell className="py-2">
                          <StatusBadge status={doc.status} />
                        </TableCell>

                        <TableCell className="py-2 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {doc.status === "Needs Revision" && (
                              <Button
                                size="sm"
                                onClick={() => setResubmitDoc(doc)}
                                className="h-7 px-2.5 rounded text-xs font-semibold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 transition-colors gap-1 shadow-2xs"
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>Resubmit</span>
                              </Button>
                            )}

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
                                {doc.status === "Needs Revision" && (
                                  <DropdownMenuItem
                                    className="text-xs cursor-pointer gap-2 font-semibold rounded-md px-2 py-1.5 text-amber-300 hover:bg-amber-950/50 transition-colors"
                                    onClick={() => setResubmitDoc(doc)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5 text-amber-400" /> Resubmit Revision
                                  </DropdownMenuItem>
                                )}
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
                                  onClick={() => {
                                    if (doc.fileUrl) {
                                      const link = document.createElement('a');
                                      link.href = doc.fileUrl;
                                      link.download = `${doc.title || 'document'}.pdf`;
                                      link.target = '_blank';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } else {
                                      showInfoToast("PDF not available for export.");
                                    }
                                  }}
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

                {/* Pagination Controls Bar */}
                <div className="p-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <div className="text-muted-foreground">
                    Showing <span className="font-semibold text-foreground font-mono">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-semibold text-foreground font-mono">{Math.min(currentPage * pageSize, filteredDocuments.length)}</span> of{" "}
                    <span className="font-semibold text-foreground font-mono">{filteredDocuments.length}</span> submissions
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-[11px]">Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-7 px-2 text-xs rounded border border-border bg-background/60 text-foreground cursor-pointer focus:outline-hidden"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        className="h-7 px-2 text-xs border-border bg-transparent hover:bg-[#062a20] hover:text-[#54d0a2] hover:border-emerald-800/60 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                        Previous
                      </Button>

                      <span className="px-2 font-mono text-xs text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        className="h-7 px-2 text-xs border-border bg-transparent hover:bg-[#062a20] hover:text-[#54d0a2] hover:border-emerald-800/60 disabled:opacity-40 cursor-pointer"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
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

      <ResubmitRevisionModal
        documentItem={resubmitDoc}
        isOpen={!!resubmitDoc}
        onClose={() => setResubmitDoc(null)}
        onSuccess={() => refetch()}
      />

      <DateFilterModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onApply={(preset, start, end) => {
          setDateFilterPreset(preset);
          setCustomStartDate(start);
          setCustomEndDate(end);
          setSelectedDay(null);
          setCurrentPage(1);
        }}
        onReset={() => {
          setDateFilterPreset("All");
          setDateFilter("All");
          setCustomStartDate("");
          setCustomEndDate("");
          setSelectedDay(null);
          setCurrentPage(1);
        }}
        currentPreset={dateFilterPreset}
        currentStartDate={customStartDate}
        currentEndDate={customEndDate}
      />
    </div>
  );
}
