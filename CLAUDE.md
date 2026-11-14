# CLAUDE.md — Aurelia Fine Jewellery

Read PROJECT_SPEC.md, ARCHITECTURE.md and TASKS.md before changing anything. Going live: DEPLOYMENT.md.

## Stack
- Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3. Requires Node ≥ 20.9 (`engines` in package.json; use Node 22 LTS). Next 14 is end-of-life with unpatched critical CVEs: do not downgrade.
- Next 15 request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams` (pages AND route handlers: `ctx: { params: Promise<{ id: string }> }`). `clientIp()` and `endSession()` are async.
- Single Next.js app: UI in `src/app`, backend in `src/app/api/**` route handlers, shared logic in `src/lib`.
- Data store: Postgres (Neon) via Prisma 5.22 (`prisma/schema.prisma`). Import the client and row→domain mappers (`toUser`, `toProduct`, `toCoupon`, `toOrder`) from `src/lib/db.ts`; never instantiate `PrismaClient` elsewhere.
- `DATABASE_URL` / `DIRECT_URL` live in `.env` (Prisma CLI does not read `.env.local`).
- Mobile OTP: Firebase Phone Auth on the client (`PhoneOtpField`), server verifies the Firebase ID token in `src/lib/phone.ts` (`verifyPhoneToken`). Without Firebase env vars, dev mode shows the OTP on screen (disabled in production).

## Rules
- Themes: dark (default) + light. Colour tokens are CSS variables in `globals.css` (`:root`/`[data-theme=dark]` and `[data-theme=light]`), wired in `tailwind.config.ts`. `ivory` = primary TEXT colour (near-black in light mode). Never use `white`/`black` for text or surfaces; text over photos goes inside a `data-theme="dark"` element so it stays light. Theme is a cookie (`aurelia_theme`) read by the root layout → no flash. Check new colours for ≥ 4.5:1 contrast in BOTH themes.
- Icons: Lucide (`lucide-react`), imported ONLY via `src/components/Icons.tsx` (wrapper sets 20px / 1.4 stroke / aria-hidden). Add new icons there; never import `lucide-react` directly in components.
- Dates: always format with `formatDate` (fixed to Asia/Kolkata); never `toLocaleString` without `timeZone` — production servers run in UTC.
- Business details (address, email, GSTIN…) live only in `src/lib/site.ts`; never hard-code them in pages or emails.
- Public, abusable endpoints call `rateLimit()` (`src/lib/rateLimit.ts`). Payment state changes go through `markPaid` / `advanceStatus` (`src/lib/orders.ts`) only.
- Customer-facing prices must go through `withSales` / `listShopProducts` / `quote` (live sales applied server-side); `listProducts` returns REGULAR prices (admin only).
- Demo payments must stay gated by `demoPaymentsAllowed()`; never enable them in production.
- Cancelling / refunding goes only through `cancelOrder` / `refundLatePayment` / `retryRefund` (`src/lib/orders.ts`); never change `status: "cancelled"`, stock or `refundedAmount` directly. Item quantities still active = `qty − cancelledQty` (`activeQty`).
- Inspect existing files before editing; reuse components in `src/components` and helpers in `src/lib`.
- Money is stored as integer **rupees** (no paise) everywhere except the Razorpay API call (`amount * 100`).
- Prices, discounts and totals are always recomputed on the server (`src/lib/pricing.ts`). Never trust client totals.
- Auth: JWT in the httpOnly cookie `aurelia_session` (`src/lib/auth.ts`). Admin routes must call `requireAdmin()`.
- Visual design follows `design.md` (Dark Luxury). Tokens live in `tailwind.config.ts`: `background`, `surface` (+`-elevated`, `-muted`), `gold` (+`-hover`), `ivory`, `secondary`, `muted`, `border`, `success`, `error`, `warning`. Never hard-code hex values in components.
- Use the component classes in `globals.css`: `btn-primary` (gold, one per view), `btn-secondary`, `btn-tertiary`, `input`, `field-label`, `card`, `badge`, `tab`/`tab-active`, `h-hero`/`h-page`/`h-section`, `skeleton`, `scroll-x`, `alert-error`/`alert-success`.
- Spacing on the 4px grid; container = `container-page` (max 1440px; 16–20 / 32 / 48–72px gutters).
- Images: `next/image` with the Unsplash CDN loader (`src/lib/imageLoader.ts`); only `images.unsplash.com` sources.
- Keep terminal output short; run `npm run typecheck` and `npm run build` after a phase.
- Update TASKS.md when a phase finishes. Keep explanations concise.

## Commands
- `npm run dev:local` — local Postgres (`.data/pg`, port 54329) + dev server together; Ctrl+C stops both (until Neon is configured)
- `npm run db:stop` — stop a local Postgres left running (e.g. terminal closed)
- `npm run dev` — dev server on http://localhost:3000 (compiles pages on first visit: slow by design); needs a reachable `DATABASE_URL`
- `npm run build && npm start` — production server (use this to judge speed)
- `npm run typecheck` / `npm run lint` / `npm run build`
- `npm run db:migrate` — create/apply a migration after editing `prisma/schema.prisma` (dev)
- `npm run db:deploy` — apply migrations (Neon / production)
- `npm run db:seed` — seed demo data; safe to re-run (`npx tsx prisma/seed.ts --import-json` migrates the old `.data/db.json`)
- `npm run db:reset` — drop everything, re-migrate and re-seed
- `npm run db:studio` — browse tables
- `npm run db:seed:prod` — live seed: catalogue + coupons, no demo accounts
- `npm run admin:create` / `npm run admin:remove-demo` — manage admin accounts (uses DATABASE_URL in .env)

## Seed accounts
- Admin: `admin@aurelia.test` / `Admin@123`
- Customer: `ajinkya@aurelia.test` / `Ajinkya@123` (referral code `AJINKYA10`), mobile `9876543210`
