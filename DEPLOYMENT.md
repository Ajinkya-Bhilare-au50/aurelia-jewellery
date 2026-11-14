# Going live — checklist

Stack: **Vercel** (hosting, Oregon `pdx1` via `vercel.json`, next to the Neon DB in us-west-2) · **Neon** (Postgres) · **Firebase** (mobile OTP) · **Razorpay** (payments) · **Resend** (order emails).

## 0. Before anything
- [ ] Edit `src/lib/site.ts`: legal name, address, support email & phone, GSTIN, grievance officer. These appear in the footer, legal pages and emails, and Razorpay checks them.
- [ ] Have the policy pages (`/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/contact`) reviewed by a lawyer/CA. They are a sound starting template, not legal advice.
- [ ] Push the code to a **private** GitHub repo (`git init`, commit, push). `.env*` files are git-ignored.

## 1. Database: Neon
1. Create a project at neon.tech (region closest to Mumbai).
2. Put the **pooled** URL in `DATABASE_URL` and the **direct** URL in `DIRECT_URL` in your local `.env`. Append `&connect_timeout=15` to the pooled URL (covers Neon waking from idle). Do **not** add `pgbouncer=true`: Neon's pooler supports Prisma natively, and that flag made each query ~5× slower in testing (1.3 s vs 0.26 s).
3. Run from your PC:
   ```
   npm run db:deploy        # create tables
   npm run db:seed:prod     # products + coupons only, NO demo accounts
   npm run admin:create     # your real admin (prompts for email, name, password)
   ```
   Never run `npm run db:seed` against the live database: it creates the public demo accounts. If you did, run `npm run admin:remove-demo`.

## 2. Firebase: mobile OTP
Already set up: project `aurelia-jewellery-53vr` (web app registered, Phone sign-in on, SMS allowed for India only, test number +91 98765 43210 / code 123456). Config is in `.env.local`; copy the four `NEXT_PUBLIC_FIREBASE_*` values into Vercel. Still to do:

1. Firebase console → create project → upgrade to the **Blaze** plan (needed for real SMS).
2. Authentication → Sign-in method → enable **Phone**.
3. Authentication → Settings → **Authorised domains** → add `yourdomain.in` and `www.yourdomain.in`.
4. Authentication → Settings → **SMS region policy** → allow India.
5. Project settings → Your apps → Web app → copy `apiKey`, `authDomain`, `projectId`, `appId`.

## 3. Razorpay: payments
> **Demo / portfolio deployment (current choice):** skip this section. Leave `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` unset and set `ALLOW_DEMO_PAYMENTS=true` in Vercel. Checkout then simulates payment, and the site says so at checkout and in the footer. To take real money later, follow the steps below and remove `ALLOW_DEMO_PAYMENTS`.

1. Complete KYC and activation. Give your live domain as the website.
2. Switch to **Live mode** → Settings → API keys → generate live keys.
3. Settings → **Webhooks** → add:
   - URL `https://yourdomain.in/api/webhooks/razorpay`
   - Secret: any long random string (also put it in `RAZORPAY_WEBHOOK_SECRET`)
   - Events: `payment.captured`, `order.paid`
   - Refunds for cancellations use the same live API keys (Razorpay → Settings → make sure refunds are enabled for your account).

## 4. Email: Resend (optional but recommended)
1. resend.com → add and verify your domain (DNS records at your registrar).
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM="Aurelia <orders@yourdomain.in>"`.

## 5. Hosting: Vercel
1. vercel.com → Add New → Project → import the GitHub repo. Commercial shops need the **Pro** plan.
2. Settings → Environment Variables (Production):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL`, `DIRECT_URL` | Neon URLs |
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | live keys (`rzp_live_…`) |
   | `RAZORPAY_WEBHOOK_SECRET` | the webhook secret from step 3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.in` |
   | `NEXT_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_APP_ID` | from step 2 |
   | `RESEND_API_KEY`, `EMAIL_FROM` | from step 4 |

3. Deploy. `NEXT_PUBLIC_*` values are baked in at build time, so **redeploy after changing any of them**.
4. The server refuses to start with a missing/weak `AUTH_SECRET` or no `DATABASE_URL`, and logs `[config]` warnings for anything else missing (Vercel → Logs).

## 6. Domain
1. Buy the domain (GoDaddy / Hostinger / Namecheap).
2. Vercel → Project → Settings → Domains → add `yourdomain.in` and `www.yourdomain.in`; set the DNS records Vercel shows (A `76.76.21.21`, CNAME `cname.vercel-dns.com`). HTTPS is automatic.

## 7. Launch checks
- [ ] `https://yourdomain.in/api/health` returns `{"ok":true,"db":"up"}`. Add it to an uptime monitor (e.g. UptimeRobot).
- [ ] Register with your own mobile → real SMS arrives.
- [ ] Place a small real order → Razorpay payment → order shows "confirmed", confirmation email arrives.
- [ ] Razorpay → Webhooks shows successful deliveries.
- [ ] Admin: mark the order shipped → shipping email arrives; then refund the test payment in Razorpay.
- [ ] `/login` shows no "Demo accounts" box; `/sitemap.xml` uses your domain; submit it in Google Search Console.

## Built-in protections
- Demo payments are impossible in production (checkout returns 503 if Razorpay keys are missing, unless `ALLOW_DEMO_PAYMENTS=true`).
- Dev OTP endpoints return 404 in production; OTP proof comes only from Firebase.
- Rate limits (Postgres-backed): login 10 tries / 15 min per email and 20 / 10 min per IP; registration, OTP, order tracking, quotes and checkout are limited too.
- Webhook: HMAC-verified, amount-checked, idempotent (duplicate deliveries confirm once).
- Security headers (HSTS, nosniff, frame and referrer policy); session cookie is `Secure; HttpOnly; SameSite=Lax`.

## Not built yet
- Product image upload: admin products must use `images.unsplash.com` URLs. Needs a storage service (e.g. Vercel Blob or Cloudinary).
- Database backups: Neon keeps point-in-time history on paid plans; choose a retention period you are comfortable with.
admin:ajinkya0011@gmail.com
pW:AjinkyaBhilare1234567890

Your running site on port 3000 still uses the local database until you restart it.
npm run dev uses Neon.
npm run dev:local still uses the local database.
Before signing in to the Neon-backed site, create your admin account in your own terminal, where the password stays hidden: npm run admin:create.