import { Suspense } from "react";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AuditHistoryView } from "@/features/audit/components/audit-history-view";
import { AuditSkeleton } from "@/features/audit/components/audit-skeleton";

/**
 * DOCU: Renders the officer regulatory audit history and cryptographic ledger.
 * Last Updated Date: September 8, 2026
 * @returns The guarded audit history view.
 * @author Keith
 */
export default function AuditPage() {
  return (
    <RoleGuard allowedRole="Officer">
      <Suspense fallback={<AuditSkeleton />}>
        <AuditHistoryView />
      </Suspense>
    </RoleGuard>
  );
}
