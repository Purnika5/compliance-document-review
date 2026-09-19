import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * DOCU: Renders an institutional skeleton loading state for Account & Preferences (/settings).
 * Adheres to Springer Capital institutional styling.
 * @returns Skeleton placeholder view for the settings page.
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header Banner Skeleton */}
      <div className="border border-[#E6E8E7] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-lg bg-[#E6E8E7]/80" />
          <Skeleton className="h-4 w-96 max-w-full rounded bg-[#E6E8E7]/50" />
        </div>
      </div>

      {/* Main Settings Form Container Skeleton */}
      <div className="space-y-4">
        {/* Profile & Credentials Section Skeleton */}
        <div className="border border-[#E6E8E7] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          {/* Card Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#E6E8E7]">
            <Skeleton className="h-9 w-9 rounded-lg bg-[#E6E8E7]/70 shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-72 rounded bg-[#E6E8E7]/80" />
              <Skeleton className="h-3 w-80 max-w-full rounded bg-[#E6E8E7]/50" />
            </div>
          </div>

          {/* 2x2 Grid Form Inputs Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Field 1: Full Name */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-9 w-full rounded-xl bg-[#E6E8E7]/50" />
            </div>

            {/* Field 2: Corporate Email */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-9 w-full rounded-xl bg-[#E6E8E7]/50" />
            </div>

            {/* Field 3: Role */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-9 w-full rounded-xl bg-[#FAFBFB] border border-[#E6E8E7]" />
            </div>

            {/* Field 4: Phone */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-9 w-full rounded-xl bg-[#E6E8E7]/50" />
            </div>
          </div>

          {/* Institutional Badges Card Skeleton */}
          <div className="p-4 bg-white border border-[#E6E8E7] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-24 rounded bg-[#E6E8E7]/60" />
                <Skeleton className="h-4 w-28 rounded bg-[#E6E8E7]/80" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Save Bar Skeleton */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Skeleton className="h-9 w-36 rounded-xl bg-[#E6E8E7]/80" />
        </div>
      </div>
    </div>
  );
}
