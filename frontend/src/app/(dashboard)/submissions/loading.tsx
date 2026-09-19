import { SubmissionsSkeleton } from "@/features/documents/components/submissions-skeleton";

/**
 * DOCU: Next.js route loading skeleton for /submissions.
 * @returns Instant skeleton layout during navigation and loading.
 */
export default function SubmissionsLoading() {
  return <SubmissionsSkeleton />;
}
