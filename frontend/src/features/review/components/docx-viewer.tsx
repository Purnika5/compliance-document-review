"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, FileWarning, Download, FileText } from "lucide-react";

interface DocxViewerProps {
  fileUrl: string;
  zoomLevel?: number;
  title?: string;
  onFallbackToText?: () => void;
}

export function DocxViewer({
  fileUrl,
  zoomLevel = 100,
  title = "Document",
  onFallbackToText,
}: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDocx() {
      if (!fileUrl) {
        setError("Document file URL is not available.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status} ${response.statusText})`);
        }

        const blob = await response.blob();
        if (isCancelled) return;

        // Dynamically import docx-preview so it runs only in the browser
        const { renderAsync } = await import("docx-preview");

        if (containerRef.current && !isCancelled) {
          containerRef.current.innerHTML = "";
          await renderAsync(blob, containerRef.current, undefined, {
            className: "docx",
            inWrapper: true,
            ignoreWidth: true,   // Allow document to fluidly fit container width
            ignoreHeight: true,  // Prevent arbitrary height clipping
            breakPages: false,   // Render continuous full-page flow without cutoffs
            useBase64URL: true,
          });
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("[DocxViewer error]", err);
          setError(
            err instanceof Error ? err.message : "Failed to parse and render Word document."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDocx();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  return (
    <div className="w-full flex-1 flex flex-col items-center relative min-h-0">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs gap-3 min-h-[300px]">
          <Loader2 className="h-8 w-8 text-[#183028] animate-spin" />
          <p className="text-xs font-semibold text-[#183028]">
            Rendering Word Document Preview...
          </p>
        </div>
      )}

      {error ? (
        <div className="text-center p-8 bg-white border border-[#E6E8E7] rounded-2xl space-y-3 max-w-md my-auto shadow-2xs">
          <FileWarning className="h-10 w-10 text-amber-600 mx-auto" />
          <p className="font-semibold text-sm text-[#183028]">Unable to preview Word document natively</p>
          <p className="text-xs text-[#183028]/60">
            {error}
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {onFallbackToText && (
              <button
                type="button"
                onClick={onFallbackToText}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#183028] hover:bg-[#23453a] text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>View Extracted Text</span>
              </button>
            )}
            <a
              href={fileUrl}
              download={title}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-[#183028] border border-[#E6E8E7] hover:bg-[#C5E86C]/20 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </a>
          </div>
        </div>
      ) : (
        <div
          className="w-full flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center p-1 sm:p-3"
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
            width: zoomLevel > 100 ? `${zoomLevel}%` : "100%",
          }}
        >
          <div
            ref={containerRef}
            className="docx-viewer-container w-full max-w-[760px] text-[#183028] transition-all"
          />

          <style jsx global>{`
            .docx-viewer-container {
              width: 100% !important;
              max-width: 760px !important;
              margin: 0 auto !important;
            }
            .docx-viewer-container .docx-wrapper {
              background: transparent !important;
              padding: 0 !important;
              width: 100% !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
            }
            .docx-viewer-container section.docx,
            .docx-viewer-container .docx {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              box-sizing: border-box !important;
              min-height: auto !important;
              margin: 0 auto 20px auto !important;
              padding: 28px 32px !important;
              background: #ffffff !important;
              border: 1px solid #E6E8E7 !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 16px rgba(24, 48, 40, 0.08), 0 1px 3px rgba(24, 48, 40, 0.04) !important;
              overflow-x: hidden !important;
            }
            .docx-viewer-container article {
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
            }
            .docx-viewer-container table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
              margin: 14px 0 !important;
              font-size: 11px !important;
              box-sizing: border-box !important;
            }
            .docx-viewer-container td,
            .docx-viewer-container th {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              padding: 6px 8px !important;
              box-sizing: border-box !important;
              font-size: 11px !important;
            }
            .docx-viewer-container p,
            .docx-viewer-container span,
            .docx-viewer-container h1,
            .docx-viewer-container h2,
            .docx-viewer-container h3 {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
