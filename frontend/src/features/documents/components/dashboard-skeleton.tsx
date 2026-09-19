import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * DOCU: Renders an institutional skeleton loading state for the Advisor Dashboard (/dashboard).
 * Mirrors the Institutional Compliance Analytics KPI section, the Recent Uploads table, and Compliance Calendar.
 * @returns Dashboard skeleton placeholder layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-16 animate-fade-in">
      {/* 1. Institutional Compliance Analytics Section Skeleton */}
      <div className="bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 border border-[#E6E8E7] shadow-2xs">
        {/* Header Title & Upload Button Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-[#E6E8E7]">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-64 rounded bg-[#E6E8E7]/80" />
            <Skeleton className="h-3 w-96 max-w-full rounded bg-[#E6E8E7]/50" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl bg-[#E6E8E7]/70 shrink-0" />
        </div>

        {/* 5 Metric KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 pt-5">
          <div className="rounded-xl p-5 sm:col-span-2 lg:col-span-4 border border-[#E6E8E7] bg-card shadow-xs space-y-2">
            <Skeleton className="h-3 w-28 rounded bg-[#E6E8E7]/60" />
            <Skeleton className="h-10 w-16 rounded bg-[#E6E8E7]/80 mt-2" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl p-4 sm:col-span-1 lg:col-span-2 border border-[#E6E8E7] bg-card shadow-xs space-y-2"
            >
              <Skeleton className="h-3 w-20 rounded bg-[#E6E8E7]/60" />
              <Skeleton className="h-8 w-12 rounded bg-[#E6E8E7]/80 mt-2" />
              <Skeleton className="h-3 w-16 rounded bg-[#E6E8E7]/50" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Elevated Recent Document Uploads (col-span-8) + Calendar (col-span-4) Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left (col-span-8): Recent Document Uploads Skeleton */}
        <div className="lg:col-span-8 bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 border border-[#E6E8E7] shadow-2xs flex flex-col justify-between">
          <div>
            {/* Table Header & View All Uploads Link Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded bg-[#E6E8E7]/80" />
                <Skeleton className="h-3 w-80 max-w-full rounded bg-[#E6E8E7]/50" />
              </div>
              <Skeleton className="h-4 w-28 rounded bg-[#E6E8E7]/60" />
            </div>

            {/* Status Filter Tabs Skeleton */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-3 mb-1">
              <Skeleton className="h-7 w-12 rounded-lg bg-[#E6E8E7]/80" />
              <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/50" />
              <Skeleton className="h-7 w-24 rounded-lg bg-[#E6E8E7]/50" />
              <Skeleton className="h-7 w-18 rounded-lg bg-[#E6E8E7]/50" />
              <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/50" />
            </div>

            {/* Table Skeleton */}
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
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TableRow key={i} className="border-b border-[#E6E8E7] last:border-0">
                      {/* Document Name */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-lg bg-[#E6E8E7]/70 shrink-0" />
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <Skeleton
                              className="h-3.5 rounded bg-[#E6E8E7]/80"
                              style={{ width: `${55 + (i % 4) * 12}%`, maxWidth: "200px" }}
                            />
                            <Skeleton className="h-2.5 w-24 rounded bg-[#E6E8E7]/50" />
                          </div>
                        </div>
                      </TableCell>
                      {/* Doc ID */}
                      <TableCell className="py-3.5 px-3">
                        <Skeleton className="h-3.5 w-16 rounded bg-[#E6E8E7]/70" />
                      </TableCell>
                      {/* Date Uploaded */}
                      <TableCell className="py-3.5 px-3">
                        <Skeleton className="h-3.5 w-20 rounded bg-[#E6E8E7]/60" />
                      </TableCell>
                      {/* File Size */}
                      <TableCell className="py-3.5 px-3">
                        <Skeleton className="h-3.5 w-14 rounded bg-[#E6E8E7]/60" />
                      </TableCell>
                      {/* Status */}
                      <TableCell className="py-3.5 px-3">
                        <Skeleton className="h-5 w-20 rounded-full bg-[#E6E8E7]/70" />
                      </TableCell>
                      {/* Action */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex justify-end">
                          <Skeleton className="h-7 w-7 rounded-lg bg-[#E6E8E7]/60" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Table Footer Skeleton */}
          <div className="pt-3 mt-4 border-t border-[#E6E8E7]">
            <Skeleton className="h-3.5 w-48 rounded bg-[#E6E8E7]/60" />
          </div>
        </div>

        {/* Right (col-span-4): Compliance Calendar Skeleton */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 border border-[#E6E8E7] shadow-2xs">
            <Skeleton className="h-2.5 w-28 rounded bg-[#E6E8E7]/60" />
            <div className="flex items-center justify-between mt-2 mb-4">
              <Skeleton className="h-4 w-32 rounded bg-[#E6E8E7]/80" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-6 w-6 rounded bg-[#E6E8E7]/60" />
                <Skeleton className="h-6 w-6 rounded bg-[#E6E8E7]/60" />
                <Skeleton className="h-6 w-6 rounded bg-[#E6E8E7]/60" />
              </div>
            </div>

            {/* Calendar Weekday Row Skeleton */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                <div key={idx} className="flex justify-center">
                  <Skeleton className="h-3 w-4 rounded bg-[#E6E8E7]/40" />
                </div>
              ))}
            </div>

            {/* Calendar Days Grid Skeleton (35 cells: 7 columns x 5 rows) */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="h-7 w-full rounded-lg bg-[#E6E8E7]/40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
