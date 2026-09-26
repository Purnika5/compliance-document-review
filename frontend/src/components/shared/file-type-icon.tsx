import React from "react";
import { cn } from "@/lib/utils";

interface FileTypeIconProps {
  filename?: string;
  title?: string;
  category?: string;
  className?: string;
}

/**
 * DOCU: Renders high-fidelity, format-specific document badges for PDF, DOC/DOCX, and spreadsheets.
 * @param filename File name with extension
 * @param title Document title
 * @param category Document category
 * @param className Optional container styling
 */
export function FileTypeIcon({
  filename,
  title,
  category,
  className,
}: FileTypeIconProps) {
  const text = `${filename || ""} ${title || ""} ${category || ""}`.toUpperCase();
  const isPdf = text.endsWith(".PDF") || text.includes(".PDF") || text.includes("PDF");
  const isDoc =
    text.endsWith(".DOC") ||
    text.endsWith(".DOCX") ||
    text.includes(".DOC") ||
    text.includes("DOCX") ||
    text.includes("WORD");
  const isXls =
    text.endsWith(".XLS") ||
    text.endsWith(".XLSX") ||
    text.includes(".XLS") ||
    text.includes("SHEET") ||
    text.includes("EXCEL");
  const isTxt =
    text.endsWith(".TXT") ||
    text.includes(".TXT") ||
    text.includes("TEXT");

  if (isPdf) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-red-50 border border-red-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-red-600 select-none",
          className
        )}
        title="PDF Document"
      >
        <svg
          className="h-3.5 w-3.5 text-red-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[8.5px] font-black tracking-wider text-red-700 font-sans leading-none mt-0.5">
          PDF
        </span>
      </div>
    );
  }

  if (isDoc) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-blue-600 select-none",
          className
        )}
        title="Word Document"
      >
        <svg
          className="h-3.5 w-3.5 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[8.5px] font-black tracking-wider text-blue-700 font-sans leading-none mt-0.5">
          DOC
        </span>
      </div>
    );
  }

  if (isXls) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-emerald-600 select-none",
          className
        )}
        title="Spreadsheet Document"
      >
        <svg
          className="h-3.5 w-3.5 text-emerald-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[8.5px] font-black tracking-wider text-emerald-700 font-sans leading-none mt-0.5">
          XLS
        </span>
      </div>
    );
  }

  if (isTxt) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-amber-700 select-none",
          className
        )}
        title="Plain Text Document (TXT)"
      >
        <svg
          className="h-3.5 w-3.5 text-amber-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span className="text-[8.5px] font-black tracking-wider text-amber-700 font-sans leading-none mt-0.5">
          TXT
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-8 w-8 rounded-lg bg-[#183028] flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-white select-none",
        className
      )}
      title="File"
    >
      <svg
        className="h-3.5 w-3.5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-[8.5px] font-black tracking-wider text-white font-sans leading-none mt-0.5">
        FILE
      </span>
    </div>
  );
}
