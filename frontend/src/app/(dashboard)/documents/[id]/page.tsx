import { Suspense } from "react";
import { ReviewWorkspace } from "@/features/review/components/review-workspace";
import { ReviewWorkspaceSkeleton } from "@/features/review/components/review-workspace-skeleton";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
}

/**
 * DOCU: Resolves a document route parameter and renders its review workspace.
 * Last Updated Date: September 21, 2026
 * @param params - Promise containing the document identifier from the route.
 * @param searchParams - Optional query params including active tab.
 * @returns The document review workspace.
 * @author Keith
 */
export default async function DocumentDetailPage({ params, searchParams }: DocumentDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const docId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id).trim() : "";
  const initialTab =
    resolvedSearchParams?.tab === "audit"
      ? "audit"
      : resolvedSearchParams?.tab === "history"
      ? "history"
      : "metadata";

  return (
    <Suspense fallback={<ReviewWorkspaceSkeleton />}>
      <ReviewWorkspace documentId={docId} initialTab={initialTab} />
    </Suspense>
  );
}
