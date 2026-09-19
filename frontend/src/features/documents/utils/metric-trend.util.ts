/**
 * DOCU: Utilities for filtering documents by date and generating historical time-series
 * trend data for KPI metric cards and compliance line charts.
 * Supports presets: All, Today, Past 7 Days, This Week, Past 30 Days, This Month, Past 90 Days, Past Year, and Custom.
 * Last Updated Date: September 20, 2026
 * @author Keith
 */
import type { DocumentItem } from "@/lib/validation/document";
import type { DateFilterPreset } from "../components/date-filter-modal";

export interface MetricTrendData {
  dates: Date[];
  labels: string[];
  total: number[];
  pending: number[];
  needsRevision: number[];
  approved: number[];
  rejected: number[];
  throughput: number[];
  filteredCount: number;
}

/**
 * Checks if a document falls within the selected date criteria.
 */
export function isDocInDateRange(
  doc: DocumentItem,
  preset: DateFilterPreset = "All",
  customStart?: string,
  customEnd?: string,
  selectedDay?: number | null,
  calMonth?: number,
  calYear?: number
): boolean {
  if (!doc.submittedAt) return true;
  const docDate = new Date(doc.submittedAt);
  if (isNaN(docDate.getTime())) return true;

  // 1. Calendar selected day has highest priority
  if (selectedDay !== null && selectedDay !== undefined && calMonth !== undefined && calYear !== undefined) {
    return (
      docDate.getDate() === selectedDay &&
      docDate.getMonth() === calMonth &&
      docDate.getFullYear() === calYear
    );
  }

  // 2. Preset filter
  if (preset === "All") return true;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "Today":
      return docDate >= startOfDay && docDate <= endOfDay;

    case "Past 7 Days":
    case "This Week": {
      const past7 = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
      return docDate >= past7 && docDate <= endOfDay;
    }

    case "Past 30 Days":
    case "This Month": {
      const past30 = new Date(startOfDay.getTime() - 29 * 24 * 60 * 60 * 1000);
      return docDate >= past30 && docDate <= endOfDay;
    }

    case "Past 90 Days": {
      const past90 = new Date(startOfDay.getTime() - 89 * 24 * 60 * 60 * 1000);
      return docDate >= past90 && docDate <= endOfDay;
    }

    case "Past Year": {
      const past365 = new Date(startOfDay.getTime() - 364 * 24 * 60 * 60 * 1000);
      return docDate >= past365 && docDate <= endOfDay;
    }

    case "All Past Dates":
      return docDate < startOfDay;

    case "Next 7 Days": {
      const next7 = new Date(endOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
      return docDate >= startOfDay && docDate <= next7;
    }

    case "Next 30 Days": {
      const next30 = new Date(endOfDay.getTime() + 30 * 24 * 60 * 60 * 1000);
      return docDate >= startOfDay && docDate <= next30;
    }

    case "Next 90 Days": {
      const next90 = new Date(endOfDay.getTime() + 90 * 24 * 60 * 60 * 1000);
      return docDate >= startOfDay && docDate <= next90;
    }

    case "All Future Dates":
      return docDate > endOfDay;

    case "Custom": {
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        if (docDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (docDate > end) return false;
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Generates an array of time-series checkpoints and corresponding metric data points
 * dynamically matching the selected date preset or calendar day.
 */
export function generateMetricTrends(
  documents: DocumentItem[],
  preset: DateFilterPreset = "All",
  customStart?: string,
  customEnd?: string,
  selectedDay?: number | null,
  calMonth?: number,
  calYear?: number
): MetricTrendData {
  const now = new Date();
  const pointsCount = 7;

  // Filter documents that belong to this date window
  const matchingDocs = documents.filter((doc) =>
    isDocInDateRange(doc, preset, customStart, customEnd, selectedDay, calMonth, calYear)
  );

  let startDate: Date;
  let endDate: Date;
  let isHourly = false;

  if (selectedDay !== null && selectedDay !== undefined && calMonth !== undefined && calYear !== undefined) {
    startDate = new Date(calYear, calMonth, selectedDay, 0, 0, 0);
    endDate = new Date(calYear, calMonth, selectedDay, 23, 59, 59);
    isHourly = true;
  } else if (preset === "Today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    isHourly = true;
  } else if (preset === "Past 7 Days" || preset === "This Week") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === "Past 30 Days" || preset === "This Month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === "Past 90 Days") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === "Past Year") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (preset === "Custom" && customStart) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = customEnd ? new Date(customEnd) : new Date();
    endDate.setHours(23, 59, 59, 999);
  } else {
    // "All" - Span from earliest submission or 14 days ago to now
    let earliest = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    for (const doc of documents) {
      if (doc.submittedAt) {
        const d = new Date(doc.submittedAt);
        if (!isNaN(d.getTime()) && d < earliest) {
          earliest = d;
        }
      }
    }
    startDate = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate(), 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const step = Math.max(1, (endTime - startTime) / (pointsCount - 1));

  const dates: Date[] = [];
  const labels: string[] = [];

  for (let i = 0; i < pointsCount; i++) {
    const t = new Date(startTime + i * step);
    dates.push(t);

    if (isHourly) {
      const hours = t.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      labels.push(`${displayHours} ${ampm}`);
    } else {
      labels.push(
        t.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      );
    }
  }

  // Calculate cumulative/progression metrics at each time checkpoint
  const total: number[] = [];
  const pending: number[] = [];
  const needsRevision: number[] = [];
  const approved: number[] = [];
  const rejected: number[] = [];
  const throughput: number[] = [];

  for (let i = 0; i < pointsCount; i++) {
    const checkpointTime = dates[i].getTime();
    // For the last checkpoint, ensure all matching docs are included
    const isLast = i === pointsCount - 1;

    const docsUpTo = matchingDocs.filter((d) => {
      const docT = new Date(d.submittedAt).getTime();
      return isLast ? true : docT <= checkpointTime;
    });

    const tot = docsUpTo.length;
    const pend = docsUpTo.filter((d) => d.status === "Pending").length;
    const rev = docsUpTo.filter((d) => d.status === "Needs Revision").length;
    const app = docsUpTo.filter((d) => d.status === "Approved").length;
    const rej = docsUpTo.filter((d) => d.status === "Rejected").length;
    const thr = tot > 0 ? Math.round(((app + rej) / tot) * 100) : 0;

    total.push(tot);
    pending.push(pend);
    needsRevision.push(rev);
    approved.push(app);
    rejected.push(rej);
    throughput.push(thr);
  }

  return {
    dates,
    labels,
    total,
    pending,
    needsRevision,
    approved,
    rejected,
    throughput,
    filteredCount: matchingDocs.length,
  };
}
