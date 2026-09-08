import { RoleGuard } from "@/features/auth/components/role-guard";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";

/**
 * DOCU: Renders the advisor-only submitted documents view.
 * Last Updated Date: September 3, 2026
 * @returns The guarded submissions view.
 * @author Keith
 */
export default function SubmissionsPage() {
  return (
    <RoleGuard allowedRole="Advisor">
      <MyDocumentsTable />
    </RoleGuard>
  );
}
