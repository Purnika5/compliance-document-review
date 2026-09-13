"use client";

/**
 * DOCU: Renders a modal dialog allowing users to filter document submissions by past, future, and custom date ranges with interactive date pickers.
 * Last Updated Date: September 12, 2026
 * @returns The Date Filter Modal component.
 * @author Keith
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  History,
  Clock,
  ArrowRight,
  RotateCcw,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DateFilterPreset =
  | "All"
  | "Today"
  | "This Week"
  | "This Month"
  | "Past 7 Days"
  | "Past 30 Days"
  | "Past 90 Days"
  | "Past Year"
  | "All Past Dates"
  | "Next 7 Days"
  | "Next 30 Days"
  | "Next 90 Days"
  | "All Future Dates"
  | "Custom";

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (preset: DateFilterPreset, startDate: string, endDate: string) => void;
  onReset: () => void;
  currentPreset: DateFilterPreset;
  currentStartDate: string;
  currentEndDate: string;
}

const PAST_PRESETS: { label: string; value: DateFilterPreset; desc: string }[] = [
  { label: "Today", value: "Today", desc: "Submissions recorded today" },
  { label: "Past 7 Days", value: "Past 7 Days", desc: "Last 7 days of activity" },
  { label: "Past 30 Days", value: "Past 30 Days", desc: "Last 30 days of activity" },
  { label: "Past 90 Days", value: "Past 90 Days", desc: "Last quarter activity" },
  { label: "Past Year", value: "Past Year", desc: "Past 365 days" },
  { label: "All Past Dates", value: "All Past Dates", desc: "All historical submissions prior to today" },
];

const FUTURE_PRESETS: { label: string; value: DateFilterPreset; desc: string }[] = [
  { label: "Next 7 Days", value: "Next 7 Days", desc: "Upcoming target dates in 7 days" },
  { label: "Next 30 Days", value: "Next 30 Days", desc: "Upcoming targets in 30 days" },
  { label: "Next 90 Days", value: "Next 90 Days", desc: "Quarterly upcoming targets" },
  { label: "All Future Dates", value: "All Future Dates", desc: "All scheduled/future target dates" },
];

export function DateFilterModal({
  isOpen,
  onClose,
  onApply,
  onReset,
  currentPreset,
  currentStartDate,
  currentEndDate,
}: DateFilterModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateFilterPreset>(currentPreset);
  const [startDate, setStartDate] = useState<string>(currentStartDate);
  const [endDate, setEndDate] = useState<string>(currentEndDate);

  // Interactive Mini Calendar Date Picker State
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [showVisualCalendar, setShowVisualCalendar] = useState<boolean>(false);
  const [pickerMonthOffset, setPickerMonthOffset] = useState<number>(0);

  useEffect(() => {
    setSelectedPreset(currentPreset);
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
    if (currentPreset === "Custom" || currentStartDate || currentEndDate) {
      setShowVisualCalendar(true);
    }
  }, [currentPreset, currentStartDate, currentEndDate, isOpen]);

  const handleApply = () => {
    onApply(selectedPreset, startDate, endDate);
    onClose();
  };

  const handleReset = () => {
    setSelectedPreset("All");
    setStartDate("");
    setEndDate("");
    setShowVisualCalendar(false);
    onReset();
    onClose();
  };

  // Calendar Calculation for Interactive Visual Date Picker
  const now = new Date();
  const calendarDate = new Date(now.getFullYear(), now.getMonth() + pickerMonthOffset, 1);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const calendarMonthLabel = calendarDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstDayOffset = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDayOffset + daysInMonth }, (_, i) =>
    i < firstDayOffset ? null : i - firstDayOffset + 1
  );

  const formatDateString = (year: number, month: number, day: number) => {
    const yyyy = String(year);
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSelectCalendarDay = (day: number) => {
    const dateStr = formatDateString(calendarYear, calendarMonth, day);
    setSelectedPreset("Custom");

    if (pickerTarget === "start") {
      setStartDate(dateStr);
      // Switch target to end date automatically for convenient range picking
      if (!endDate || endDate < dateStr) {
        setPickerTarget("end");
      }
    } else {
      if (startDate && dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate("");
      } else {
        setEndDate(dateStr);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-400">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Filter Submissions by Date
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select past, future, or custom date ranges using quick presets or the visual date picker.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Preset Selector - Past Submissions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5 text-emerald-400" />
              <span>Past Submissions</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PAST_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.value);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={cn(
                      "flex flex-col items-start p-2 rounded-lg text-left transition-all border cursor-pointer",
                      isSelected
                        ? "bg-[#062a20] border-emerald-500/80 text-[#54d0a2] shadow-xs"
                        : "bg-background/40 border-border text-foreground hover:bg-muted/60 hover:border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold">{preset.label}</span>
                      {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Selector - Future Dates */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Upcoming &amp; Future Dates</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {FUTURE_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.value);
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={cn(
                      "flex flex-col items-start p-2 rounded-lg text-left transition-all border cursor-pointer",
                      isSelected
                        ? "bg-[#062a20] border-emerald-500/80 text-[#54d0a2] shadow-xs"
                        : "bg-background/40 border-border text-foreground hover:bg-muted/60 hover:border-border/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold">{preset.label}</span>
                      {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Custom Date Range Picker
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowVisualCalendar(!showVisualCalendar);
                  setSelectedPreset("Custom");
                }}
                className="text-[10px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CalendarDays className="h-3 w-3" />
                {showVisualCalendar ? "Hide Visual Calendar" : "Show Visual Date Picker"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                  From Date (Start)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedPreset("Custom");
                    }}
                    onFocus={() => {
                      setSelectedPreset("Custom");
                      setPickerTarget("start");
                      setShowVisualCalendar(true);
                    }}
                    className={cn(
                      "h-8 text-xs bg-background border-border text-foreground pr-8 cursor-pointer font-mono",
                      pickerTarget === "start" && selectedPreset === "Custom" && "ring-1 ring-emerald-500 border-emerald-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget("start");
                      setShowVisualCalendar(true);
                      setSelectedPreset("Custom");
                    }}
                    className="absolute right-2 text-muted-foreground hover:text-emerald-400 p-0.5 cursor-pointer"
                    title="Select Start Date in Visual Calendar"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                  To Date (End)
                </label>
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedPreset("Custom");
                    }}
                    onFocus={() => {
                      setSelectedPreset("Custom");
                      setPickerTarget("end");
                      setShowVisualCalendar(true);
                    }}
                    className={cn(
                      "h-8 text-xs bg-background border-border text-foreground pr-8 cursor-pointer font-mono",
                      pickerTarget === "end" && selectedPreset === "Custom" && "ring-1 ring-emerald-500 border-emerald-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget("end");
                      setShowVisualCalendar(true);
                      setSelectedPreset("Custom");
                    }}
                    className="absolute right-2 text-muted-foreground hover:text-emerald-400 p-0.5 cursor-pointer"
                    title="Select End Date in Visual Calendar"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Interactive Calendar Grid Picker */}
            {showVisualCalendar && (
              <div className="mt-3 p-3 rounded-xl border border-border bg-background/50 animate-slide-down">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPickerTarget("start")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all",
                        pickerTarget === "start"
                          ? "bg-[#062a20] text-[#54d0a2] border border-emerald-700/60"
                          : "text-muted-foreground hover:text-foreground bg-muted/40"
                      )}
                    >
                      Picking: From Date {startDate ? `(${startDate})` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTarget("end")}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-all",
                        pickerTarget === "end"
                          ? "bg-[#062a20] text-[#54d0a2] border border-emerald-700/60"
                          : "text-muted-foreground hover:text-foreground bg-muted/40"
                      )}
                    >
                      Picking: To Date {endDate ? `(${endDate})` : ""}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-foreground mr-1">{calendarMonthLabel}</span>
                    <button
                      type="button"
                      onClick={() => setPickerMonthOffset((prev) => prev - 1)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerMonthOffset((prev) => prev + 1)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-muted-foreground/70 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                    <span key={`${day}-${idx}`}>{day}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarCells.map((day, idx) => {
                    if (!day) {
                      return <span key={`empty-${idx}`} className="h-7" />;
                    }

                    const cellDateStr = formatDateString(calendarYear, calendarMonth, day);
                    const isStart = startDate === cellDateStr;
                    const isEnd = endDate === cellDateStr;
                    const isInRange =
                      startDate &&
                      endDate &&
                      cellDateStr > startDate &&
                      cellDateStr < endDate;

                    return (
                      <button
                        key={`cell-${day}`}
                        type="button"
                        onClick={() => handleSelectCalendarDay(day)}
                        className={cn(
                          "h-7 w-full flex items-center justify-center rounded text-xs font-medium cursor-pointer transition-all",
                          isStart || isEnd
                            ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                            : isInRange
                            ? "bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-800/40"
                            : "text-foreground hover:bg-muted hover:text-primary"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex flex-row justify-between items-center pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filter
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs border-border text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs bg-[#24A152] hover:bg-[#062A20] hover:text-[#54d0a2] hover:border hover:border-emerald-700/60 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Apply Filter</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
