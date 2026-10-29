import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth-edge";

// Same name as REQUEST_ID_HEADER in lib/monitoring.ts, which pulls in
// next/headers and cannot be imported on the edge.
const REQUEST_ID_HEADER = "x-request-id";

const PROTECTED = ["/upload", "/results", "/plan", "/recipes", "/chat", "/account"];

/**
 * Tags every request with an id that the error log, the collector and the
 * app's own error reports all carry, so one failure can be followed across
 * them. The app sends its own id; anything else gets a fresh one.
 */
export async function middleware(request: NextRequest) {
  const incoming = request.headers.get(REQUEST_ID_HEADER) ?? "";
  const requestId = /^[\w-]{8,64}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
  const forwarded = new Headers(request.headers);
  forwarded.set(REQUEST_ID_HEADER, requestId);

  const response = await route(request, forwarded);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

async function route(request: NextRequest, forwarded: Headers) {
  const next = () => NextResponse.next({ request: { headers: forwarded } });
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
    return next();
  }

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/refresh") ||
    pathname.startsWith("/api/auth/otp") ||
    pathname === "/api/health"
  ) {
    return next();
  }

  if (pathname.startsWith("/api/auth")) {
    return next();
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

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
