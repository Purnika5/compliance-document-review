import { ReviewWorkspace } from "@/features/review/components/review-workspace";

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
  return <ReviewWorkspace documentId={resolvedParams.id} />;
}
