"use client";

/**
 * DOCU: Document management hooks for listing, filtering, detail loading, uploading, and reviewing.
 * Last Updated Date: September 7, 2026
 * @author Keith
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { documentService } from "@/services/document.service";
import { DocumentItem, DocumentCounts } from "@/entities/interfaces/document.interface";
import { DocumentStatusType } from "@/entities/enums/document.enum";
import { UploadDocumentInput } from "@/schema/document.schema";
import { ReviewDecisionPayload } from "@/entities/interfaces/review.interface";

/**
 * DOCU: Hook for managing document lists (advisor submissions or officer queue) with dynamic status counts and filtering.
 * Last Updated Date: September 7, 2026
 * @param mode - Operational mode: "my-submissions" for advisors or "queue" for compliance officers.
 * @returns Object containing filtered documents, all documents, active status, counts, loading flag, error, and refetch handler.
 * @author Keith
 */
export function useDocuments(mode: "my-submissions" | "queue" = "queue") {
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>("All");
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      let data: DocumentItem[] = [];
      if (mode === "my-submissions") {
        data = await documentService.getMySubmissions();
      } else {
        data = await documentService.getQueue();
      }
      setAllDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
      setAllDocuments([]);
    } finally {
      setIsPending(false);
    }
  }, [mode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  // Compute status counts dynamically
  const counts: DocumentCounts = useMemo(() => {
    return {
      All: allDocuments.length,
      Pending: allDocuments.filter((d) => d.status === "Pending").length,
      Approved: allDocuments.filter((d) => d.status === "Approved").length,
      "Needs Revision": allDocuments.filter((d) => d.status === "Needs Revision").length,
      Rejected: allDocuments.filter((d) => d.status === "Rejected").length,
    };
  }, [allDocuments]);

  // Filter documents by status
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
    error,
    counts,
    refetch: loadDocuments,
  };
}

/**
 * DOCU: Hook for loading a single document's details and managing its loading/error state.
 * Last Updated Date: September 7, 2026
 * @param id - Document unique identifier.
 * @returns Object containing the document item, loading state, error, and refetch handler.
 * @author Keith
 */
export function useDocumentDetail(id: string) {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsPending(true);
    setError(null);
    try {
      const doc = await documentService.getDocumentById(id);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsPending(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { document, isPending, error, refetch: load };
}

/**
 * DOCU: Hook for executing document upload mutation with file attachment and progress state.
 * Last Updated Date: September 7, 2026
 * @returns Object containing the upload action handler, isUploading flag, and error state.
 * @author Keith
 */
export function useUploadDocument() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (data: UploadDocumentInput & { file?: File }) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await documentService.uploadDocument(data);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}

/**
 * DOCU: Hook for submitting compliance review decisions with reviewer feedback notes.
 * Last Updated Date: September 7, 2026
 * @returns Object containing the submitDecision handler, isSubmitting flag, and error state.
 * @author Keith
 */
export function useReviewDecision() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDecision = useCallback(
    async (documentId: string, decision: ReviewDecisionPayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await documentService.submitDecision(documentId, decision);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Decision submission failed";
        setError(msg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { submitDecision, isSubmitting, error };
}
