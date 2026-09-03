import { RoleGuard } from "@/features/auth/components/role-guard";
import { DocumentQueueTable } from "@/features/documents/components/document-queue-table";

export default function QueuePage() {
  return (
    <RoleGuard allowedRole="Officer">
      <DocumentQueueTable />
    </RoleGuard>
  );
}
