/**
 * Signed table QR codes. URL: https://app.fursatind.in/t/<code>?s=<sig>
 * sig = base64url(HMAC-SHA256(secret, "<tenant>:<code>:v1")) truncated to 16 bytes.
 * Uses Web Crypto, so the same code runs in Node 22, Vercel/Next route handlers, Supabase Edge (Deno) and browsers.
 * The signature only proves the QR is genuine. Whether the guest may ORDER is decided by an open table session (server side).
 */

const enc = new TextEncoder();
const SIG_BYTES = 16;
const CODE_RE = /^[A-Z0-9-]{1,16}$/;

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  if (secret.length < 32) throw new Error("TABLE_QR_SECRET must be at least 32 characters");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

export function normaliseTableCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (!CODE_RE.test(c)) throw new Error(`Invalid table code "${code}"`);
  return c;
}

export async function signTableCode(tenant: string, code: string, secret: string): Promise<string> {
  const mac = await hmac(secret, `${tenant}:${normaliseTableCode(code)}:v1`);
  return b64url(mac.slice(0, SIG_BYTES));
}

/** Constant-time comparison of two strings of equal length. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyTableCode(tenant: string, code: string, sig: string | null | undefined, secret: string): Promise<boolean> {
  if (!sig) return false;
  let c: string;
  try {
    c = normaliseTableCode(code);
  } catch {
    return false;
  }
  return safeEqual(await signTableCode(tenant, c, secret), sig);
}

export async function tableQrUrl(baseUrl: string, tenant: string, code: string, secret: string): Promise<string> {
  const c = normaliseTableCode(code);
  const s = await signTableCode(tenant, c, secret);
  return `${baseUrl.replace(/\/$/, "")}/t/${encodeURIComponent(c)}?s=${s}`;
}
