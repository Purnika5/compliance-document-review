import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";
import { SubmissionsSkeleton } from "@/features/documents/components/submissions-skeleton";

/**
 * DOCU: Renders the advisor-only submitted documents view with skeleton loading.
 * Last Updated Date: September 18, 2026
 * @returns The guarded submissions view.
 * @author Keith
 */
export default function SubmissionsPage() {
  return (
    <RoleGuard allowedRole="Advisor">
      <Suspense fallback={<SubmissionsSkeleton />}>
        <MyDocumentsTable view="register" />
      </Suspense>
    </RoleGuard>
  );
}
