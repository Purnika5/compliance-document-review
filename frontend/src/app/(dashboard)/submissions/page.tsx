import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";

/**
 * DOCU: Renders the advisor-only submitted documents view.
 * Last Updated Date: September 8, 2026
 * @returns The guarded submissions view.
 * @author Keith
 */
export default function SubmissionsPage() {
  return (
    <RoleGuard allowedRole="Advisor">
      <Suspense fallback={null}>
        <MyDocumentsTable />
      </Suspense>
    </RoleGuard>
  );
}
