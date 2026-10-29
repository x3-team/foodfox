import { headers } from "next/headers";
import { APP_VERSION, APP_BUILD } from "./version";

/**
 * Server error reporting: one JSON line on stderr for every failure (PM2 logs
 * keep it), plus a copy to a Sentry-compatible collector when FOX_ERRORS_DSN
 * is set. GlitchTip on the VPS is the intended target (deploy/vps/glitchtip),
 * Sentry itself accepts the same DSN.
 *
 * Nothing from the request body leaves the server: no phone numbers, no
 * report values, no chat text. Messages are scrubbed of digit runs and
 * e-mail addresses, because Postgres errors quote the offending value.
 */

export const REQUEST_ID_HEADER = "x-request-id";

export interface ErrorContext {
  /** Route or subsystem, e.g. `POST /api/reports/upload` or `heli`. */
  route: string;
  /** Pseudonymous client UUID; kept in the local log only. */
  clientId?: string | null;
  tags?: Record<string, string | number | boolean>;
}

interface Dsn {
  storeUrl: string;
  publicKey: string;
}

let cachedDsn: Dsn | null | undefined;

function parseDsn(): Dsn | null {
  if (cachedDsn !== undefined) return cachedDsn;
  const raw = process.env.FOX_ERRORS_DSN?.trim();
  cachedDsn = null;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!url.username || !projectId) throw new Error("no key or project");
    cachedDsn = {
      storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      publicKey: url.username,
    };
  } catch (err) {
    console.error("FOX_ERRORS_DSN is not a valid DSN:", err);
  }
  return cachedDsn;
}

export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>")
    .replace(/\+?\d[\d\s()-]{8,}\d/g, "<digits>")
    .slice(0, 2000);
}

function currentRequestId(): string | undefined {
  try {
    return headers().get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    // Outside a request (scripts, background work).
    return undefined;
  }
}

function stackFrames(stack: string | undefined) {
  if (!stack) return undefined;
  const frames = stack
    .split("\n")
    .slice(1)
    .map((line) => {
      const m = line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
      if (!m) return null;
      return {
        function: m[1] ?? "<anonymous>",
        filename: m[2],
        lineno: Number(m[3]),
        colno: Number(m[4]),
        in_app: !m[2].includes("node_modules") && !m[2].startsWith("node:"),
      };
    })
    .filter((f) => f !== null);
  // Sentry expects the innermost frame last.
  return frames.length ? { frames: frames.reverse() } : undefined;
}

/** Logs [error] and forwards it to the collector. Never throws. */
export function reportServerError(error: unknown, ctx: ErrorContext): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const requestId = currentRequestId();
    const message = scrub(err.message);

    console.error(
      JSON.stringify({
        level: "error",
        time: new Date().toISOString(),
        route: ctx.route,
        request_id: requestId,
        client_id: ctx.clientId ?? undefined,
        error: err.name,
        message,
        release: `${APP_VERSION}+${APP_BUILD}`,
        ...ctx.tags,
      }),
    );
    if (err.stack) console.error(err.stack);

    const dsn = parseDsn();
    if (!dsn) return;
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Date.now() / 1000,
      platform: "node",
      level: "error",
      logger: "foodfox-web",
      server_name: "foodfox-web",
      release: `foodfox-web@${APP_VERSION}+${APP_BUILD}`,
      environment: process.env.FOX_ENV || process.env.NODE_ENV || "development",
      transaction: ctx.route,
      tags: {
        route: ctx.route,
        ...(requestId ? { request_id: requestId } : {}),
        ...ctx.tags,
      },
      exception: {
        values: [
          {
            type: err.name,
            value: message,
            stacktrace: stackFrames(err.stack),
          },
        ],
      },
    };
    void fetch(dsn.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=foodfox-web/1.0, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    }).catch((sendErr) => {
      console.error("error report not delivered:", sendErr);
    });
  } catch (inner) {
    console.error("reportServerError failed:", inner);
  }
}
