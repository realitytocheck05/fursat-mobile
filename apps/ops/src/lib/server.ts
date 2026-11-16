import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Guest app origins allowed to call the API: the PWA, local dev, and the Capacitor store apps. */
const ALLOWED_ORIGINS = new Set([
  "https://app.fursatind.in",
  "http://localhost:5173",
  "http://localhost:4173",
  "capacitor://localhost", // iOS store app
  "https://localhost", // Android store app (androidScheme https)
]);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors(req) });
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

let admin: SupabaseClient | null = null;
/** Service-role client: bypasses RLS. Use only after validating the request yourself. */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** The guest's Supabase user (anonymous or phone) from the Bearer token, verified by Supabase Auth. */
export async function requireUser(req: Request): Promise<{ id: string } | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

export const tableSecret = () => env("TABLE_QR_SECRET");
