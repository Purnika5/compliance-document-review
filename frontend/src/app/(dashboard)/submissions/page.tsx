import { RoleGuard } from "@/features/auth/components/role-guard";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";

export default function SubmissionsPage() {
  return (
    <RoleGuard allowedRole="Advisor">
      <MyDocumentsTable />
    </RoleGuard>
  );
}
