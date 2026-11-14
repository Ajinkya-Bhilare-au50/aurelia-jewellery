# Aurelia Fine Jewellery

Next.js 14 jewellery store: catalogue, cart, coupons, referrals, Razorpay checkout, delivery tracking and admin dashboard.

```bash
npm install
npm run dev                  # Turbopack dev server: http://localhost:3000
npm run build && npm start   # production: fastest
npm run clean                # delete .next if the dev server misbehaves
```

Keep the project outside OneDrive (it lives in `C:\dev\ecommercesite`): syncing `.next` makes compiles very slow.

- Customer: `ajinkya@aurelia.test` / `Ajinkya@123` (referral code `AJINKYA10`)
- Admin: `admin@aurelia.test` / `Admin@123` → `/admin`
- Coupons: `WELCOME10`, `SPARKLE2000` (`DIWALI25` is expired)

**Payments:** without keys the checkout runs in demo mode. For real Razorpay (test mode), set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env.local` and restart.

Docs: [PROJECT_SPEC.md](PROJECT_SPEC.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [TASKS.md](TASKS.md) · [CLAUDE.md](CLAUDE.md)
