import { NextResponse, type NextRequest } from "next/server";
import { canViewAdmin } from "@/lib/roles";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && !canViewAdmin(session.role)) {
    return NextResponse.redirect(new URL("/account", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/account/:path*", "/checkout/:path*", "/admin/:path*"] };
