import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Uptime check: GET /api/health → 200 when the app and database respond. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
