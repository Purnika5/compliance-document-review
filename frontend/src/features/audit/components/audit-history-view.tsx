"use client";

/**
 * DOCU: Renders the complete institutional audit history and regulatory ledger using backend API data.
 * Last Updated Date: September 8, 2026
 * @returns The institutional audit history view.
 * @author Keith
 */
import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { authStore } from "@/lib/auth/auth-store";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { auditService } from "@/services/audit.service";
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
import {
  Search,
  History,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuditSkeleton } from "./audit-skeleton";

export interface AuditLedgerEntry {
  id: string;
  hash?: string;
  documentId: string;
  documentTitle: string;
  timestamp: string;
  relativeTime: string;
  user: string;
  role: "Advisor" | "Officer" | "System";
  action: string;
  actionCategory: "Approval" | "Revision" | "AI_Scan" | "Submission" | "Metadata";
  version: string;
  details: string;
  statusResult: "Pending" | "Needs Revision" | "Approved" | "Rejected";
}

export function AuditHistoryView() {
  const searchParams = useSearchParams();
  const documentIdParam = searchParams.get("documentId");

  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession, authStore.getServerSnapshot);
  const isAdvisor = session?.role === "Advisor";
  const docMode = isAdvisor ? "my-submissions" : "queue";

  // Explicitly disable background auto-polling in audit view to prevent glitchy reloads
  const { documents, isPending: isLoadingDocs } = useDocuments(docMode, "All", { pollInterval: 0 });
  const [entries, setEntries] = useState<AuditLedgerEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(true);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(documentIdParam || "");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Adjust search query if documentIdParam changes
  const [prevDocId, setPrevDocId] = useState(documentIdParam);
  if (prevDocId !== documentIdParam) {
    setPrevDocId(documentIdParam);
    if (documentIdParam) {
      setSearchQuery(documentIdParam);
      setCurrentPage(1);
    }
  }

  // Stable document key so we only re-query audit records when document composition actually changes
  const docIdsKey = useMemo(() => documents.map((d) => d.id).sort().join(","), [documents]);

  const loadAuditRecords = useCallback(async (isManualRefresh = false) => {
    if (documents.length === 0) {
      if (!isLoadingDocs) {
        setEntries([]);
        setIsLoadingAudit(false);
        setHasInitiallyLoaded(true);
      }
      return;
    }

    if (isManualRefresh || !hasInitiallyLoaded) {
      setIsLoadingAudit(true);
    }

    try {
      const results = await Promise.all(
        documents.map(async (doc) => {
          try {
            const auditLogs = await auditService.getDocumentAuditTrail(doc.id);
            return auditLogs.map((log, index) => {
              const actionLower = (log.action || "").toLowerCase();
              const notesLower = (log.notes || "").toLowerCase();
              const newStatusStr = (log.new_status || "").toLowerCase();

              // Accurately resolve entry regulatory status
              let statusResult: AuditLedgerEntry["statusResult"] = "Pending";
              if (newStatusStr.includes("approv") || actionLower.includes("approv")) {
                statusResult = "Approved";
              } else if (newStatusStr.includes("revis") || actionLower.includes("revis") || notesLower.includes("needs revision")) {
                statusResult = "Needs Revision";
              } else if (newStatusStr.includes("reject") || actionLower.includes("reject")) {
                statusResult = "Rejected";
              } else if (log.actor_role === "Officer") {
                if (notesLower.includes("approv")) statusResult = "Approved";
                else if (notesLower.includes("reject")) statusResult = "Rejected";
                else statusResult = "Needs Revision";
              } else {
                statusResult = "Pending";
              }

              // Accurately resolve action category
              const category: AuditLedgerEntry["actionCategory"] =
                statusResult === "Approved" || actionLower.includes("approv")
                  ? "Approval"
                  : statusResult === "Needs Revision" || actionLower.includes("revis") || notesLower.includes("revision")
                  ? "Revision"
                  : actionLower.includes("scan") || actionLower.includes("flag")
                  ? "AI_Scan"
                  : actionLower.includes("submit") || log.actor_role === "Advisor"
                  ? "Submission"
                  : "Metadata";

              return {
                id: log.id || `${doc.id}-${index + 1}`,
                documentId: doc.id,
                documentTitle: doc.title,
                timestamp: log.timestamp || doc.submittedAt,
                relativeTime: new Date(log.timestamp || doc.submittedAt).toLocaleDateString(),
                user: log.actor_name || doc.submittedBy,
                role: (log.actor_role as "Advisor" | "Officer" | "System") || "Officer",
                action: log.action || "STATUS_RECORDED",
                actionCategory: category,
                version: "v1.0",
                details: log.notes || `Regulatory action ${log.action} recorded on ${doc.title}.`,
                statusResult,
              } as AuditLedgerEntry;
            });
          } catch {
            return [];
          }
        })
      );

      setEntries(results.flat());
    } catch {
      if (!hasInitiallyLoaded) setEntries([]);
    } finally {
      setIsLoadingAudit(false);
      setHasInitiallyLoaded(true);
    }
  }, [documents, isLoadingDocs, hasInitiallyLoaded]);

  // Fetch audit records once documents are loaded without continuous background polling
  useEffect(() => {
    if (!isLoadingDocs) {
      loadAuditRecords(false);
    }
  }, [docIdsKey, isLoadingDocs]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Filter by Status
      if (statusFilter !== "All" && entry.statusResult !== statusFilter) return false;

      // 2. Search Query matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.id.toLowerCase().includes(q) ||
        entry.documentId.toLowerCase().includes(q) ||
        entry.documentTitle.toLowerCase().includes(q) ||
        entry.user.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.statusResult.toLowerCase().includes(q) ||
        entry.role.toLowerCase().includes(q) ||
        (entry.hash?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [entries, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const handleExportCsv = () => {
    if (filteredEntries.length === 0) return;

    const headers = ["Log ID", "Hash", "Timestamp", "User", "Role", "Action", "Document ID", "Details", "Status"];
    const rows = filteredEntries.map((e) => [
      `"${e.id || ""}"`,
      `"${e.hash || ""}"`,
      `"${e.timestamp || ""}"`,
      `"${(e.user || "").replace(/"/g, '""')}"`,
      `"${e.role || ""}"`,
      `"${(e.action || "").replace(/"/g, '""')}"`,
      `"${e.documentId || ""}"`,
      `"${(e.details || "").replace(/"/g, '""')}"`,
      `"${e.statusResult || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `springer_regulatory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const isLoaded = hasInitiallyLoaded || (!isLoadingDocs && !isLoadingAudit);

  if (!isLoaded) {
    return <AuditSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16 print:space-y-0 print:pb-0 print:max-w-none print:w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E8E7] pb-4 print:border-none">
        <div>
          <h1 className="text-xl font-bold text-[#183028] tracking-tight">
            {isAdvisor ? "Submission Audit Trail" : "Regulatory Audit Ledger"}
          </h1>
          <p className="text-xs text-[#183028]/60 mt-1">
            {isAdvisor
              ? "Chronological audit trail and immutable event history for your document submissions."
              : "Cryptographically verified, immutable record of all compliance determinations and workflow transitions."}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs border border-[#E6E8E7] bg-white hover:bg-[#C5E86C]/20 hover:border-[#183028] text-[#183028] font-semibold gap-1.5 cursor-pointer rounded-xl shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#183028]/60" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs border border-[#E6E8E7] bg-white hover:bg-[#C5E86C]/20 hover:border-[#183028] text-[#183028] font-semibold gap-1.5 cursor-pointer rounded-xl shadow-2xs transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-[#183028]/60" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="border border-[#E6E8E7] bg-white rounded-xl overflow-hidden shadow-2xs print:border-none print:shadow-none print:rounded-none">
        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-[#E6E8E7] bg-[#FAFBFB] flex flex-col md:flex-row items-start md:items-center justify-between gap-2 print:hidden">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#183028]/50" />
            <Input
              placeholder="Search by ID, User, Action, or Details..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-white border border-[#E6E8E7] text-[#183028] placeholder:text-[#183028]/45 rounded-xl focus-visible:ring-1 focus-visible:ring-[#183028] shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter select */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 text-xs rounded-xl border border-[#E6E8E7] bg-white text-[#183028] focus:outline-hidden focus:ring-1 focus:ring-[#183028] cursor-pointer shadow-2xs font-medium"
              title="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto print:overflow-visible">
          {!isLoaded ? (
            <div className="p-4">
              <LoadingState variant="table" rows={6} />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={History}
                title="No audit ledger records found"
                description={
                  searchQuery.trim()
                    ? "No audit records match your search criteria."
                    : "No regulatory events have been recorded in the audit trail yet."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAFBFB] border-b border-[#E6E8E7]">
                  <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70 pl-4">
                    TIMESTAMP &amp; EVENT ID
                  </TableHead>
                  <TableHead className="w-44 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                    USER &amp; ROLE
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                    REGULATORY RECORD
                  </TableHead>
                  <TableHead className="w-28 text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-[#183028]/70">
                    STATE
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedEntries.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-[#E6E8E7] hover:bg-[#C5E86C]/10 transition-colors"
                  >
                    {/* Timestamp & Event ID */}
                    <TableCell className="pl-4 py-2 font-mono text-[11px]">
                      <div className="font-semibold text-[#183028]">{log.relativeTime}</div>
                      <div className="text-[10px] text-[#183028]/50">{log.id}</div>
                    </TableCell>

                    {/* User & Role */}
                    <TableCell className="py-2">
                      <div className="font-semibold text-[#183028] text-xs">{log.user}</div>
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-lg border inline-block",
                          log.role === "Officer"
                            ? "bg-[#C5E86C]/20 text-[#183028] border-[#C5E86C]"
                            : log.role === "Advisor"
                            ? "bg-[#E6E8E7]/50 text-[#183028] border-[#E6E8E7]"
                            : "bg-[#183028]/10 text-[#183028] border-[#183028]/20"
                        )}
                      >
                        {log.role}
                      </span>
                    </TableCell>


                    {/* Regulatory Record Details */}
                    <TableCell className="py-2">
                      <p className="text-xs text-[#183028]/70 leading-snug">{log.details}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#183028]/60 font-mono">
                        <span className="text-[#183028] font-semibold">{log.documentId}</span>
                        <span>·</span>
                        <span className="truncate max-w-[260px]">{log.documentTitle}</span>
                        <span>·</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </TableCell>

                    {/* Status Result */}
                    <TableCell className="text-right pr-4 py-2">
                      <StatusBadge status={log.statusResult} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination Controls */}
        {isLoaded && filteredEntries.length > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-[#E6E8E7] bg-[#FAFBFB] text-xs text-[#183028]/60 print:hidden">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length} records
              {statusFilter !== "All" && ` • ${statusFilter}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-7 px-2 text-xs rounded-lg border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-xs text-[#183028]">{currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-7 px-2 text-xs rounded-lg border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
