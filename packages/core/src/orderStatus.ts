export const ORDER_STATUSES = ["placed", "accepted", "preparing", "ready", "served", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served"],
  served: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

/** The single "advance" button on the staff board. */
export const nextStatus = (from: OrderStatus): OrderStatus | null => NEXT[from].find((s) => s !== "cancelled") ?? null;

export const isOpen = (s: OrderStatus) => s !== "served" && s !== "cancelled";

/** Guest-facing step index for the status ribbon (cancelled = -1). */
export const ribbonStep = (s: OrderStatus): number => (s === "cancelled" ? -1 : ORDER_STATUSES.indexOf(s));

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Sent to kitchen",
  accepted: "Accepted",
  preparing: "Being prepared",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};
