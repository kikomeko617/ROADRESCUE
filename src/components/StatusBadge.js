import { statusLabel } from "@/lib/constants";

const OTHER = {
  PENDING: "Pending", HELD: "Held (escrow)", RELEASED: "Released", REFUNDED: "Refunded", FAILED: "Failed",
  APPROVED: "Approved", SUSPENDED: "Suspended", OPEN: "Open", REVISIT: "Revisit", REJECTED: "Rejected",
};

// kind = "mechanic" or "driver", so a driver job says "Driver on the way".
export default function StatusBadge({ status, kind = "mechanic" }) {
  const order = statusLabel(status, kind);
  return <span className={`badge badge-${status}`}>{order !== status ? order : OTHER[status] || status}</span>;
}
