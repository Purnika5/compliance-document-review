import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AssignedReviewsView } from "@/features/documents/components/assigned-reviews-view";
import { QueueSkeleton } from "@/features/documents/components/queue-skeleton";

/**
 * DOCU: Renders the officer-only assigned regulatory review portfolio with skeleton loading.
 * Last Updated Date: September 18, 2026
 * @returns The guarded assigned reviews view.
 * @author Keith
 */
export default function AssignedPage() {
  return (
    <RoleGuard allowedRole="Officer">
      <Suspense fallback={<QueueSkeleton />}>
        <AssignedReviewsView />
      </Suspense>
    </RoleGuard>
  );
}
