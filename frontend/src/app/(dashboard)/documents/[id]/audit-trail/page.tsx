import { redirect } from "next/navigation";

/**
 * DOCU: Redirects /documents/[id]/audit-trail to the document review workspace with the audit tab active.
 * Last Updated Date: September 23, 2026
 * @author Keith
 */
export default async function DocumentAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/documents/${id}?tab=audit`);
}
