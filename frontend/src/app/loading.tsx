import { AppWorkspaceLoader } from "@/components/shared/app-workspace-loader";

/**
 * DOCU: Next.js App Router root loading handler displayed before opening the app routes.
 * Last Updated Date: September 13, 2026
 * @returns The institutional workspace loader component.
 * @author Keith
 */
export default function Loading() {
  return <AppWorkspaceLoader title="Connecting to Workspace" />;
}
