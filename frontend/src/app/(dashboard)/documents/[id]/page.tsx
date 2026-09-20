import { Suspense } from "react";
import { ReviewWorkspace } from "@/features/review/components/review-workspace";
import { ReviewWorkspaceSkeleton } from "@/features/review/components/review-workspace-skeleton";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DOCU: Resolves a document route parameter and renders its review workspace.
 * Last Updated Date: September 3, 2026
 * @param params - Promise containing the document identifier from the route.
 * @returns The document review workspace.
 * @author Keith
 */
export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const resolvedParams = await params;
  const docId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id).trim() : "";
  return (
    <Suspense fallback={<ReviewWorkspaceSkeleton />}>
      <ReviewWorkspace documentId={docId} />
    </Suspense>
  );
}
