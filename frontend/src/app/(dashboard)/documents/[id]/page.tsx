import { ReviewWorkspace } from "@/features/review/components/review-workspace";

interface DocumentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const resolvedParams = await params;
  return <ReviewWorkspace documentId={resolvedParams.id} />;
}
