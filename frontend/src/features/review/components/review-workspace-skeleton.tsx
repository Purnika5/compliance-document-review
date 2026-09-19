/**
 * DOCU: Renders an institutional skeleton loading layout for the document review workspace.
 * Matches the 3-zone layout (Metadata, Document Viewer Canvas, and Document Feedback).
 * Last Updated Date: September 18, 2026
 * @returns Skeleton placeholder view for the review workspace.
 * @author Keith
 */
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ReviewWorkspaceSkeleton() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12 animate-pulse">
      {/* Top Header & Context Bar Skeleton */}
      <div className="border border-[#E6E8E7] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-8 w-36 rounded-xl bg-[#E6E8E7]/70 shrink-0" />
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-44 rounded bg-[#E6E8E7]/70" />
              <Skeleton className="h-5 w-18 rounded-full bg-[#E6E8E7]/60" />
            </div>
            <Skeleton className="h-3 w-64 rounded bg-[#E6E8E7]/50 hidden sm:block" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-24 rounded-xl bg-[#E6E8E7]/70" />
        </div>
      </div>

      {/* 3-Zone Workspace Skeleton Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ========================================================================= */}
        {/* ZONE 1 (LEFT 2 COLS): Document Metadata & Tabs Skeleton                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 border border-[#E6E8E7] bg-white rounded-2xl p-4 flex flex-col justify-between min-h-[740px] shadow-2xs space-y-4">
          <div className="space-y-5">
            {/* Tab Pills Skeleton */}
            <div className="flex rounded-xl bg-[#E6E8E7]/40 p-1 gap-1">
              <Skeleton className="h-7 flex-1 rounded-lg bg-[#E6E8E7]/80" />
              <Skeleton className="h-7 flex-1 rounded-lg bg-[#E6E8E7]/50" />
            </div>

            {/* Metadata Fields Skeleton */}
            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-16 bg-[#E6E8E7]/60 rounded" />
                <Skeleton className="h-4 w-20 bg-[#E6E8E7]/80 rounded" />
              </div>

              <div className="space-y-1">
                <Skeleton className="h-2.5 w-24 bg-[#E6E8E7]/60 rounded" />
                <Skeleton className="h-4 w-28 bg-[#E6E8E7]/80 rounded" />
                <Skeleton className="h-2.5 w-36 bg-[#E6E8E7]/50 rounded" />
              </div>

              <div className="space-y-1">
                <Skeleton className="h-2.5 w-28 bg-[#E6E8E7]/60 rounded" />
                <Skeleton className="h-4 w-32 bg-[#E6E8E7]/80 rounded" />
              </div>

              <div className="space-y-1">
                <Skeleton className="h-2.5 w-20 bg-[#E6E8E7]/60 rounded" />
                <Skeleton className="h-4 w-16 bg-[#E6E8E7]/80 rounded" />
              </div>

              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-2.5 w-24 bg-[#E6E8E7]/60 rounded" />
                <Skeleton className="h-16 w-full rounded-xl bg-[#E6E8E7]/35 border border-[#E6E8E7]" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E8E7] flex justify-between items-center">
            <Skeleton className="h-2.5 w-16 bg-[#E6E8E7]/50 rounded" />
            <Skeleton className="h-2.5 w-20 bg-[#E6E8E7]/50 rounded" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 2 (MIDDLE 6 COLS): Document Viewer Canvas Skeleton                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 border border-[#E6E8E7] bg-white rounded-2xl flex flex-col h-[740px] overflow-hidden shadow-2xs">
          {/* Top Viewer Toolbar Skeleton */}
          <div className="border-b border-[#E6E8E7] bg-white px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-8 w-24 rounded-lg bg-[#E6E8E7]/70" />
              <Skeleton className="h-8 w-24 rounded-lg bg-[#E6E8E7]/50" />
              <Skeleton className="h-8 w-20 rounded-lg bg-[#E6E8E7]/50" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-7 w-16 rounded-lg bg-[#E6E8E7]/50" />
              <Skeleton className="h-7 w-7 rounded-lg bg-[#E6E8E7]/60" />
            </div>
          </div>

          {/* Document Canvas Placeholder Skeleton */}
          <div className="bg-[#FAFBFB] p-4 sm:p-6 flex-1 flex flex-col items-center justify-start overflow-hidden">
            <div className="w-full max-w-[560px] bg-white rounded-2xl border border-[#E6E8E7] p-8 space-y-6 shadow-2xs h-full flex flex-col justify-between">
              <div className="space-y-5">
                {/* Simulated Document Paper Header */}
                <div className="flex items-center justify-between border-b border-[#E6E8E7] pb-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 bg-[#E6E8E7]/80 rounded" />
                    <Skeleton className="h-2.5 w-44 bg-[#E6E8E7]/50 rounded" />
                  </div>
                  <Skeleton className="h-3 w-20 bg-[#E6E8E7]/50 rounded" />
                </div>

                {/* Section Title */}
                <Skeleton className="h-6 w-3/4 rounded-md bg-[#E6E8E7]/70 mt-2" />

                {/* Body Lines */}
                <div className="space-y-2.5 pt-2">
                  <Skeleton className="h-3 w-full rounded bg-[#E6E8E7]/50" />
                  <Skeleton className="h-3 w-11/12 rounded bg-[#E6E8E7]/50" />
                  <Skeleton className="h-3 w-4/5 rounded bg-[#E6E8E7]/50" />
                  <Skeleton className="h-3 w-5/6 rounded bg-[#E6E8E7]/50" />
                </div>

                {/* Callout Box */}
                <Skeleton className="h-20 w-full rounded-xl bg-[#E6E8E7]/25 border border-[#E6E8E7]/60" />

                {/* More Lines */}
                <div className="space-y-2.5 pt-1">
                  <Skeleton className="h-3 w-full rounded bg-[#E6E8E7]/50" />
                  <Skeleton className="h-3 w-5/6 rounded bg-[#E6E8E7]/50" />
                  <Skeleton className="h-3 w-2/3 rounded bg-[#E6E8E7]/50" />
                </div>
              </div>

              {/* Document Paper Footer */}
              <div className="border-t border-[#E6E8E7] pt-4 flex justify-between items-center text-[#183028]/40">
                <Skeleton className="h-2.5 w-24 bg-[#E6E8E7]/50 rounded" />
                <Skeleton className="h-2.5 w-16 bg-[#E6E8E7]/50 rounded" />
              </div>
            </div>
          </div>

          {/* Bottom Controls Bar Skeleton */}
          <div className="border-t border-[#E6E8E7] bg-white px-3.5 py-2.5 flex items-center justify-between shrink-0">
            <Skeleton className="h-3 w-32 bg-[#E6E8E7]/50 rounded" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 3 (RIGHT 4 COLS): Document Feedback / AI Assist Skeleton             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 border border-[#E6E8E7] bg-white rounded-2xl p-6 flex flex-col h-[740px] shadow-2xs space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-24 bg-[#E6E8E7]/60 rounded" />
            <Skeleton className="h-5 w-52 bg-[#E6E8E7]/80 rounded" />
            <Skeleton className="h-3 w-full bg-[#E6E8E7]/50 rounded mt-2" />
            <Skeleton className="h-3 w-4/5 bg-[#E6E8E7]/50 rounded" />
          </div>

          <div className="space-y-3 pt-3 flex-1 overflow-hidden">
            {/* Flag / Feedback Card Skeletons */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-[#E6E8E7] bg-[#FAFBFB] space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32 bg-[#E6E8E7]/70 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full bg-[#E6E8E7]/60" />
                </div>
                <Skeleton className="h-3 w-full bg-[#E6E8E7]/50 rounded" />
                <Skeleton className="h-3 w-3/4 bg-[#E6E8E7]/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
