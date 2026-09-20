"use client";

import { Suspense, useSyncExternalStore } from "react";
import { authStore, type UserSession } from "@/lib/auth/auth-store";
import { MyDocumentsTable } from "@/features/documents/components/my-documents-table";
import { DocumentQueueTable } from "@/features/documents/components/document-queue-table";
import { DashboardSkeleton } from "@/features/documents/components/dashboard-skeleton";
import { QueueSkeleton } from "@/features/documents/components/queue-skeleton";

/**
 * DOCU: Dynamically renders the authenticated workspace overview (Review Queue for Officer, Submissions for Advisor).
 * Last Updated Date: September 20, 2026
 * @returns Role-adaptive dashboard view.
 * @author Keith
 */
export default function DashboardPage() {
  const session = useSyncExternalStore<UserSession | null>(
    authStore.subscribe,
    authStore.getSession,
    authStore.getServerSnapshot
  );

  const isOfficer = session?.role === "Officer";

  if (isOfficer) {
    return (
      <Suspense fallback={<QueueSkeleton />}>
        <DocumentQueueTable />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyDocumentsTable view="dashboard" />
    </Suspense>
  );
}

