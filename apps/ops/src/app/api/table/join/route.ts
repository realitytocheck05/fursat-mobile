/**
 * POST /api/table/join   { tenant, code, sig }   Authorization: Bearer <supabase access token (anonymous ok)>
 * Called by the guest app after a table QR scan. Verifies the signed QR, finds the table's OPEN session
 * (or opens one when the tenant allows auto-open), and adds the guest to it. Orders are only accepted inside that session.
 */
import { verifyTableCode } from "@bjn/core";
import { z } from "zod";
import { cors, json, requireUser, supabaseAdmin, tableSecret } from "@/lib/server";

const Body = z.object({ tenant: z.string().regex(/^[a-z0-9-]{2,40}$/), code: z.string().max(16), sig: z.string().max(64) });

export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: cors(req) });

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return json(req, { error: "SIGN_IN_REQUIRED" }, 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: "BAD_REQUEST" }, 400);
  const { tenant, sig } = parsed.data;
  const code = parsed.data.code.trim().toUpperCase();

  if (!(await verifyTableCode(tenant, code, sig, tableSecret()))) return json(req, { error: "INVALID_QR", message: "This QR code is not valid. Please ask your server." }, 403);

  const db = supabaseAdmin();
  const { data: table } = await db.from("dining_tables").select("id, code, label, active, zones(name)").eq("tenant", tenant).eq("code", code).maybeSingle();
  if (!table || !table.active) return json(req, { error: "TABLE_NOT_FOUND", message: "This table is not taking orders. Please ask your server." }, 404);

  let { data: session } = await db.from("table_sessions").select("id").eq("table_id", table.id).is("closed_at", null).maybeSingle();
  if (!session) {
    const { data: t } = await db.from("tenants").select("settings").eq("slug", tenant).single();
    if (!t?.settings?.allowAutoOpen) return json(req, { error: "TABLE_CLOSED", message: "Your table isn't open yet. Please ask your server to open it." }, 409);
    const opened = await db.from("table_sessions").insert({ tenant, table_id: table.id }).select("id").single();
    if (opened.error) {
      // another guest opened it at the same moment (unique open-session index): use theirs
      ({ data: session } = await db.from("table_sessions").select("id").eq("table_id", table.id).is("closed_at", null).maybeSingle());
    } else session = opened.data;
  }
  if (!session) return json(req, { error: "TABLE_CLOSED" }, 409);

  await db.from("session_guests").upsert({ session_id: session.id, user_id: user.id }, { onConflict: "session_id,user_id", ignoreDuplicates: true });
  const zone = (table as { zones?: { name?: string } | null }).zones?.name ?? null;
  return json(req, { sessionId: session.id, table: { code: table.code, label: table.label, zone } });
}
