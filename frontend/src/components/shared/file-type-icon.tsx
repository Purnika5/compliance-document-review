import React from "react";
import { cn } from "@/lib/utils";

export interface FileTypeIconProps {
  filename?: string;
  fileName?: string;
  fileFormat?: string;
  mimeType?: string;
  filePath?: string;
  title?: string;
  category?: string;
  className?: string;
}

/**
 * DOCU: Renders high-fidelity, format-specific document badges for PDF, DOCX/DOC, TXT, and spreadsheets.
 * @param filename File name with extension
 * @param fileName Alternate camelCase file name
 * @param fileFormat Raw format token ("PDF" | "DOCX" | "TXT" | "XLS")
 * @param mimeType MIME type string
 * @param filePath Storage file path
 * @param title Document title
 * @param category Document category
 * @param className Optional container styling
 */
export function FileTypeIcon({
  filename,
  fileName,
  fileFormat,
  mimeType,
  filePath,
  title,
  category,
  className,
}: FileTypeIconProps) {
  const fName = (filename || fileName || filePath || "").trim();
  const format = (fileFormat || "").trim().toUpperCase();
  const mime = (mimeType || "").trim().toLowerCase();
  const rawTitle = (title || "").trim();
  const rawCategory = (category || "").trim();

  const combined = `${fName} ${format} ${mime} ${rawTitle} ${rawCategory}`.toUpperCase();

  const isPdf =
    fName.toLowerCase().endsWith(".pdf") ||
    fName.toLowerCase().includes(".pdf") ||
    mime.includes("pdf") ||
    format === "PDF" ||
    combined.includes(".PDF") ||
    /\bPDF\b/i.test(fName) ||
    /\bPDF\b/i.test(rawTitle);

  const isDocx =
    fName.toLowerCase().endsWith(".docx") ||
    fName.toLowerCase().includes(".docx") ||
    mime.includes("wordprocessingml") ||
    format === "DOCX" ||
    combined.includes(".DOCX") ||
    /\bDOCX\b/i.test(fName) ||
    /\bDOCX\b/i.test(rawTitle);

  const isDoc =
    !isDocx &&
    (fName.toLowerCase().endsWith(".doc") ||
      fName.toLowerCase().includes(".doc") ||
      mime.includes("msword") ||
      format === "DOC" ||
      combined.includes(".DOC") ||
      /\bDOC\b/i.test(fName) ||
      /\bWORD\b/i.test(fName) ||
      /\bWORD\b/i.test(rawTitle));

  const isTxt =
    fName.toLowerCase().endsWith(".txt") ||
    fName.toLowerCase().includes(".txt") ||
    mime.includes("text/plain") ||
    mime.includes("text/") ||
    format === "TXT" ||
    combined.includes(".TXT") ||
    /\bTXT\b/i.test(fName) ||
    /\bTXT\b/i.test(rawTitle);

  const isXls =
    fName.toLowerCase().endsWith(".xls") ||
    fName.toLowerCase().endsWith(".xlsx") ||
    fName.toLowerCase().endsWith(".csv") ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    format === "XLS" ||
    format === "XLSX" ||
    combined.includes(".XLS") ||
    combined.includes(".XLSX") ||
    combined.includes(".CSV") ||
    combined.includes("EXCEL");

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

  if (isDocx) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform text-blue-600 select-none",
          className
        )}
        title="Word Document (DOCX)"
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
        <span className="text-[7.5px] font-black tracking-wider text-blue-700 font-sans leading-none mt-0.5">
          DOCX
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
        title="Word Document (DOC)"
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

  // Default to PDF (institutional compliance standard)
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
