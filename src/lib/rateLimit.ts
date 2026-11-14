import "server-only";
import { headers } from "next/headers";
import { prisma } from "./db";
import { HttpError } from "./http";

/** Best-effort client IP (Vercel / most proxies set x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window limiter stored in Postgres, so it holds across serverless instances.
 * Throws 429 once `limit` hits are exceeded within `windowSec`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, timezone('UTC', NOW()) + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', NOW()) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= timezone('UTC', NOW()) THEN timezone('UTC', NOW()) + make_interval(secs => ${windowSec}) ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const { count, resetAt } = rows[0];

  // Opportunistic cleanup of expired windows (~1% of calls).
  if (Math.random() < 0.01) prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});

  if (count > limit) {
    const mins = Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 60000));
    throw new HttpError(429, `Too many attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`);
  }
}
