# CLAUDE.md — Aurelia Fine Jewellery

Read PROJECT_SPEC.md, ARCHITECTURE.md and TASKS.md before changing anything. Going live: DEPLOYMENT.md.

## Stack
- Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS 3. Requires Node ≥ 20.9 (`engines` in package.json; use Node 22 LTS). Next 14 is end-of-life with unpatched critical CVEs: do not downgrade.
- Next 15 request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams` (pages AND route handlers: `ctx: { params: Promise<{ id: string }> }`). `clientIp()` and `endSession()` are async.
- Single Next.js app: UI in `src/app`, backend in `src/app/api/**` route handlers, shared logic in `src/lib`.
- Data store: Postgres (Neon) via Prisma 5.22 (`prisma/schema.prisma`). Import the client and row→domain mappers (`toUser`, `toProduct`, `toCoupon`, `toOrder`) from `src/lib/db.ts`; never instantiate `PrismaClient` elsewhere.
- `DATABASE_URL` / `DIRECT_URL` live in `.env` (Prisma CLI does not read `.env.local`).
- Mobile OTP is SWITCHED OFF via `MOBILE_OTP` in `src/lib/features.ts` (login, sign-up, link-phone card, `/api/auth/phone-login` and `/api/auth/register` all respect it; code kept). When on: Firebase Phone Auth on the client (`PhoneOtpField`), server verifies the Firebase ID token in `src/lib/phone.ts` (`verifyPhoneToken`). Alternative: Authkey.io (`NEXT_PUBLIC_OTP_PROVIDER=authkey`, `src/lib/authkey.ts`). Without a provider, dev mode shows the OTP on screen (disabled in production).
- Email OTP sign-in AND sign-up: `src/lib/emailOtp.ts` + `/api/auth/email-otp/{send,verify,signup}` + `EmailOtpField`. A code goes to every address (send step never reveals whether an account exists); after a correct code, existing account → session, new email → signup token → name (+ referral) → account. Account creation for both sign-ups goes through `createAccount` (`src/lib/accounts.ts`). Mail via `src/lib/email.ts` (Gmail SMTP `SMTP_USER`/`SMTP_PASS`, else Resend); the tab only shows when `emailOtpAvailable()`.
- Mobile numbers while MOBILE_OTP is off: required at email sign-up, editable on the account page (`MobileNumberCard` → `/api/account/phone`), and saved from checkout if the profile has none. Stored in `User.phone` with `phoneVerifiedAt = null` (unverified); mobile sign-in only matches verified numbers.
- Invoices: `src/lib/invoice.ts` (pdf-lib, built-in fonts → amounts print as "Rs.") via `GET /api/orders/[id]/invoice` for paid orders only (`invoiceAvailable`). GST back-calculated from GST-inclusive totals using `SITE.gstRatePct` / `SITE.state` (CGST+SGST same state, else IGST) and `SITE.hsn`. Demo admin gets `maskOrder` data.
- Address book: `SavedAddress` table, `src/lib/addresses.ts` (`addressSchema` shared with checkout; dedupe, one default, max 10), `/api/account/addresses`, `AddressBook` (account page) and the checkout picker; checkout `saveAddress: true` adds the new address (best effort, never blocks the order).
- Roles: `customer | admin | demo_admin` (`src/lib/roles.ts`). `demo_admin` can view admin pages (customer data masked via `src/lib/privacy.ts`) but `requireAdmin()` rejects every change.

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
- Images: always render through `Img` (`src/components/Img.tsx`, loader `src/lib/imageLoader.ts`). Product images are either `https://images.unsplash.com/...` (resized by Unsplash's CDN) or admin uploads at `/api/images/<id>` (`ProductImage` table; uploaded via `/api/admin/images`, re-encoded to WebP + metadata-stripped with sharp; served resized by `?w=` and cached immutably). Validation: `productSchema` + `UPLOADED_RE` (`src/lib/productImageUrl.ts`).
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
- Live demo (shown on /login, click to fill; created by `npm run demo:accounts`): customer `demo-customer@aurelia.test` / `DemoShop@123` (shared), read-only admin `demo-admin@aurelia.test` / `DemoAdmin@123`
