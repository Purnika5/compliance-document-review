import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AssignedReviewsView } from "@/features/documents/components/assigned-reviews-view";

/**
 * DOCU: Renders the officer-only assigned regulatory review portfolio.
 * Last Updated Date: September 8, 2026
 * @returns The guarded assigned reviews view.
 * @author Keith
 */
export default function AssignedPage() {
  return (
    <RoleGuard allowedRole="Officer">
      <Suspense fallback={null}>
        <AssignedReviewsView />
      </Suspense>
    </RoleGuard>
  );
}
