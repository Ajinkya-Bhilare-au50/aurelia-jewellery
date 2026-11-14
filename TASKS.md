# TASKS

- [x] Phase 1 — Project setup, design system, layout, home page
- [x] Phase 2 — Authentication (register, login, logout, session, middleware)
- [x] Phase 3 — Products and cart (shop, filters, product page, cart drawer + page)
- [x] Phase 4 — Coupons and referrals (server pricing, referral welcome + ₹500 referrer reward)
- [x] Phase 5 — Checkout + Razorpay integration (with demo mode)
- [x] Phase 6 — Delivery tracking (timeline, /track, account orders)
- [x] Phase 7 — Admin dashboard (overview, products CRUD, orders status, coupons)
- [x] Phase 8 — Testing and debugging (typecheck, lint, build, API smoke test, screenshots)

- [x] Phase 9 — Dark luxury redesign per design.md (tokens, components, homepage order, mega menu, wishlist, filters + mobile drawer, PDP zoom / PIN check / Buy now / sticky bar, cart save-for-later, skeletons)
- [x] Phase 10 — Performance (CDN image loader, trimmed font weights, production build check)
- [x] Phase 11 — Postgres (Neon) + Prisma, Firebase mobile OTP (login + signup), e2e smoke test against real Postgres
- [x] Phase 12 — Production readiness: admin CLI + prod seed, policy pages, Razorpay webhook, demo-payment guard, rate limiting, security headers, config checks, health, emails (Resend), sitemap/robots, Vercel region, DEPLOYMENT.md
- [x] Phase 13 — Order & item cancellation with automatic (proportional) refunds, admin cancel now refunds, failed-refund retry, late-payment auto-refund
- [x] Phase 14 — Admin sales (Diwali etc.): scheduled % / ₹ discounts by all / category / product, banner, coupon stacking rule, pause / resume / end now / edit
- [x] Phase 15 — Review: oversell race fix (auto-refund), IST dates on UTC servers, coupon expiry TZ, friendly validation errors, admin orders pagination, real newsletter storage, live wishlist prices, mobile overflow fix, lint clean; smart search (typo-tolerant, synonyms, instant suggestions)
- [x] Phase 16 — Light mode + dark mode toggle (CSS-variable tokens, cookie-persisted, no flash, contrast-checked); shop-page search box
- [x] Phase 17 — Neon + Firebase connected; demo payments for portfolio; security upgrade Next 14 → 15.5.29 + React 19 + Firebase 13 (clears critical CVEs), Node ≥ 20.9
- [x] Phase 19 — GST invoice PDFs (customer + admin), address book with checkout picker, product photo upload, full-screen pinch-zoom gallery, admin panel responsive on phones, mobile menu sign-out
- [x] Phase 18 — Vercel deploy (GitHub auto-deploy); public demo numbers + read-only demo admin on the login page (masked customer data); Authkey.io SMS OTP option; Email OTP sign-in + sign-up (Gmail SMTP or Resend; no account enumeration, single-use codes, limits); dev OTP hash keyed (HMAC)

## design.md items not yet done
- [x] Firebase phone OTP authentication (§11): OTP login, OTP-verified signup, link phone on account page
- [ ] Order statuses "Processing" and "Quality check" (§12) and courier event feed
- [x] Account: saved addresses (address book + checkout picker)
- [ ] Account: notifications, security tabs (§12)
- [ ] Admin: revenue charts, customers, shipments, returns/refunds, reviews, content, audit log, pagination (§13)
- [ ] Toast component; gemstone and size filters (needs product data)

## Next ideas
- [x] Replace JSON store with Postgres (Neon) + Prisma
- [x] Razorpay webhook (`payment.captured`) as a backup to client-side verify
- [x] Transactional emails (order confirmed / shipped / delivered)
- [x] Product image upload — stored in Postgres (`ProductImage`), WebP via sharp, resized per width + CDN-cached
- [ ] Wishlist, product reviews, image upload for admin
- [ ] Automated tests (Vitest for `pricing.ts` / `orders.ts`, Playwright for checkout)
