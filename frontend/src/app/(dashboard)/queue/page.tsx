import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { DocumentQueueTable } from "@/features/documents/components/document-queue-table";

/**
 * DOCU: Renders the officer-only document review queue.
 * Last Updated Date: September 8, 2026
 * @returns The guarded document queue view.
 * @author Keith
 */
export default function QueuePage() {
  return (
    <RoleGuard allowedRole="Officer">
      <Suspense fallback={null}>
        <DocumentQueueTable />
      </Suspense>
    </RoleGuard>
  );
}
