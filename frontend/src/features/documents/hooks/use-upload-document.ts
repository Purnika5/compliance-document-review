"use client";

/**
 * DOCU: Provides document upload submission and result state management.
 * Last Updated Date: September 7, 2026
 * @returns Upload state and the upload action.
 * @author Keith
 */
import { useState } from "react";
import { uploadDocumentAction } from "@/lib/actions/document-actions";
import type { UploadDocumentInput, DocumentItem } from "@/lib/validation/document";

/**
 * DOCU: Manages document upload modal state and submission lifecycle.
 * Last Updated Date: September 7, 2026
 * @param onSuccess - Optional callback invoked with the uploaded document.
 * @returns Upload state and modal workflow functions.
 * @author Keith
 */
export function useUploadDocument(onSuccess?: (doc: DocumentItem) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setError(null);
  };

  const submitUpload = async (data: UploadDocumentInput) => {
    setIsPending(true);
    setError(null);
    try {
      const doc = await uploadDocumentAction(data);
      setIsPending(false);
      setIsOpen(false);
      if (onSuccess) onSuccess(doc);
      return doc;
    } catch (err) {
      setIsPending(false);
      const msg = err instanceof Error ? err.message : "Document upload failed.";
      setError(msg);
      return null;
    }
  };

  return {
    isOpen,
    openModal,
    closeModal,
    isPending,
    error,
    submitUpload,
  };
}
