# HANDOFF

## Status
Starter v0.1.1 (14 Nov 2026, adds CI): monorepo, real brand tokens, core logic, schema + RLS + create_order, importer, guest menu screen, ops API (join table, place order). 26 tests pass; guest and ops build.

## Done
- CI: .github/workflows/ci.yml (tests, typecheck, guest build + 170 KB JS budget, ops build, secret scan) — verified on a clean copy.
- packages/brand: FURSAT tokens 1:1 from fursat-astro@2e19aba fk-tokens.css; Richmond demo from the brand pack (not client-approved).
- packages/core: money/GST (5%, CGST+SGST, no service charge), signed table QR (Web Crypto), order status flow, menu import, buildOrder.
- supabase: 0001_init (all tables, RLS, kitchen-flow trigger, realtime), 0002_create_order (atomic, idempotent, service role only); seed generated from the website data.
- apps/guest: Food | Drinks doors (gold pill, swipe), search, veg filter, section chips with scroll spy, item cards with FSSAI marks and real photos, add/remove with haptics, cart bar (subtotal + GST note), 21+ bar gate sheet (drag to close), offline snapshot, PWA manifest + service worker, Capacitor config, deep-link files (placeholders).
- apps/ops: POST /api/table/join, POST /api/orders, GET /api/health; CORS for PWA + Capacitor origins.

## Env vars
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TABLE_QR_SECRET, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPS_API, VITE_TENANT, PAYU_KEY, PAYU_SALT

## Decisions
- Guest = Vite SPA (static) so the same build is the PWA and the Capacitor store app. Ops = Next.js (server).
- Orders are created only by the server via create_order after buildOrder re-prices from the DB.
- barOrdersViaQr = false and allowAutoOpen = true in the seed until FURSAT decides.
- Menu ids are stable text ids (tenant:side:section:item); removed items become unavailable, never deleted.

## Known issues
- Icons are placeholders (forest + gold "F"): need the real logo (Fursat-Final-Logo 2.ai / Fursat Logo.pdf).
- Guest app reads the offline snapshot; Supabase reads come in B2. The cart is picks-only until C1/C2 wire join + order.
- Fonts load from Google Fonts; self-host Playfair + Poppins before the store build (offline first launch).
- Deep-link files need the Apple Team ID and the Play signing SHA-256.

## Next
B1 (shell + Home) → B2 (menu from Supabase) → B3 (dish sheet + reels) → C1 (QR route in guest calling /api/table/join).
