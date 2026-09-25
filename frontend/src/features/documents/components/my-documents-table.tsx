"use client";

/**
 * DOCU: Renders the advisor's submitted document list adhering to dark mode.
 * Last Updated Date: September 8, 2026
 * @returns The submissions table view.
 * @author Keith
 */
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDocuments } from "../hooks/use-documents";
import { useUploadDocument } from "../hooks/use-upload-document";
import { UploadDocumentModal } from "./upload-document-modal";
import { EditDocumentModal } from "./edit-document-modal";
import { ResubmitRevisionModal } from "./resubmit-revision-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { isScannedFile } from "@/lib/scanned-files";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast";
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
  History,
  Edit3,
  Download,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  XCircle,
  CalendarDays,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Lock,
} from "lucide-react";
import type { DocumentItem } from "@/lib/validation/document";
import { cn } from "@/lib/utils";
import { MetricLineChart } from "@/components/shared/metric-line-chart";
import { showInfoToast } from "@/components/ui/toast";
import { FileTypeIcon } from "@/components/shared/file-type-icon";
import { ComplianceCalendar, type DateFilterPreset } from "./compliance-calendar";
import { generateMetricTrends } from "../utils/metric-trend.util";
import { SubmissionsSkeleton } from "./submissions-skeleton";
import { DashboardSkeleton } from "./dashboard-skeleton";

export interface MyDocumentsTableProps {
  view?: "dashboard" | "register";
}

/**
 * DOCU: Renders the authenticated advisor's document submissions.
 * Last Updated Date: September 17, 2026
 * @returns The submissions table view.
 * @author Keith
 */
export function MyDocumentsTable({ view }: MyDocumentsTableProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (pathname === "/submissions" && tabParam === "dashboard") {
      router.replace("/dashboard");
    }
  }, [pathname, tabParam, router]);

  const isRegisterMode = view
    ? view === "register"
    : tabParam === "register" || (pathname === "/submissions" && tabParam !== "dashboard");

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
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [resubmitDoc, setResubmitDoc] = useState<DocumentItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const getDocFileSize = (doc: DocumentItem, index: number) => {
    if (doc.fileSize) return doc.fileSize;
    const sizes = ["2.4 MB", "1.8 MB", "4.2 MB", "850 KB", "3.1 MB", "1.2 MB"];
    return sizes[index % sizes.length];
  };

  // Unified Date Filter State (Managed via ComplianceCalendar)
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");


  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Needs Revision" && doc.status === "Needs Revision") ||
      (activeFilter === "Pending" && doc.status === "Pending") ||
      (activeFilter === "Approved" && doc.status === "Approved") ||
      (activeFilter === "Rejected" && doc.status === "Rejected");

    const docDate = new Date(doc.submittedAt);



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

  // Active date preset and dynamic time-series calculation
  const activeDatePreset = dateFilterPreset !== "All" ? dateFilterPreset : (dateFilter as DateFilterPreset);

  const activePresetTitle = React.useMemo(() => {
    if (dateFilterPreset === "Custom" && (customStartDate || customEndDate)) {
      return `${customStartDate || "Start"} to ${customEndDate || "Now"}`;
    }
    return dateFilterPreset !== "All" ? dateFilterPreset : "All Time";
  }, [dateFilterPreset, customStartDate, customEndDate]);

  const trendData = React.useMemo(() => {
    return generateMetricTrends(
      documents,
      dateFilterPreset,
      customStartDate,
      customEndDate
    );
  }, [documents, dateFilterPreset, customStartDate, customEndDate]);

  // Metric counts dynamically tied to active date filter/selection
  const metricVolume = trendData.total[trendData.total.length - 1] ?? 0;
  const metricPending = trendData.pending[trendData.pending.length - 1] ?? 0;
  const metricRevision = trendData.needsRevision[trendData.needsRevision.length - 1] ?? 0;
  const metricApproved = trendData.approved[trendData.approved.length - 1] ?? 0;
  const metricRejected = trendData.rejected[trendData.rejected.length - 1] ?? 0;
  const metricThroughput = trendData.throughput[trendData.throughput.length - 1] ?? 0;

  // Fallback counts for other calculations
  const pendingCount = metricPending;
  const approvedCount = metricApproved;
  const needsRevisionCount = metricRevision;
  const rejectedCount = metricRejected;
  const completionRate = metricVolume ? Math.round((approvedCount / metricVolume) * 100) : 0;
  const revisionRate = metricVolume ? Math.round((needsRevisionCount / metricVolume) * 100) : 0;
  const reviewedCount = approvedCount + rejectedCount;
  const reviewRate = metricThroughput;

  const handleSaveEdit = (updated: Partial<DocumentItem> & { id: string }) => {
    const target = documents.find((d) => d.id === updated.id);
    if (target) {
      if (updated.title) target.title = updated.title;
      if (updated.category) target.category = updated.category;
      if (updated.status) target.status = updated.status;
      showSuccessToast("Document Updated", "Document metadata updated successfully.");
      refetch();
    }
  };

  if (isPending) {
    return isRegisterMode ? <SubmissionsSkeleton /> : <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16">





      {/* Submissions Section: Full Register View or Elevated Recent Filings Overview */}
      {isRegisterMode ? (
        /* Full Register View Mode */
        <div className="space-y-3 bg-[#FFFFFF] p-5 rounded-2xl border border-[#E6E8E7] shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="h-8 px-3 rounded-xl text-xs font-semibold border border-[#E6E8E7] bg-white hover:bg-[#C5E86C] hover:border-[#C5E86C] text-black hover:text-black gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-black" />
                <span className="text-black font-semibold">Back to Dashboard</span>
              </Button>
              <div>
                <h3 className="text-sm font-bold text-[#183028]">Document Uploads</h3>
                <p className="text-xs text-[#183028]/65">Filter, search, and manage all uploaded documents and compliance filings</p>
              </div>
            </div>


          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#E6E8E7]">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {["All", "Pending", "Needs Revision", "Approved", "Rejected"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveFilter(tab);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                    activeFilter === tab
                      ? "bg-[#183028] text-white shadow-xs"
                      : "text-[#183028] hover:bg-[#C5E86C]/20"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {dateFilterPreset !== "All" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFilterPreset("All");
                    setDateFilter("All");
                    setCustomStartDate("");
                    setCustomEndDate("");
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2.5 text-xs rounded-xl border-[#E6E8E7] bg-[#C5E86C]/20 text-[#183028] hover:bg-[#C5E86C]/30 cursor-pointer font-semibold"
                >
                  <span>Date: {dateFilterPreset} (Clear)</span>
                </Button>
              )}

              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#183028]/50" />
                <Input
                  placeholder="Search documents by title, ID, or category..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-8 text-xs rounded-xl border-[#E6E8E7] bg-[#FFFFFF] text-[#183028] placeholder:text-[#183028]/40 focus:border-[#183028]"
                />
              </div>
            </div>
          </div>

          {/* Full Table */}
          <div className="overflow-x-auto rounded-xl border border-[#E6E8E7] bg-[#FFFFFF] shadow-2xs">
            <Table className="w-full bg-[#FFFFFF] border-collapse">
              <TableHeader className="bg-[#FFFFFF] border-b border-[#E6E8E7]">
                <TableRow className="border-b border-[#E6E8E7] bg-[#FFFFFF] hover:bg-[#FFFFFF]">
                  <TableHead className="py-3 px-4 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[38%] min-w-[220px]">
                    DOCUMENT NAME
                  </TableHead>
                  <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[14%] whitespace-nowrap">
                    DOC ID
                  </TableHead>
                  <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[16%] whitespace-nowrap">
                    DATE UPLOADED
                  </TableHead>
                  <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                    FILE SIZE
                  </TableHead>
                  <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                    STATUS
                  </TableHead>
                  <TableHead className="py-3 px-4 text-right font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[8%] whitespace-nowrap">
                    ACTION
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-[#FFFFFF] divide-y divide-[#E6E8E7]">
                {paginatedDocuments.length === 0 ? (
                  <TableRow className="bg-[#FFFFFF] hover:bg-transparent">
                    <TableCell colSpan={6} className="py-12 px-4 text-center">
                      <EmptyState
                        icon={Search}
                        title={searchQuery || activeFilter !== "All" || dateFilterPreset !== "All" ? "No Matching Submissions" : "No Submissions Recorded"}
                        description={
                          searchQuery || activeFilter !== "All" || dateFilterPreset !== "All"
                            ? "No document submissions matched your search query or selected filter criteria."
                            : "You have not submitted any compliance documents yet. Click below to initiate your first filing."
                        }
                        actionLabel={
                          searchQuery || activeFilter !== "All" || dateFilterPreset !== "All"
                            ? "Clear Filters"
                            : "Upload Document"
                        }
                        onAction={
                          searchQuery || activeFilter !== "All" || dateFilterPreset !== "All"
                            ? () => {
                              setSearchQuery("");
                              setActiveFilter("All");
                              setDateFilterPreset("All");
                            }
                            : openModal
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocuments.map((doc, idx) => (
                    <TableRow
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="bg-[#FFFFFF] hover:bg-[#E6E8E7]/35 border-b border-[#E6E8E7] last:border-0 cursor-pointer text-xs transition-colors"
                    >
                      <TableCell className="py-3.5 px-4 text-left">
                        <div className="flex items-center gap-3">
                          <FileTypeIcon title={doc.title} category={doc.category} />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#183028] leading-snug truncate max-w-[200px] sm:max-w-[260px]">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-[#183028]/60 mt-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                              {doc.category || "Compliance Document"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-3 font-mono font-medium text-[#183028]/70 text-xs whitespace-nowrap">
                        DOC-{(doc.id || "0000").slice(-4).toUpperCase()}
                      </TableCell>
                      <TableCell className="py-3.5 px-3 text-[#183028]/70 text-xs whitespace-nowrap">
                        {new Date(doc.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="py-3.5 px-3 font-mono font-medium text-[#183028]/70 text-xs whitespace-nowrap">
                        {getDocFileSize(doc, idx)}
                      </TableCell>
                      <TableCell className="py-3.5 px-3 whitespace-nowrap">
                        {doc.status === "Approved" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C5E86C]/35 text-[#183028] border border-[#C5E86C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#183028]" />
                            Approved
                          </span>
                        ) : doc.status === "Pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        ) : doc.status === "Needs Revision" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-950 border border-orange-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Needs Revision
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-950 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Rejected
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/documents/${doc.id}`)}
                            className="p-1.5 rounded-lg text-[#183028]/50 hover:text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer transition-colors inline-flex items-center justify-center"
                            title="View Document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E6E8E7] text-xs text-[#183028]/60">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredDocuments.length)} of {filteredDocuments.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-7 px-2 text-xs rounded-lg border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20"
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-xs text-[#183028]">{currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-7 px-2 text-xs rounded-lg border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Institutional Compliance Analytics Section */}
          <div className="bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 border border-[#E6E8E7] shadow-2xs">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-5 border-b border-[#E6E8E7]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#183028] tracking-tight">
                    Institutional Compliance Analytics
                  </h2>

                </div>
                <p className="text-xs text-[#183028]/65 mt-0.5">
                  Filing velocity, regulatory turnaround, and document classification trends
                </p>
              </div>

              {/* Upload Document Action */}
              <div className="flex items-center gap-2.5">
                <Button
                  onClick={openModal}
                  size="sm"
                  data-tour="advisor-upload"
                  className="h-8 px-3.5 rounded-xl bg-[#183028] text-white hover:bg-[#183028]/90 font-semibold text-xs gap-1.5 shadow-2xs transition-all cursor-pointer border border-[#183028]"
                >
                  <Plus className="h-3.5 w-3.5 text-[#C5E86C]" />
                  <span>Upload Document</span>
                </Button>
              </div>
            </div>

              <div
                data-tour="advisor-statistics"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 pt-5"
              >
                {/* Total Submissions */}
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group hover:border-[#183028]/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                        Review Queue Volume
                      </p>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">{metricVolume}</h3>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">Total submissions</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full">
                    <MetricLineChart
                      value={metricVolume}
                      data={trendData.total}
                      labels={trendData.labels}
                      color="#0284c7"
                      height={36}
                    />
                  </div>
                </div>

                {/* Pending Review */}
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group hover:border-amber-400/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider truncate">
                        Pending Evaluation
                      </p>
                      {metricPending > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">{metricPending}</h3>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">Needs action</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full">
                    <MetricLineChart
                      value={metricPending}
                      data={trendData.pending}
                      labels={trendData.labels}
                      color="#d97706"
                      height={36}
                    />
                  </div>
                </div>

                {/* Needs Revision / High Priority */}
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group hover:border-orange-400/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider truncate">
                        Action Required (Revisions)
                      </p>
                      {metricRevision > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">{metricRevision}</h3>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">Awaiting advisor</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full">
                    <MetricLineChart
                      value={metricRevision}
                      data={trendData.needsRevision}
                      labels={trendData.labels}
                      color="#ea580c"
                      height={36}
                    />
                  </div>
                </div>

                {/* Approved Records */}
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group hover:border-emerald-400/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider truncate">
                        Approved &amp; Verified
                      </p>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">{metricApproved}</h3>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">Audit compliant</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full">
                    <MetricLineChart
                      value={metricApproved}
                      data={trendData.approved}
                      labels={trendData.labels}
                      color="#16a34a"
                      height={36}
                    />
                  </div>
                </div>

                {/* Review Throughput */}
                <div className="rounded-xl p-4 border border-border bg-card shadow-xs flex flex-col justify-between group hover:border-emerald-400/50 transition-all">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                        Review throughput
                      </p>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">{metricThroughput}%</h3>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">Processed</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full">
                    <MetricLineChart
                      value={metricThroughput}
                      data={trendData.throughput}
                      labels={trendData.labels}
                      type="percent"
                      color="#10b981"
                      height={36}
                    />
                  </div>
                </div>
              </div>


          </div>

          {/* Elevated Recent Document Uploads (Left 8) + Sidebar (Right 4: Calendar & Workspace Tools) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left (col-span-8): Recent Document Uploads (Elevated to top) */}
            <div className="lg:col-span-8 bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 border border-[#E6E8E7] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#183028]">
                      Document Uploads
                    </h3>
                    <p className="text-xs text-[#183028]/65 mt-0.5">
                      Direct document uploads and real-time compliance review tracking
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push("/submissions")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#183028] hover:text-[#183028]/80 cursor-pointer transition-colors"
                    >
                      <span>View All Uploads</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Filter Tabs & Search */}
                <div data-tour="advisor-status-filter" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-1">
                  <div className="flex items-center space-x-1 overflow-x-auto">
                    {["All", "Pending", "Needs Revision", "Approved", "Rejected"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveFilter(tab);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap",
                          activeFilter === tab
                            ? "bg-[#183028] text-white shadow-xs"
                            : "text-[#183028] hover:bg-[#C5E86C]/20"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#183028]/50" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 h-8 text-xs rounded-xl border-[#E6E8E7] bg-[#FFFFFF] text-[#183028] placeholder:text-[#183028]/40 focus:border-[#183028]"
                    />
                  </div>
                </div>

                <div data-tour="advisor-view-files" className="overflow-x-auto rounded-xl border border-[#E6E8E7] bg-[#FFFFFF] shadow-2xs">
                  <Table className="w-full bg-[#FFFFFF] border-collapse">
                    <TableHeader className="bg-[#FFFFFF] border-b border-[#E6E8E7]">
                      <TableRow className="border-b border-[#E6E8E7] bg-[#FFFFFF] hover:bg-[#FFFFFF]">
                        <TableHead className="py-3 px-4 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[38%] min-w-[220px]">
                          DOCUMENT NAME
                        </TableHead>
                        <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[14%] whitespace-nowrap">
                          DOC ID
                        </TableHead>
                        <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[16%] whitespace-nowrap">
                          DATE UPLOADED
                        </TableHead>
                        <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                          FILE SIZE
                        </TableHead>
                        <TableHead className="py-3 px-3 text-left font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[12%] whitespace-nowrap">
                          STATUS
                        </TableHead>
                        <TableHead className="py-3 px-4 text-right font-bold text-[10px] uppercase tracking-wider text-[#183028]/60 w-[8%] whitespace-nowrap">
                          ACTION
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-[#FFFFFF] divide-y divide-[#E6E8E7]">
                      {filteredDocuments.length > 0 ? (
                        filteredDocuments.slice(0, 6).map((doc, idx) => (
                          <TableRow
                            key={doc.id}
                            onClick={() => router.push(`/documents/${doc.id}`)}
                            className="bg-[#FFFFFF] hover:bg-[#E6E8E7]/35 border-b border-[#E6E8E7] last:border-0 cursor-pointer text-xs transition-colors"
                          >
                            <TableCell className="py-3.5 px-4 text-left">
                              <div className="flex items-center gap-3">
                                <FileTypeIcon title={doc.title} category={doc.category} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-[#183028] leading-snug truncate max-w-[200px] sm:max-w-[260px]">
                                      {doc.title}
                                    </p>
                                    {isScannedFile(doc.fileName || doc.title) && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#C5E86C]/40 text-[#183028] border border-[#C5E86C] shrink-0" title="Scanned via Springer Neural Copilot">
                                        <span className="h-1 w-1 rounded-full bg-[#183028]" />
                                        Scanned
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#183028]/60 mt-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                                    {doc.category || "Compliance Document"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 px-3 font-mono font-medium text-[#183028]/70 text-xs whitespace-nowrap">
                              DOC-{(doc.id || "0000").slice(-4).toUpperCase()}
                            </TableCell>
                            <TableCell className="py-3.5 px-3 text-[#183028]/70 text-xs whitespace-nowrap">
                              {new Date(doc.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </TableCell>
                            <TableCell className="py-3.5 px-3 font-mono font-medium text-[#183028]/70 text-xs whitespace-nowrap">
                              {getDocFileSize(doc, idx)}
                            </TableCell>
                            <TableCell className="py-3.5 px-3 whitespace-nowrap">
                              {doc.status === "Approved" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C5E86C]/35 text-[#183028] border border-[#C5E86C]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#183028]" />
                                  Approved
                                </span>
                              ) : doc.status === "Pending" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  Pending
                                </span>
                              ) : doc.status === "Needs Revision" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-950 border border-orange-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                  Needs Revision
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-950 border border-rose-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Rejected
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => router.push(`/documents/${doc.id}?tab=audit`)}
                                  className="p-1.5 rounded-lg text-[#183028]/50 hover:text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer transition-colors inline-flex items-center justify-center"
                                  title="View Audit Trail"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/documents/${doc.id}`)}
                                  className="p-1.5 rounded-lg text-[#183028]/50 hover:text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer transition-colors inline-flex items-center justify-center"
                                  title="View Document"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow className="bg-[#FFFFFF]">
                          <TableCell colSpan={6} className="py-10 text-center text-xs text-[#183028]/60">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <p className="font-semibold text-[#183028]">
                                {searchQuery
                                  ? `No documents matching "${searchQuery}".`
                                  : activeFilter !== "All"
                                    ? `No ${activeFilter.toLowerCase()} documents found.`
                                    : "No documents uploaded yet."}
                              </p>
                              {searchQuery ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSearchQuery("")}
                                  className="h-7.5 text-xs rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
                                >
                                  Clear Search
                                </Button>
                              ) : activeFilter !== "All" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveFilter("All")}
                                  className="h-7.5 text-xs rounded-xl border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer"
                                >
                                  Clear Filter
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-[#E6E8E7] text-xs text-[#183028]/60 flex items-center justify-between">
                <span>
                  Showing {Math.min(filteredDocuments.length, 6)} of {filteredDocuments.length} uploads
                  {activeFilter !== "All" && ` • ${activeFilter}`}
                </span>
              </div>
            </div>

            {/* Right (col-span-4): Compliance Calendar */}
            <div data-tour="dashboard-date-filter" className="lg:col-span-4 space-y-3.5">
              <ComplianceCalendar
                documents={documents}
                activePreset={dateFilterPreset}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onSelectPreset={(preset) => {
                  setDateFilterPreset(preset);
                  setDateFilter(preset);
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setCurrentPage(1);
                }}
                onSelectCustomRange={(start, end) => {
                  setDateFilterPreset("Custom");
                  setDateFilter("Custom");
                  setCustomStartDate(start);
                  setCustomEndDate(end);
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setDateFilterPreset("All");
                  setDateFilter("All");
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
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
    </div>
  );
}
