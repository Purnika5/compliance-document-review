"use client";

import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { DocumentQueueTable } from "@/features/documents/components/document-queue-table";
import { QueueSkeleton } from "@/features/documents/components/queue-skeleton";

/**
 * DOCU: Renders the officer-only document review queue.
 * Last Updated Date: September 8, 2026
 * @returns The guarded document queue view.
 * @author Keith
 */
export default function QueuePage() {
  return (
    <RoleGuard allowedRole="Officer">
      <Suspense fallback={<QueueSkeleton />}>
        <DocumentQueueTable />
      </Suspense>
    </RoleGuard>
  );
}
