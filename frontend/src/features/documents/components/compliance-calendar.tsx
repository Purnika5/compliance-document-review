"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateFilterPreset =
  | "All"
  | "Today"
  | "Past 7 Days"
  | "This Month"
  | "Past 90 Days"
  | "Custom"
  | "This Week"
  | "Past 30 Days"
  | "Past Year"
  | "All Past Dates"
  | "Next 7 Days"
  | "Next 30 Days"
  | "Next 90 Days"
  | "All Future Dates";

export interface ComplianceCalendarProps {
  documents: Array<{ submittedAt: string; [key: string]: any }>;
  activePreset: DateFilterPreset;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  onSelectPreset: (preset: DateFilterPreset) => void;
  onSelectCustomRange: (startDate: string, endDate: string) => void;
  onClear: () => void;
  className?: string;
  title?: string;
}

const PRESET_OPTIONS = [
  { label: "All Time", value: "All" as const },
  { label: "Today", value: "Today" as const },
  { label: "Past 7 Days", value: "Past 7 Days" as const },
  { label: "This Month", value: "This Month" as const },
  { label: "Past 90 Days", value: "Past 90 Days" as const },
];

/**
 * Formats a local Date to YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * DOCU: Unified Compliance Calendar widget providing inline preset filtering
 * and interactive day/range selection directly on the dashboard without a modal.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
export function ComplianceCalendar({
  documents,
  activePreset,
  customStartDate,
  customEndDate,
  onSelectPreset,
  onSelectCustomRange,
  onClear,
  className,
  title = "Compliance Calendar",
}: ComplianceCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [rangeStart, setRangeStart] = useState<string | null>(null);

  // Compute the currently viewed month & year based on monthOffset
  const currentViewDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [now, monthOffset]);

  const viewYear = currentViewDate.getFullYear();
  const viewMonth = currentViewDate.getMonth();

  const viewMonthName = useMemo(() => {
    return currentViewDate.toLocaleDateString("en-US", { month: "long" });
  }, [currentViewDate]);

  const monthLabel = useMemo(() => {
    return currentViewDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentViewDate]);

  // Check if a full-year filter is currently applied
  const isFullYearFilter = useMemo(() => {
    if (activePreset !== "Custom") return false;
    if (!customStartDate || !customEndDate) return false;
    return (
      customStartDate.endsWith("-01-01") &&
      customEndDate.endsWith("-12-31") &&
      customStartDate.slice(0, 4) === customEndDate.slice(0, 4)
    );
  }, [activePreset, customStartDate, customEndDate]);

  const activeFilterYear = useMemo(() => {
    if (isFullYearFilter && customStartDate) {
      return Number(customStartDate.slice(0, 4));
    }
    return null;
  }, [isFullYearFilter, customStartDate]);

  // Extract all available years from documents + current and neighboring years
  const availableYears = useMemo(() => {
    const currentYear = now.getFullYear();
    const yearSet = new Set<number>([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ]);
    documents.forEach((doc) => {
      if (!doc.submittedAt) return;
      const d = new Date(doc.submittedAt);
      if (!isNaN(d.getTime())) {
        yearSet.add(d.getFullYear());
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a); // Descending order (2027, 2026, 2025, 2024...)
  }, [documents, now]);

  const handleYearChange = (val: string) => {
    setRangeStart(null);
    if (val === "ALL") {
      onClear();
      return;
    }
    const targetYear = Number(val);
    if (isNaN(targetYear)) return;

    // Shift calendar view to targetYear while keeping the same month index
    const diffYears = targetYear - now.getFullYear();
    const targetOffset = diffYears * 12 + (viewMonth - now.getMonth());
    setMonthOffset(targetOffset);

    // Apply year filter for documents
    onSelectCustomRange(`${targetYear}-01-01`, `${targetYear}-12-31`);
  };

  // Map of date strings "YYYY-MM-DD" to documents submitted on that date
  const docsByDateKey = useMemo(() => {
    const map = new Map<string, Array<{ submittedAt: string }>>();
    documents.forEach((doc) => {
      if (!doc.submittedAt) return;
      const d = new Date(doc.submittedAt);
      if (isNaN(d.getTime())) return;
      const key = formatDateKey(d);
      const list = map.get(key) || [];
      list.push(doc);
      map.set(key, list);
    });
    return map;
  }, [documents]);

  // Calendar cells calculation
  const { calendarCells, daysInMonth, firstDayOffset } = useMemo(() => {
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const cells = Array.from({ length: 42 }, (_, i) =>
      i < firstDay || i >= firstDay + totalDays ? null : i - firstDay + 1
    );
    return { calendarCells: cells, daysInMonth: totalDays, firstDayOffset: firstDay };
  }, [viewYear, viewMonth]);

  // Range helper for presets
  const presetDateBounds = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (activePreset === "Today") {
      return { start: startOfToday, end: endOfToday };
    }
    if (activePreset === "Past 7 Days" || activePreset === "This Week") {
      const past7 = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: past7, end: endOfToday };
    }
    if (activePreset === "This Month" || activePreset === "Past 30 Days") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: endOfToday };
    }
    if (activePreset === "Past 90 Days") {
      const past90 = new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: past90, end: endOfToday };
    }
    if (activePreset === "Custom" && customStartDate) {
      const s = new Date(customStartDate);
      s.setHours(0, 0, 0, 0);
      const e = customEndDate ? new Date(customEndDate) : new Date(customStartDate);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    return null;
  }, [activePreset, customStartDate, customEndDate, now]);

  // Check if a cell date falls within active range
  const isDateInActiveRange = (day: number) => {
    if (!presetDateBounds) return false;
    const target = new Date(viewYear, viewMonth, day, 12, 0, 0);
    return target >= presetDateBounds.start && target <= presetDateBounds.end;
  };

  const isExactSingleSelected = (day: number) => {
    if (activePreset !== "Custom") return false;
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return customStartDate === key && (customEndDate === key || !customEndDate);
  };

  // Day click handler for interactive range or single day selection
  const handleDayClick = (day: number) => {
    const clickedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (!rangeStart) {
      // First click: select this single date
      setRangeStart(clickedDateStr);
      onSelectCustomRange(clickedDateStr, clickedDateStr);
    } else {
      // Second click: create range
      if (clickedDateStr === rangeStart) {
        // Double clicked same day -> toggle off or keep single day
        onSelectCustomRange(clickedDateStr, clickedDateStr);
        setRangeStart(null);
      } else if (clickedDateStr < rangeStart) {
        onSelectCustomRange(clickedDateStr, rangeStart);
        setRangeStart(null);
      } else {
        onSelectCustomRange(rangeStart, clickedDateStr);
        setRangeStart(null);
      }
    }
  };

  // Human-readable active filter summary
  const activeFilterText = useMemo(() => {
    if (activePreset === "Custom") {
      if (isFullYearFilter && activeFilterYear) {
        return `Year ${activeFilterYear}`;
      }
      if (customStartDate && customEndDate && customStartDate !== customEndDate) {
        return `${customStartDate} to ${customEndDate}`;
      }
      if (customStartDate) {
        return customStartDate;
      }
      return "Custom Date";
    }
    return activePreset !== "All" ? activePreset : null;
  }, [activePreset, customStartDate, customEndDate, isFullYearFilter, activeFilterYear]);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E8E7] shadow-2xs space-y-3.5 select-none transition-all",
        className
      )}
    >
      {/* Top Header: Title & Month/Year Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#183028]/50 block">
            {title}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h3 className="text-sm font-bold text-[#183028]">
              {viewMonthName}
            </h3>

            {/* Filter Year Dropdown for Fast UX Navigation & Annual Audit Filtering */}
            <div className="relative inline-flex items-center">
              <select
                id="compliance-calendar-year-filter"
                aria-label="Filter documents by year"
                value={isFullYearFilter && activeFilterYear ? String(activeFilterYear) : String(viewYear)}
                onChange={(e) => handleYearChange(e.target.value)}
                className={cn(
                  "appearance-none text-xs font-bold pl-2 pr-5 py-0.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#183028] shadow-2xs",
                  isFullYearFilter
                    ? "bg-[#183028] text-white border-[#183028]"
                    : "bg-[#FAFBFB] text-[#183028] border-[#E6E8E7] hover:bg-[#C5E86C]/25 hover:border-[#183028]/30"
                )}
                title="Filter documents by year or select year"
              >
                <option value="ALL" className="bg-white text-[#183028]">
                  All Years
                </option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)} className="bg-white text-[#183028]">
                    {yr} {yr === now.getFullYear() ? "(Current)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={cn(
                  "h-3 w-3 absolute right-1 pointer-events-none transition-colors",
                  isFullYearFilter ? "text-white/80" : "text-[#183028]/60"
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {monthOffset !== 0 && (
            <button
              type="button"
              onClick={() => setMonthOffset(0)}
              className="px-2 py-0.5 text-[10px] font-semibold text-[#183028] bg-[#E6E8E7]/60 hover:bg-[#C5E86C]/30 rounded-md cursor-pointer transition-colors"
              title="Return to Current Month"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => setMonthOffset((p) => p - 1)}
            className="p-1 rounded text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((p) => p + 1)}
            className="p-1 rounded text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/20 cursor-pointer transition-colors"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Merged Preset Filter Buttons (All in 1 Place - Single Row) */}
      <div className="flex items-center flex-nowrap gap-0.5 sm:gap-1 bg-[#FAFBFB] p-1 rounded-xl border border-[#E6E8E7] w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESET_OPTIONS.map((preset) => {
          const isSelected = activePreset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                setRangeStart(null);
                onSelectPreset(preset.value);
              }}
              className={cn(
                "px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap flex-1 text-center shrink-0",
                isSelected
                  ? "bg-[#183028] text-white shadow-2xs font-bold"
                  : "text-[#183028]/70 hover:text-[#183028] hover:bg-[#C5E86C]/25"
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Calendar Weekday Headers */}
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#183028]/45 uppercase">
        <span>S</span>
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {calendarCells.map((day, idx) => {
          if (!day) {
            return <span key={`pad-${idx}`} className="h-7 w-full" />;
          }

          const dayKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayDocs = docsByDateKey.get(dayKey) || [];
          const hasDocs = dayDocs.length > 0;
          const isToday =
            now.getDate() === day &&
            now.getMonth() === viewMonth &&
            now.getFullYear() === viewYear;

          const inActiveRange = isDateInActiveRange(day);
          const singleSelected = isExactSingleSelected(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-7 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-all relative cursor-pointer",
                // Single day pill highlight (matches image 2)
                singleSelected
                  ? "bg-[#C5E86C] text-[#183028] font-bold ring-2 ring-[#183028]"
                  : inActiveRange
                  ? "bg-[#C5E86C]/30 text-[#183028] font-semibold"
                  : hasDocs
                  ? "bg-[#FAFBFB] text-[#183028] font-medium border border-[#E6E8E7]"
                  : "text-[#183028]/75 hover:bg-[#C5E86C]/20 hover:text-[#183028]",
                isToday && !singleSelected && "ring-1 ring-[#183028]/40 font-bold"
              )}
              title={
                hasDocs
                  ? `${dayDocs.length} document${dayDocs.length > 1 ? "s" : ""} on ${monthLabel.split(" ")[0]} ${day}. Click to filter.`
                  : `Filter by ${monthLabel.split(" ")[0]} ${day}`
              }
            >
              <span>{day}</span>
              {hasDocs && (
                <span
                  className={cn(
                    "h-1 w-1 rounded-full absolute bottom-0.5",
                    singleSelected ? "bg-[#183028]" : "bg-[#183028]/80"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Filter Status Bar & Reset Button */}
      {activeFilterText && (
        <div className="flex items-center justify-between pt-2 border-t border-[#E6E8E7] text-xs">
          <div className="flex items-center gap-1.5 text-[#183028]/80 text-[11px] truncate">
            <CalendarIcon className="h-3 w-3 text-[#183028]/60 shrink-0" />
            <span className="font-semibold text-[#183028]">Filtered:</span>
            <span className="truncate">{activeFilterText}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setRangeStart(null);
              onClear();
            }}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 cursor-pointer ml-2 shrink-0 transition-colors"
          >
            <X className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
}
