"use client";

/**
 * DOCU: Provides document list loading, refresh, and error state management.
 * Last Updated Date: September 7, 2026
 * @returns Document list state and refresh controls.
 * @author Keith
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { getMySubmissionsAction, getQueueAction } from "@/lib/actions/document-actions";
import type { DocumentItem, DocumentStatusType } from "@/lib/validation/document";

/**
 * DOCU: Loads and refreshes documents for submissions or the officer queue.
 * Last Updated Date: September 7, 2026
 * @param mode - Document list source to load.
 * @returns Document data, loading state, error state, and refresh function.
 * @author Keith
 */
export function useDocuments(mode: "my-submissions" | "queue" = "queue") {
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>("All");
  const [isPending, setIsPending] = useState(true);

  const loadDocuments = useCallback(async () => {
    setIsPending(true);
    try {
      let data: DocumentItem[] = [];
      if (mode === "my-submissions") {
        data = await getMySubmissionsAction();
      } else {
        data = await getQueueAction("All");
      }
      setAllDocuments(data);
    } catch {
      setAllDocuments([]);
    } finally {
      setIsPending(false);
    }
  }, [mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  // Compute status counts dynamically from all fetched documents
  const counts = useMemo(() => {
    return {
      All: allDocuments.length,
      Pending: allDocuments.filter((d) => d.status === "Pending").length,
      Approved: allDocuments.filter((d) => d.status === "Approved").length,
      "Needs Revision": allDocuments.filter((d) => d.status === "Needs Revision").length,
      Rejected: allDocuments.filter((d) => d.status === "Rejected").length,
    };
  }, [allDocuments]);

  // Client-side filtering — instant, smooth, no loading flicker
  const filteredDocuments = useMemo(() => {
    if (activeStatus === "All") return allDocuments;
    return allDocuments.filter((doc) => doc.status === (activeStatus as DocumentStatusType));
  }, [allDocuments, activeStatus]);

  return {
    documents: filteredDocuments,
    allDocuments,
    activeStatus,
    setActiveStatus,
    isPending,
    counts,
    refetch: loadDocuments,
  };
}
