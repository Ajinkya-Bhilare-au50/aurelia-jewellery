# ARCHITECTURE

## Overview
One Next.js 14 App Router project. The README's `frontend/` + `backend/` split is covered by the same app: pages/components are the frontend, `src/app/api/**` route handlers are the backend. One deploy, one type system, no CORS.

```
src/
  app/
    (pages)            home, shop, product/[slug], cart, checkout, login, register,
                       account, account/orders/[id], track, admin/**
    api/
      auth/            register (needs phone OTP) | login | logout | phone-login | otp/send, otp/verify (dev only)
      account/phone    POST — link a verified mobile to the signed-in user
      quote/           POST  — server-priced cart preview (coupon + referral)
      checkout/        POST create order (+ Razorpay order) | verify POST
      track/           POST order number + email → public timeline
      admin/           products, products/[id], orders/[id], coupons, coupons/[id]
      webhooks/razorpay POST — HMAC-verified payment.captured / order.paid → markPaid
      health/          GET — app + DB liveness
    terms, privacy, refund-policy, shipping-policy, contact   policy pages (LegalPage + lib/site.ts)
    sitemap.ts, robots.ts
  components/          UI building blocks (Header, ProductCard, CartProvider, …)
  lib/
    db.ts              Prisma client singleton + row→domain mappers, order-number counter
    phone.ts           phone token verification (Firebase ID token via Google JWKS, or dev OTP)
    firebaseClient.ts  browser-only Firebase Phone Auth (lazy-loaded)
    seed.ts            products, admin, demo customer, coupons (used by prisma/seed.ts)
    types.ts           domain types
    auth.ts            bcrypt hashing, JWT (jose) session cookie, getUser/requireAdmin
    pricing.ts         single source of truth for cart totals, coupon + referral rules
    razorpay.ts        create order (REST), payment + webhook signature verification, demoPaymentsAllowed()
    rateLimit.ts       Postgres fixed-window limiter (RateLimit table), clientIp()
    email.ts           Resend REST: order confirmed / shipped / delivered (no-op without RESEND_API_KEY)
    site.ts            business details used by footer, policy pages, emails
    avatar.ts          initials(), avatarColor(id) → one of 12 `avatar-N` tokens (stable per user id), avatarSrc()
    env.ts             production config checks (run by src/instrumentation.ts at startup)
    format.ts          INR formatting, dates, status labels
  middleware.ts        redirects unauthenticated users away from /account, /checkout, /admin
```

## Data
Postgres on Neon via Prisma (`prisma/schema.prisma`): `User`, `Product`, `Coupon`, `Order`, `Counter`. Order line items, address and timeline are JSON snapshots (they must not change when products change). Domain types in `types.ts` keep ISO-string dates; `db.ts` maps rows to them.
- Order numbers come from the `Counter` row `order` (atomic upsert-increment in the order's transaction).
- `markPaid` / `advanceStatus` (`orders.ts`) run in transactions and flip status with a conditional `updateMany` on the expected current status, so concurrent calls (double verify, two admins) apply once.
- `prisma/seed.ts` imports the legacy `.data/db.json` if present, otherwise seeds demo data.

## Mobile OTP
Firebase Phone Auth handles SMS + reCAPTCHA in the browser and yields a Firebase ID token. The server verifies it with `jose` against Google's public JWKS (issuer/audience = Firebase project, `auth_time` ≤ 10 min) and reads `phone_number`; no service-account key is needed. Firebase is used only as the OTP proof — our own JWT cookie remains the session. Phone numbers are stored in E.164 (`+91…`) and are unique. Registration requires a verified phone; customers can sign in by phone OTP or email + password. Without Firebase env vars (and only outside production) a stateless dev OTP is used: the code is shown in the UI and logged to the server console.

## Key decisions
- **Server-authoritative pricing**: the client sends `{productId, qty, size}` + coupon code; `pricing.ts` loads real prices and stock.
- **Payment confirmation** happens in `/api/checkout/verify` (HMAC of `order_id|payment_id`) and, as a backup, in `/api/webhooks/razorpay` (HMAC of the raw body with `RAZORPAY_WEBHOOK_SECRET`, amount checked). Both call the idempotent `markPaid`. Demo payments only when keys are absent AND not production (or `ALLOW_DEMO_PAYMENTS=true`).
- **Profile photos**: `<Avatar>` shows the uploaded photo, else initials on a per-user colour (Teams-style). The browser centre-crops/resizes to 256×256 (`AvatarEditor`), the server checks magic bytes and ≤ 200 KB, stores it in `UserAvatar` (separate table so user reads never load bytes) and serves it at `/api/avatar/[id]?v=<avatarUpdatedAt>` with immutable caching.
- **Search** (`lib/search.ts`, pure): tokenised AND-matching with stemming, jewellery synonyms (studs/jhumka → earrings, bangle/kada → bracelets…), common-misspelling map + edit-distance typo correction, relevance ranking (name > tags > description, in-stock/featured tiebreak). Used by `/shop?q=` (via `filterProducts`, relevance order unless a sort is chosen) and `GET /api/search` (top 6 at live sale prices, rate-limited) behind the header `SearchPanel` (debounced + abortable, ARIA combobox, recent/popular searches). In-memory over the catalogue: ~8 ms for 800 products; move to Postgres full-text if the catalogue grows past a few thousand.
- **Sales** (`Sale` model, `lib/sales.ts`, admin `/admin/sales`): time-boxed automatic discounts (% or ₹ per unit) on all products, categories or selected products, with optional banner text and a no-coupon option. `getLiveSales()` (per-request cached) + `applySales()` rewrite `price`/`compareAtPrice` server-side for every customer-facing read (`listShopProducts`, product page, `quote`), so strike-throughs, badges, the On-sale filter, checkout and refunds all use the sale price; overlapping sales → best price wins. Order lines keep `listPrice` + `saleName`. Carts re-sync line prices from each quote (`syncPrices`).
- **Cancellations & refunds** (`lib/cancellation.ts` rules + maths shared by UI and server; `cancelOrder` in `lib/orders.ts`): customers (and admins) cancel a whole order before it ships (pending / confirmed / packed) or some units of lines on paid, unshipped orders (`POST /api/orders/[id]/cancel`). Partial refund = item value × (subtotal − discount) / subtotal (floored); full cancel refunds `total − refundedAmount` incl. shipping. Runs under `SELECT … FOR UPDATE`, so double clicks can't double-refund/restock. Stock is restored for paid orders; a full cancel releases the coupon use. The refund (Razorpay Refunds API, or simulated for demo) runs after commit and is recorded in `Order.refunds` as processed / failed; failures show "Needs attention" + admin retry (`POST /api/admin/orders/[id]/refunds/[refundId]`). Admin "cancelled" status changes go through the same path. A payment captured for an already-cancelled order (webhook or browser verify) is refunded automatically (`refundLatePayment`). Dashboard revenue is net of refunds.
- **Overselling**: `markPaid` locks the order and product rows (`FOR UPDATE`) and re-checks stock; if a piece sold out while a customer was paying, that order is cancelled and refunded in full automatically (`result: "soldout"`).
- **Time zone**: all dates render in `Asia/Kolkata` (`STORE_TZ` in `format.ts`); servers run in UTC.
- **Abuse protection**: `rateLimit()` on login, phone login, register, OTP, track, quote, checkout, phone linking. Security headers in `next.config.mjs`. Startup config validation in `src/lib/env.ts`.
- **Sessions**: HS256 JWT (7 days) signed with `AUTH_SECRET`, stored in an httpOnly, SameSite=Lax cookie. Middleware only checks presence/validity; route handlers re-check role.
- **Images**: Unsplash URLs through `next/image` with a custom loader (`src/lib/imageLoader.ts`) so the Unsplash/imgix CDN resizes and serves AVIF/WebP; the Next server does no image work.
- **Styling**: dark luxury system from `design.md`; Tailwind tokens in `tailwind.config.ts`, component classes in `globals.css`; *Cormorant Garamond* (400/500) + *Inter* (400/500/600) via `next/font`. Motion is CSS-only with `prefers-reduced-motion` support (no Framer Motion dependency).
- **Wishlist**: client-side (`WishlistProvider`, localStorage). Move to an API when it must sync across devices.
- **Catalogue filters**: `src/lib/catalog.ts` (category, price, metal, purity, in stock, on sale, sort) driven by URL search params.
