import { AuditSkeleton } from "@/features/audit/components/audit-skeleton";

/**
 * DOCU: Next.js streaming loading skeleton for /audit.
 * @returns Instant institutional skeleton loading state for the Regulatory Audit Ledger.
 */
export default function AuditLoading() {
  return <AuditSkeleton />;
}
