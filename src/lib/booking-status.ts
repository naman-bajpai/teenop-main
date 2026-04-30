/**
 * Pre-payment acceptance was historically stored as "confirmed".
 * New bookings use "awaiting_payment"; keep accepting legacy "confirmed" when reading.
 */
export function isAwaitingPaymentStatus(status: string | null | undefined): boolean {
  return status === "awaiting_payment" || status === "confirmed";
}

/** API accepts legacy "confirmed" PATCH body and maps it to awaiting_payment. */
export function normalizeIncomingBookingStatus(status: string): string {
  return status === "confirmed" ? "awaiting_payment" : status;
}

export function formatBookingStatusLabel(status: string): string {
  if (isAwaitingPaymentStatus(status)) return "Waiting for payment";
  const map: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
    alternative_proposed: "Alternative proposed",
    in_progress: "In progress",
  };
  return map[status] ?? status.replace(/_/g, " ");
}
