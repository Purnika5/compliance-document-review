/**
 * DOCU: Date and time formatting utilities for locale-aware and relative timestamp rendering.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */

/**
 * DOCU: Formats an ISO date string into a standard short date string (e.g. "Sep 07, 2026").
 * Last Updated Date: September 7, 2026
 * @param dateString - ISO date string or null.
 * @returns Formatted date string, "N/A" if empty, or original string if parsing fails.
 * @author Keith
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * DOCU: Formats an ISO date string into a full date and time string (e.g. "Sep 07, 2026, 02:45 PM").
 * Last Updated Date: September 7, 2026
 * @param dateString - ISO date string or null.
 * @returns Formatted date and time string.
 * @author Keith
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * DOCU: Calculates a friendly human-readable relative time string (e.g. "Just now", "5m ago", "2h ago", "1d ago").
 * Last Updated Date: September 7, 2026
 * @param dateString - ISO date string or null.
 * @returns Friendly relative elapsed time string.
 * @author Keith
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return formatDate(dateString);
  } catch {
    return dateString;
  }
}
