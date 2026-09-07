"use client";

/**
 * DOCU: Renders the document audit trail and recorded compliance events.
 * Last Updated Date: September 7, 2026
 * @returns The audit trail table view.
 * @author Keith
 */
import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Search, Shield, History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface IAuditLogEntry {
  id: string;
  documentId: string;
  documentTitle: string;
  timestamp: string;
  relativeTime: string;
  user: string;
  role: "Advisor" | "Officer" | "System";
  action: string;
  version: string;
  details: string;
  statusResult?: string;
}

export interface AuditTrailTableProps {
  documentIdFilter?: string;
  entries?: IAuditLogEntry[];
}

/**
 * DOCU: Renders a searchable, printable regulatory audit log table.
 * Last Updated Date: September 7, 2026
 * @param props - Table filter props and optional audit entries.
 * @returns The audit trail table component.
 * @author Keith
 */
export function AuditTrailTable({
  documentIdFilter,
  entries = [],
}: AuditTrailTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeEntries = entries;

  const filteredLogs = activeEntries.filter((entry) => {
    if (documentIdFilter && entry.documentId !== documentIdFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.id.toLowerCase().includes(q) ||
      entry.documentId.toLowerCase().includes(q) ||
      entry.user.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="border border-border bg-card text-card-foreground flex flex-col gap-3 rounded-xl p-3 shadow-xs">
        <div className="flex min-w-0 items-start gap-2">
          <History className="h-4 w-4 text-primary shrink-0" />
          <h3 className="min-w-0 text-xs font-bold leading-tight text-foreground uppercase tracking-wider">
            Read-Only Regulatory Audit Log
          </h3>
          <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
            ({filteredLogs.length} entries)
          </span>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/60 h-8 pl-8 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-8 shrink-0 px-2.5 text-xs font-semibold rounded-md border-border text-foreground hover:bg-muted gap-1 shadow-xs cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export Log</span>
          </Button>
        </div>
      </div>

      {/* Read-Only Table */}
      <div className="hidden rounded-xl border border-border bg-card overflow-hidden text-xs sm:block shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border">
              <TableHead className="w-32 pl-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                TIME & ID
              </TableHead>
              <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                USER & ROLE
              </TableHead>
              <TableHead className="w-36 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                ACTION & VER.
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                REGULATORY RECORD & DETAILS
              </TableHead>
              <TableHead className="w-28 text-right pr-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                STATE
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-border/70 hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-4 font-mono text-[11px]">
                    <div className="font-semibold text-foreground">{log.relativeTime}</div>
                    <div className="text-[10px] text-muted-foreground">{log.id}</div>
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold text-foreground">{log.user}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {log.role}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium text-foreground/90">{log.action}</div>
                    <span className="font-mono text-[10px] text-muted-foreground">{log.version}</span>
                  </TableCell>

                  <TableCell>
                    <p className="text-muted-foreground leading-snug">{log.details}</p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                      Doc: {log.documentId} • {log.timestamp}
                    </p>
                  </TableCell>

                  <TableCell className="text-right pr-4">
                    {log.statusResult && <StatusBadge status={log.statusResult} />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 sm:hidden">
        {filteredLogs.length === 0 ? (
          <div className="border border-border bg-card rounded-xl p-6 text-center text-xs text-muted-foreground">
            No audit log entries found.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <article key={log.id} className="border border-border bg-card space-y-2 rounded-xl p-3 text-xs shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{log.id} · {log.relativeTime}</p>
                </div>
                {log.statusResult && <StatusBadge status={log.statusResult} />}
              </div>
              <div className="border-t border-border/70 pt-2">
                <p className="font-semibold text-foreground/90">{log.user}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{log.role} · {log.version}</p>
              </div>
              <p className="leading-relaxed text-muted-foreground">{log.details}</p>
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/70">Doc: {log.documentId} · {log.timestamp}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
