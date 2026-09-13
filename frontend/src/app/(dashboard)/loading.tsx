import { AppWorkspaceLoader } from "@/components/shared/app-workspace-loader";

/**
 * DOCU: Next.js loading handler for dashboard route transitions.
 * Last Updated Date: September 13, 2026
 * @returns The workspace loading animation.
 * @author Keith
 */
export default function DashboardLoading() {
  return <AppWorkspaceLoader title="Initializing Workspace" />;
}
