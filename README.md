# BJNEXUS Hospitality Platform · FURSAT app starter

One codebase, three ways to ship. The **guest app** is a Vite + React PWA that installs from the browser, and the *same build* is wrapped by **Capacitor 8** for Google Play and the App Store. The **ops app** (Next.js 16) is the staff board, owner console and API. **Supabase** (Mumbai) is the database, auth and realtime.

```
apps/guest      Vite 8 + React 19 + Tailwind 4 + Motion → PWA (app.fursatind.in) + Capacitor iOS/Android
apps/ops        Next.js 16 → staff board, owner console, API (ops.fursatind.in)
packages/brand  real tenant tokens (FURSAT from fk-tokens.css; Richmond demo from the brand pack)
packages/core   money, GST, signed table QR, order rules, menu import (pure TS, tested)
supabase/       migrations (schema + RLS + create_order) and the generated seed
scripts/        import-fursat.ts (website JSON → seed + offline menu + photos)
```

## What is already verified (run `pnpm test`)
- 26 tests pass: GST 5% split CGST/SGST with rounding, no service charge; signed table QR (tamper, other table, other tenant, junk); kitchen status flow; menu import (exact names/prices, stable ids, photo matching); server-side order building (closed table, sold out, other tenant, bar 21+ and bar-by-QR switch, idempotent ids); brand contrast (WCAG 4.5:1 for every text role).
- The real migration + seed run on Postgres (PGlite) with Supabase roles: anyone reads the menu; anonymous can't read orders; a guest sees only their own table's bill; guests can't insert orders; waiter calls only from an open session they joined; staff see only their tenant; status can only move along the kitchen flow; one open session per table; `create_order` is atomic, idempotent and server-only.
- Imported from the website (commit 2e19aba): **212 food items (21 sections), 168 drinks (19 sections, 94 bar), 11 party packages, 28 dish photos.**
- `apps/guest` typechecks and builds (PWA, service worker, 127 KB JS gzip). `apps/ops` builds (Next.js 16).

## Automatic checks (GitHub Actions)
Every push runs `.github/workflows/ci.yml`: install, all tests (including database + RLS on Postgres), typecheck, guest build with a 170 KB JS budget, ops build, and a scan that no secret names reach the guest app. Open the repo's **Actions** tab after each push: green = safe to start the next session; red = open the failed step, copy the error, run the FIX prompt from the playbook.

## Quick start (GitHub Codespace)
```
cd /workspaces
```
```
git clone https://github.com/alekyareality/fursat-astro.git
```
```
cd /workspaces/bjnexus-hospitality
```
```
pnpm install
```
```
pnpm import:fursat /workspaces/fursat-astro
```
```
pnpm test
```
```
pnpm dev:guest
```
Open port 5173. Add `?table=R3` to see the at-table header.

## Supabase (once)
1. Create a project in **Mumbai (ap-south-1)**. In Auth → Providers, turn on **Anonymous sign-ins** and Email (for staff).
2. SQL editor: run `supabase/migrations/0001_init.sql`, then `0002_create_order.sql`, then `supabase/seed.sql`.
3. Copy `.env.example` to `.env` (ops) and `apps/guest/.env` (only the `VITE_*` lines). Set `TABLE_QR_SECRET` to 32+ random characters.

## Store builds (needs a Mac with Xcode 26 for iOS, Android Studio for Android)
```
cd apps/guest
```
```
pnpm cap:add
```
```
pnpm cap:sync
```
```
pnpm cap:android
```
```
pnpm cap:ios
```
Before submitting, do session S1 (native features) and S2 (store compliance) from the plan. A bare web wrapper gets rejected under Apple guideline 4.2.

## Rules every session keeps
Real data only (menu, prices, photos from the website repo; unknown facts = `TODO(client)`), colours only from `packages/brand`, no automatic service charge, bar 21+ and dine-in only, guests never write orders directly, owner pushes (never push or deploy from a session).
