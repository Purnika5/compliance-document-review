"use client";

/**
 * DOCU: Renders a modal dialog allowing users to filter document submissions by custom date ranges with interactive date picker.
 * Last Updated Date: September 18, 2026
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
  ArrowRight,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
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

export function DateFilterModal({
  isOpen,
  onClose,
  onApply,
  onReset,
  currentPreset,
  currentStartDate,
  currentEndDate,
}: DateFilterModalProps) {
  const [startDate, setStartDate] = useState<string>(currentStartDate);
  const [endDate, setEndDate] = useState<string>(currentEndDate);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [pickerMonthOffset, setPickerMonthOffset] = useState<number>(0);

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setStartDate(currentStartDate);
      setEndDate(currentEndDate);
      setPickerTarget("start");
      setPickerMonthOffset(0);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, currentStartDate, currentEndDate]);

  const handleApply = () => {
    const preset: DateFilterPreset = (startDate || endDate) ? "Custom" : "All";
    onApply(preset, startDate, endDate);
    onClose();
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
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

    if (pickerTarget === "start") {
      setStartDate(dateStr);
      if (!endDate || endDate < dateStr) {
        setEndDate("");
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
      <DialogContent className="sm:max-w-md bg-white border border-[#E6E8E7] text-[#183028] shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#C5E86C]/20 border border-[#C5E86C] flex items-center justify-center shrink-0">
              <Calendar className="h-4.5 w-4.5 text-[#183028]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#183028]">
                Filter Submissions by Date
              </DialogTitle>
              <DialogDescription className="text-xs text-[#183028]/60">
                Select a date or date range to filter uploaded documents.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Start and End Date Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-[#183028] block mb-1">
                From Date (Start)
              </label>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onFocus={() => setPickerTarget("start")}
                  className={cn(
                    "h-8.5 text-xs bg-white border-[#E6E8E7] text-[#183028] rounded-xl pr-8 cursor-pointer font-mono shadow-2xs",
                    pickerTarget === "start" && "ring-1 ring-[#183028] border-[#183028]"
                  )}
                />
                {startDate ? (
                  <button
                    type="button"
                    onClick={() => setStartDate("")}
                    className="absolute right-2 text-[#183028]/40 hover:text-rose-600 p-0.5 cursor-pointer"
                    title="Clear Start Date"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerTarget("start")}
                    className="absolute right-2 text-[#183028]/50 hover:text-[#183028] p-0.5 cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#183028] block mb-1">
                To Date (End)
              </label>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onFocus={() => setPickerTarget("end")}
                  className={cn(
                    "h-8.5 text-xs bg-white border-[#E6E8E7] text-[#183028] rounded-xl pr-8 cursor-pointer font-mono shadow-2xs",
                    pickerTarget === "end" && "ring-1 ring-[#183028] border-[#183028]"
                  )}
                />
                {endDate ? (
                  <button
                    type="button"
                    onClick={() => setEndDate("")}
                    className="absolute right-2 text-[#183028]/40 hover:text-rose-600 p-0.5 cursor-pointer"
                    title="Clear End Date"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerTarget("end")}
                    className="absolute right-2 text-[#183028]/50 hover:text-[#183028] p-0.5 cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Visual Calendar Grid Card */}
          <div className="p-3.5 rounded-2xl border border-[#E6E8E7] bg-white space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPickerTarget("start")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all border",
                    pickerTarget === "start"
                      ? "bg-[#183028] text-white border-[#183028] shadow-xs"
                      : "bg-white text-[#183028] border-[#E6E8E7] hover:bg-[#C5E86C]/15"
                  )}
                >
                  Picking: From Date
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTarget("end")}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all border",
                    pickerTarget === "end"
                      ? "bg-[#183028] text-white border-[#183028] shadow-xs"
                      : "bg-white text-[#183028] border-[#E6E8E7] hover:bg-[#C5E86C]/15"
                  )}
                >
                  Picking: To Date
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs font-bold text-[#183028]">{calendarMonthLabel}</span>
                {pickerMonthOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setPickerMonthOffset(0)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md text-[#183028] bg-[#E6E8E7]/60 hover:bg-[#C5E86C]/20 cursor-pointer"
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPickerMonthOffset((prev) => prev - 1)}
                  className="p-1 rounded-lg text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/15 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMonthOffset((prev) => prev + 1)}
                  className="p-1 rounded-lg text-[#183028]/60 hover:text-[#183028] hover:bg-[#C5E86C]/15 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#183028]/50 mb-1 uppercase">
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
                      "h-7 w-full flex items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-all",
                      isStart || isEnd
                        ? "bg-[#183028] text-white font-bold shadow-xs scale-105"
                        : isInRange
                        ? "bg-[#C5E86C]/35 text-[#183028] font-semibold"
                        : "text-[#183028] hover:bg-[#C5E86C]/15"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex flex-row justify-between items-center pt-3 border-t border-[#E6E8E7]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 rounded-xl cursor-pointer"
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
              className="h-8.5 px-3.5 text-xs border border-[#E6E8E7] text-[#183028] hover:bg-[#C5E86C]/20 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-8.5 px-4 text-xs bg-[#183028] hover:bg-[#23453a] hover:shadow-[0_0_12px_rgba(197,232,108,0.35)] text-white font-semibold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
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
