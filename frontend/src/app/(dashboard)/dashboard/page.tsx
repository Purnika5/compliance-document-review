import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";
import { DashboardSkeleton } from "@/features/documents/components/dashboard-skeleton";

/**
 * DOCU: Renders the authenticated Advisor dashboard overview with skeleton loading.
 * Last Updated Date: September 18, 2026
 * @returns The guarded advisor dashboard view.
 * @author Keith
 */
export default function DashboardPage() {
  return (
    <RoleGuard allowedRole="Advisor">
      <Suspense fallback={<DashboardSkeleton />}>
        <MyDocumentsTable view="dashboard" />
      </Suspense>
    </RoleGuard>
  );
}
