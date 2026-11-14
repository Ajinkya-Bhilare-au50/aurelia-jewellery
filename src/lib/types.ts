export type Role = "customer" | "admin" | "demo_admin"; // demo_admin: read-only admin panel (portfolio demo)
export type Category = "rings" | "necklaces" | "earrings" | "bracelets";
export type Metal = "Gold" | "Rose Gold" | "Silver" | "Platinum";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string; // E.164, e.g. +919876543210
  phoneVerified: boolean;
  passwordHash: string;
  role: Role;
  referralCode: string;
  referredBy?: string; // userId of referrer
  referralDiscountUsed: boolean;
  avatarUrl?: string; // uploaded profile photo; initials are shown otherwise
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  metal: Metal;
  purity: string; // e.g. 18K, 925
  weight: string; // e.g. 3.2 g
  price: number; // INR
  compareAtPrice?: number;
  stock: number;
  images: string[];
  description: string;
  featured: boolean;
  createdAt: string;
  sale?: { id: string; name: string; regularPrice: number; stackWithCoupons: boolean; endsAt: string }; // set when a live sale lowers the price
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  expiresAt?: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  ownerId?: string; // user-specific coupon (e.g. referral reward)
  description?: string;
  createdAt: string;
}

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  qty: number;
  size?: string;
  cancelledQty?: number; // units of this line cancelled after purchase
  listPrice?: number; // regular price when bought on sale (price is the sale price)
  saleName?: string; // e.g. "Diwali Sale"
}

export interface Sale {
  id: string;
  name: string;
  bannerText?: string;
  type: "percent" | "flat";
  value: number;
  scope: "all" | "categories" | "products";
  categories: Category[];
  productIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  stackWithCoupons: boolean;
  createdAt: string;
}

export type RefundStatus = "pending" | "processed" | "failed";

export interface Refund {
  id: string;
  amount: number; // rupees
  status: RefundStatus;
  reason: string;
  scope: "order" | "items";
  description: string; // e.g. "1 × Akoya Pearl Strand"
  by: "customer" | "admin" | "system";
  at: string;
  providerRefundId?: string; // Razorpay rfnd_… / demo id
  error?: string;
}

/** Address-book entry (account page + checkout picker). */
export type SavedAddress = Address & { id: string; isDefault: boolean };

export interface Address {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface TimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
  title?: string; // overrides the status label for events that don't change status (e.g. "Item cancelled")
}

export interface Order {
  id: string;
  number: string; // human-friendly, e.g. AUR-10234
  userId: string;
  email: string;
  items: OrderItem[];
  address: Address;
  subtotal: number;
  discount: number;
  discountLabel?: string;
  couponCode?: string;
  referralApplied: boolean;
  shipping: number;
  total: number;
  refundedAmount: number;
  refunds: Refund[];
  status: OrderStatus;
  timeline: TimelineEntry[];
  payment: { provider: "razorpay" | "demo"; razorpayOrderId?: string; paymentId?: string };
  courier?: string;
  awb?: string;
  createdAt: string;
}

/** Shape of the legacy JSON store; used only by the seed / import script. */
export interface DB {
  users: User[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  orderSeq: number;
}

export type PublicUser = Pick<User, "id" | "name" | "email" | "phone" | "role" | "referralCode" | "avatarUrl">;
