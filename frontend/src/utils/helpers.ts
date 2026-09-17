/**
 * DOCU: Formatting, status colors, and general helper utilities for UI components.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { DocumentStatusType } from "@/entities/enums/document.enum";

/**
 * DOCU: Formats a raw byte count into a human-readable size string (Bytes, KB, MB, GB).
 * Last Updated Date: September 7, 2026
 * @param bytes - Size in bytes.
 * @returns Formatted size string (e.g. "2.4 MB").
 * @author Keith
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * DOCU: Maps a DocumentStatusType to its corresponding Tailwind styling classes for backgrounds, text, and borders.
 * Last Updated Date: September 7, 2026
 * @param status - Document review status.
 * @returns Object with bg, text, and border CSS class strings.
 * @author Keith
 */
export function getStatusBadgeVariant(status: DocumentStatusType): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "Approved":
      return {
        bg: "bg-[#C5E86C]/35",
        text: "text-[#183028]",
        border: "border-[#C5E86C]",
      };
    case "Pending":
      return {
        bg: "bg-amber-50",
        text: "text-amber-900",
        border: "border-amber-200",
      };
    case "Needs Revision":
      return {
        bg: "bg-orange-50",
        text: "text-orange-950",
        border: "border-orange-200",
      };
    case "Rejected":
      return {
        bg: "bg-rose-50",
        text: "text-rose-950",
        border: "border-rose-200",
      };
    default:
      return {
        bg: "bg-[#FAFBFB]",
        text: "text-[#183028]",
        border: "border-[#E6E8E7]",
      };
  }
}

/**
 * DOCU: Truncates a long text string with an ellipsis if it exceeds the maximum character threshold.
 * Last Updated Date: September 7, 2026
 * @param str - Input string to truncate.
 * @param maxLength - Maximum allowed length before truncation (default: 30).
 * @returns Truncated string with ellipsis or original string.
 * @author Keith
 */
export function truncateString(str: string, maxLength = 30): string {
  if (!str) return "";
  return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
}
