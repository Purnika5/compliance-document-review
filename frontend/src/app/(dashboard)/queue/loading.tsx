import { QueueSkeleton } from "@/features/documents/components/queue-skeleton";

/**
 * DOCU: Next.js streaming loading skeleton for /queue.
 * @returns Instant institutional skeleton loading state for the Review Queue.
 */
export default function QueueLoading() {
  return <QueueSkeleton />;
}
