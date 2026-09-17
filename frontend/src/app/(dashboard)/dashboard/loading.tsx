import { DashboardSkeleton } from "@/features/documents/components/dashboard-skeleton";

/**
 * DOCU: Route-level loading boundary for /dashboard.
 * Provides instant skeleton placeholder during Next.js App Router navigation.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
