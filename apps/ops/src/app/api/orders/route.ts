/**
 * POST /api/orders   { sessionId, clientOrderId, lines:[{itemId, qty, note?}], barConfirmed21? }
 * Authorization: Bearer <supabase access token>
 * Re-prices everything from the database (packages/core buildOrder), then creates the order atomically
 * and idempotently (public.create_order). The client never sends prices.
 */
import { DEFAULT_TAX, buildOrder, type MenuRowForOrder } from "@bjn/core";
import { z } from "zod";
import { cors, json, requireUser, supabaseAdmin } from "@/lib/server";

const Body = z.object({
  sessionId: z.uuid(),
  clientOrderId: z.uuid(),
  lines: z.array(z.object({ itemId: z.string().max(200), qty: z.number().int(), note: z.string().max(140).optional() })).min(1).max(30),
  barConfirmed21: z.boolean().optional(),
});

export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: cors(req) });

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return json(req, { error: "SIGN_IN_REQUIRED" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: "BAD_REQUEST" }, 400);
  const input = parsed.data;
  const db = supabaseAdmin();

  const { data: session } = await db.from("table_sessions").select("id, tenant, closed_at").eq("id", input.sessionId).maybeSingle();
  const { data: member } = await db.from("session_guests").select("user_id").eq("session_id", input.sessionId).eq("user_id", user.id).maybeSingle();
  if (!session || !member) return json(req, { error: "NOT_IN_SESSION", message: "Please scan the QR on your table again." }, 403);

  const { data: tenant } = await db.from("tenants").select("settings").eq("slug", session.tenant).single();
  const s = (tenant?.settings ?? {}) as { gstBps?: number; intraState?: boolean; barOrdersViaQr?: boolean };

  const ids = [...new Set(input.lines.map((l) => l.itemId))];
  const { data: rows, error } = await db.from("menu_items").select("id, tenant, source_name, price_paise, available, is_bar").in("id", ids);
  if (error) return json(req, { error: "MENU_UNAVAILABLE" }, 503);
  const menu = new Map((rows as MenuRowForOrder[]).map((r) => [r.id, r]));

  const result = buildOrder(input, menu, session, {
    tax: { gstBps: s.gstBps ?? DEFAULT_TAX.gstBps, intraState: s.intraState ?? DEFAULT_TAX.intraState },
    barOrdersViaQr: s.barOrdersViaQr ?? false,
    maxLines: 30,
  });
  if (!result.ok) return json(req, { error: result.code, message: result.message, itemId: result.itemId }, 422);

  const { data: orderId, error: rpcError } = await db.rpc("create_order", {
    p_tenant: session.tenant,
    p_session: session.id,
    p_guest: user.id,
    p_client_order_id: input.clientOrderId,
    p_totals: result.totals,
    p_has_bar: result.hasBar,
    p_lines: result.lines,
  });
  if (rpcError) {
    const code = /SESSION_CLOSED|NOT_IN_SESSION/.exec(rpcError.message)?.[0] ?? "ORDER_FAILED";
    return json(req, { error: code }, code === "ORDER_FAILED" ? 500 : 409);
  }
  // Session C5: hand the order to the POS adapter (Rista or KOT print) here, after the order exists.
  return json(req, { orderId, totals: result.totals });
}
