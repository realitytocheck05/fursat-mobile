/**
 * Server-side order building. The client sends only item ids, quantities and notes.
 * Prices, availability, bar rules and the table session are checked here, never trusted from the client.
 */
import { billTotals, type BillTotals, type PricedLine, type TaxSettings } from "./pricing";

export interface CartLineInput {
  itemId: string;
  qty: number;
  note?: string;
}
export interface PlaceOrderInput {
  clientOrderId: string; // uuid made on the device, makes retries idempotent
  lines: CartLineInput[];
  barConfirmed21?: boolean; // guest confirmed 21+ in the app
}
export interface MenuRowForOrder {
  id: string;
  tenant: string;
  source_name: string;
  price_paise: number;
  available: boolean;
  is_bar: boolean;
}
export interface SessionForOrder {
  id: string;
  tenant: string;
  closed_at: string | null;
}
export interface OrderSettings {
  tax: TaxSettings;
  barOrdersViaQr: boolean; // FURSAT decides: may drinks with alcohol be ordered by QR?
  maxLines: number;
}

export type BuildOrderResult =
  | { ok: true; lines: PricedLine[]; totals: BillTotals; hasBar: boolean }
  | { ok: false; code: "SESSION_CLOSED" | "EMPTY" | "TOO_MANY" | "BAD_LINE" | "UNKNOWN_ITEM" | "SOLD_OUT" | "BAR_NOT_ALLOWED" | "BAR_NOT_CONFIRMED" | "BAD_ID"; message: string; itemId?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildOrder(input: PlaceOrderInput, menu: Map<string, MenuRowForOrder>, session: SessionForOrder | null, settings: OrderSettings): BuildOrderResult {
  if (!session || session.closed_at) return { ok: false, code: "SESSION_CLOSED", message: "Your table is not open for orders. Please ask your server." };
  if (!UUID_RE.test(input.clientOrderId)) return { ok: false, code: "BAD_ID", message: "Invalid order id." };
  if (!input.lines.length) return { ok: false, code: "EMPTY", message: "Your order is empty." };
  if (input.lines.length > settings.maxLines) return { ok: false, code: "TOO_MANY", message: `Up to ${settings.maxLines} different dishes per order.` };

  const merged = new Map<string, CartLineInput>();
  for (const l of input.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return { ok: false, code: "BAD_LINE", message: "Quantity must be 1 to 20.", itemId: l.itemId };
    const note = l.note?.trim().slice(0, 140) || undefined;
    const key = `${l.itemId}|${note ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { itemId: l.itemId, qty: (prev?.qty ?? 0) + l.qty, note });
  }

  const lines: PricedLine[] = [];
  let hasBar = false;
  for (const l of merged.values()) {
    const row = menu.get(l.itemId);
    if (!row || row.tenant !== session.tenant) return { ok: false, code: "UNKNOWN_ITEM", message: "One dish is no longer on the menu.", itemId: l.itemId };
    if (!row.available) return { ok: false, code: "SOLD_OUT", message: `${row.source_name} is sold out right now.`, itemId: l.itemId };
    if (row.is_bar) {
      hasBar = true;
      if (!settings.barOrdersViaQr) return { ok: false, code: "BAR_NOT_ALLOWED", message: "Please order drinks from the bar through your server.", itemId: l.itemId };
      if (!input.barConfirmed21) return { ok: false, code: "BAR_NOT_CONFIRMED", message: "Please confirm you are 21 or older to order from the bar.", itemId: l.itemId };
    }
    lines.push({ itemId: row.id, name: row.source_name, unitPaise: row.price_paise, qty: Math.min(l.qty, 20), note: l.note });
  }
  return { ok: true, lines, totals: billTotals(lines, settings.tax), hasBar };
}
