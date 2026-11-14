# PROJECT_SPEC — Aurelia Fine Jewellery (e-commerce)

An Indian fine-jewellery storefront (prices in INR) with checkout through Razorpay, coupons, referrals, order tracking and an admin dashboard.

## 1. Storefront
- **Home**: hero, category tiles (Rings, Necklaces, Earrings, Bracelets), bestsellers, editorial banner, brand promises (BIS hallmark, free shipping, 30-day returns, lifetime exchange), newsletter.
- **Shop** `/shop`: grid of products; filter by category, metal (Gold / Rose Gold / Silver / Platinum), sort (featured, price ↑, price ↓, newest); search by name.
- **Product** `/product/[slug]`: gallery, price + compare-at price, metal, purity, weight, stock state, size selector for rings, quantity, add to cart, details accordion, related products.
- **Cart** `/cart`: line items, qty update, remove, coupon field, totals summary. Cart is persisted in `localStorage`.

## 2. Accounts
- Register (name, email, password, optional referral code), login, logout.
- `/account`: profile, order history, my referral code + share link, my reward coupons.
- `/account/orders/[id]`: order detail with tracking timeline.

## 3. Coupons & referrals
- Coupon: code, `percent` or `flat`, value, min order, max discount (percent only), expiry, usage limit, active flag, optional owner (user-specific coupon).
- Only one coupon per order. Validation errors are shown inline.
- Referral: every user gets a code. A new user who registers with a code gets **10 % off (max ₹1,000) on their first order**. When that first order is paid, the referrer receives a personal **₹500 off coupon** (min order ₹2,000, valid 90 days).
- Referral discount and a coupon cannot be combined; the larger discount is applied.

## 4. Checkout & payments (Razorpay)
- Requires login. Shipping address form (name, phone, line1, line2, city, state, pincode).
- Shipping: free above ₹2,999, else ₹149. Prices are inclusive of GST.
- Server creates the order (`pending_payment`) and a Razorpay order; client opens Razorpay Checkout; server verifies the HMAC signature and marks the order `confirmed`, decrements stock and increments coupon usage.
- **Demo mode**: when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set, a simulated payment step is shown so the full flow is testable locally.

## 5. Delivery tracking
- Statuses: `pending_payment → confirmed → packed → shipped → out_for_delivery → delivered` (+ `cancelled`).
- Each change is appended to the order timeline with a timestamp and note. Admin can set courier + AWB number when shipping.
- Public `/track` page: order number + email → timeline.

## 6. Admin dashboard `/admin` (role `admin`)
- Overview: revenue, paid orders, customers, average order value, low-stock list, recent orders.
- Products: list, create, edit, delete (name, category, metal, purity, weight, price, compare-at price, stock, images, description, featured).
- Orders: list with status filter, detail, status update with courier/AWB.
- Coupons: list, create, toggle active, delete.

## 7. Non-functional
- Responsive from 360px to 1440px+; consistent design tokens; accessible labels, focus states, alt text.
- Server-side validation of every input; password hashing (bcrypt); httpOnly cookies.
