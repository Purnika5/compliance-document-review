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
export function useDocuments(mode: "my-submissions" | "queue" = "queue", statusFilter: string = "All") {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [statusCounts, setStatusCounts] = useState<{
    All: number;
    Pending: number;
    Approved: number;
    "Needs Revision": number;
    Rejected: number;
  }>({
    All: 0,
    Pending: 0,
    Approved: 0,
    "Needs Revision": 0,
    Rejected: 0,
  });
  const [isPending, setIsPending] = useState(true);

  const loadDocuments = useCallback(async () => {
    setIsPending(true);
    try {
      let data: DocumentItem[] = [];
      if (mode === "my-submissions") {
        data = await getMySubmissionsAction();
        setDocuments(data);
        setStatusCounts({
          All: data.length,
          Pending: data.filter((d) => d.status === "Pending").length,
          Approved: data.filter((d) => d.status === "Approved").length,
          "Needs Revision": data.filter((d) => d.status === "Needs Revision").length,
          Rejected: data.filter((d) => d.status === "Rejected").length,
        });
      } else {
        data = await getQueueAction(statusFilter);
        setDocuments(data);

        if (statusFilter === "All") {
          setStatusCounts({
            All: data.length,
            Pending: data.filter((d) => d.status === "Pending").length,
            Approved: data.filter((d) => d.status === "Approved").length,
            "Needs Revision": data.filter((d) => d.status === "Needs Revision").length,
            Rejected: data.filter((d) => d.status === "Rejected").length,
          });
        } else {
          getQueueAction("All").then((allDocs) => {
            setStatusCounts({
              All: allDocs.length,
              Pending: allDocs.filter((d) => d.status === "Pending").length,
              Approved: allDocs.filter((d) => d.status === "Approved").length,
              "Needs Revision": allDocs.filter((d) => d.status === "Needs Revision").length,
              Rejected: allDocs.filter((d) => d.status === "Rejected").length,
            });
          }).catch(() => {});
        }
      }
    } catch {
      setDocuments([]);
    } finally {
      setIsPending(false);
    }
  }, [mode, statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return {
    documents,
    allDocuments: documents,
    activeStatus: statusFilter,
    setActiveStatus: () => {},
    isPending,
    counts: statusCounts,
    refetch: loadDocuments,
  };
}
