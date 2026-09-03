import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth-edge";

const PROTECTED = ["/upload", "/results", "/plan", "/recipes", "/chat", "/account"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session = token ? await decodeSession(token) : null;
  if (!session) {
    const bearer = request.headers.get("authorization");
    if (bearer?.startsWith("Bearer ")) {
      session = await decodeSession(bearer.slice(7).trim());
    }
    const foxToken = request.headers.get("x-fox-token");
    if (!session && foxToken) {
      session = await decodeSession(foxToken.trim());
    }
  }

  if (pathname.startsWith("/login")) {
    if (session) {
      return NextResponse.redirect(new URL("/upload", request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/refresh") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const needsAuth =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/api/");

  if (needsAuth && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
