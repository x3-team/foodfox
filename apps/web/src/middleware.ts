import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth-edge";

const PROTECTED = ["/upload", "/results", "/plan", "/recipes", "/chat", "/account"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await decodeSession(token) : null;

  if (pathname.startsWith("/login")) {
    if (session) {
      return NextResponse.redirect(new URL("/upload", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
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
