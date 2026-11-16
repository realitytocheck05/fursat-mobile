/**
 * Runs the real migration + generated seed on PGlite (Postgres compiled to WASM) and checks RLS
 * the way Supabase applies it: roles anon / authenticated, auth.uid() from the JWT "sub" claim.
 */
import { PGlite } from "@electric-sql/pglite";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const db = new PGlite();

const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
`;
// Supabase's own defaults: anon/authenticated get table + function privileges by default; RLS and explicit revokes do the gating.
const DEFAULT_PRIVILEGES = `
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const GUEST_A = "11111111-1111-4111-8111-111111111111";
const GUEST_B = "22222222-2222-4222-8222-222222222222";
const STAFF = "33333333-3333-4333-8333-333333333333";

async function as<T>(role: "anon" | "authenticated", sub: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const count = async (sql: string) => Number((await db.query<{ n: string }>(`select count(*)::int as n from (${sql}) x`)).rows[0]!.n);

let s1 = "",
  s2 = "";

beforeAll(async () => {
  await db.exec(SUPABASE_STUBS);
  await db.exec(DEFAULT_PRIVILEGES);
  await db.exec(readFileSync(join(root, "supabase/migrations/0001_init.sql"), "utf8"));
  await db.exec(readFileSync(join(root, "supabase/migrations/0002_create_order.sql"), "utf8"));
  const seed = join(root, "supabase/seed.sql");
  if (!existsSync(seed)) throw new Error("Run `pnpm import:fursat <path-to-fursat-astro>` first to generate supabase/seed.sql");
  await db.exec(readFileSync(seed, "utf8"));
  // second tenant to prove isolation
  await db.exec(`insert into tenants (slug, name) values ('richmond-house', 'Richmond House (demo)');
    insert into menu_sections (id, tenant, side, name) values ('rh:food:x', 'richmond-house', 'food', 'X');
    insert into menu_items (id, tenant, section_id, source_name, price_paise) values ('rh:food:x:y', 'richmond-house', 'rh:food:x', 'Y', 100);
    insert into dining_tables (tenant, code, label) values ('richmond-house', '201', 'Room 201');
    insert into staff (tenant, user_id, role, display_name) values ('fursat', '${STAFF}', 'manager', 'Manager');`);
  const t = await db.query<{ id: string; code: string }>(`select id, code from dining_tables where tenant='fursat' and code in ('R1','R2') order by code`);
  s1 = (await db.query<{ id: string }>(`insert into table_sessions (tenant, table_id) values ('fursat', '${t.rows[0]!.id}') returning id`)).rows[0]!.id;
  s2 = (await db.query<{ id: string }>(`insert into table_sessions (tenant, table_id) values ('fursat', '${t.rows[1]!.id}') returning id`)).rows[0]!.id;
  await db.exec(`insert into session_guests values ('${s1}', '${GUEST_A}'), ('${s2}', '${GUEST_B}');
    insert into orders (tenant, session_id, guest_user_id, client_order_id, subtotal_paise, total_paise) values
      ('fursat', '${s1}', '${GUEST_A}', gen_random_uuid(), 19900, 20895),
      ('fursat', '${s2}', '${GUEST_B}', gen_random_uuid(), 29900, 31395);`);
});

describe("seed matches the website data", () => {
  it("imports every food and drink item with exact prices", async () => {
    const food = JSON.parse(readFileSync(join(root, "apps/guest/public/data/fursat-menu.json"), "utf8"));
    expect(await count(`select 1 from menu_items where tenant='fursat' and id like 'fursat:food:%'`)).toBe(food.items.filter((i: { id: string }) => i.id.includes(":food:")).length);
    expect(await count(`select 1 from menu_items where tenant='fursat' and id like 'fursat:drinks:%'`)).toBe(food.items.filter((i: { id: string }) => i.id.includes(":drinks:")).length);
    expect(await count(`select 1 from menu_items where price_paise % 100 <> 0`)).toBe(0);
    expect(await count(`select 1 from packages where tenant='fursat'`)).toBeGreaterThan(0);
  });
  it("seed is idempotent", async () => {
    const before = await count(`select 1 from menu_items`);
    await db.exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));
    expect(await count(`select 1 from menu_items`)).toBe(before);
  });
});

describe("row level security", () => {
  it("anyone can read the menu, nobody anonymous can read orders", async () => {
    await as("anon", null, async () => {
      expect(await count(`select 1 from menu_items where tenant='fursat'`)).toBeGreaterThan(100);
      expect(await count(`select 1 from orders`)).toBe(0);
    });
  });
  it("a guest sees only their table's bill", async () => {
    await as("authenticated", GUEST_A, async () => {
      expect(await count(`select 1 from orders`)).toBe(1);
      expect(await count(`select 1 from orders where session_id='${s2}'`)).toBe(0);
    });
  });
  it("guests cannot create orders directly (server builds them)", async () => {
    await as("authenticated", GUEST_A, async () => {
      await expect(db.exec(`insert into orders (tenant, session_id, guest_user_id, client_order_id, subtotal_paise, total_paise) values ('fursat', '${s1}', '${GUEST_A}', gen_random_uuid(), 1, 1)`)).rejects.toThrow();
    });
  });
  it("guests can call a waiter only from an open session they joined", async () => {
    await as("authenticated", GUEST_A, async () => {
      await db.exec(`insert into service_calls (tenant, session_id, guest_user_id, kind) values ('fursat', '${s1}', '${GUEST_A}', 'waiter')`);
      await expect(db.exec(`insert into service_calls (tenant, session_id, guest_user_id, kind) values ('fursat', '${s2}', '${GUEST_A}', 'waiter')`)).rejects.toThrow();
    });
    await db.exec(`update table_sessions set closed_at = now() where id = '${s1}'`);
    await as("authenticated", GUEST_A, async () => {
      await expect(db.exec(`insert into service_calls (tenant, session_id, guest_user_id, kind) values ('fursat', '${s1}', '${GUEST_A}', 'water')`)).rejects.toThrow();
    });
  });
  it("staff see their own tenant only and follow the kitchen flow", async () => {
    await as("authenticated", STAFF, async () => {
      expect(await count(`select 1 from orders`)).toBe(2);
      expect(await count(`select 1 from dining_tables where tenant='richmond-house'`)).toBe(0);
      await db.exec(`update orders set status='accepted' where session_id='${s2}'`);
      await expect(db.exec(`update orders set status='served' where session_id='${s2}'`)).rejects.toThrow(/invalid order status/);
    });
  });
  it("create_order is atomic, idempotent and server-only", async () => {
    const cid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const lines = JSON.stringify([{ itemId: "fursat:food:desserts:tiramisu", name: "Tiramisu", unitPaise: 29900, qty: 2 }]);
    const totals = JSON.stringify({ subtotal: 59800, cgst: 1495, sgst: 1495, igst: 0, total: 62790 });
    const call = `select public.create_order('fursat', '${s2}', '${GUEST_B}', '${cid}', '${totals}'::jsonb, false, '${lines}'::jsonb) as id`;
    const a = (await db.query<{ id: string }>(call)).rows[0]!.id;
    const b = (await db.query<{ id: string }>(call)).rows[0]!.id;
    expect(a).toBe(b);
    expect(await count(`select 1 from order_items where order_id='${a}'`)).toBe(1);
    // closed session and non-member are refused
    await expect(db.query(`select public.create_order('fursat', '${s1}', '${GUEST_A}', gen_random_uuid(), '${totals}'::jsonb, false, '${lines}'::jsonb)`)).rejects.toThrow(/SESSION_CLOSED/);
    await expect(db.query(`select public.create_order('fursat', '${s2}', '${GUEST_A}', gen_random_uuid(), '${totals}'::jsonb, false, '${lines}'::jsonb)`)).rejects.toThrow(/NOT_IN_SESSION/);
    // guests cannot call it
    await as("authenticated", GUEST_B, async () => {
      await expect(db.query(`select public.create_order('fursat', '${s2}', '${GUEST_B}', gen_random_uuid(), '${totals}'::jsonb, false, '${lines}'::jsonb)`)).rejects.toThrow(/permission denied/);
    });
  });
  it("one open session per table", async () => {
    const tid = (await db.query<{ table_id: string }>(`select table_id from table_sessions where id='${s2}'`)).rows[0]!.table_id;
    await expect(db.exec(`insert into table_sessions (tenant, table_id) values ('fursat', '${tid}')`)).rejects.toThrow();
  });
});
