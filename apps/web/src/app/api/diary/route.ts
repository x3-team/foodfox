import { NextRequest, NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import {
  DIARY_DEFAULT_DAYS,
  DIARY_MAX_DAYS,
  checkEntryDate,
  isoDate,
  parseDiaryInput,
} from "@/lib/diary";
import { deleteDiaryEntry, getDiary, saveDiaryEntry } from "@/lib/diary-store";
import { HealthKeyMissingError } from "@/lib/health-crypto";
import { reportServerError } from "@/lib/monitoring";

/**
 * Symptom diary (app screen 14). Health data: entries are encrypted at rest
 * (lib/health-crypto.ts), never logged, and errors are reported without the
 * request body. Responses are private to the caller and not cached.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function failure(e: unknown, route: string): NextResponse {
  const auth = handleAuthError(e);
  if (auth) return auth;
  if (e instanceof HealthKeyMissingError) {
    reportServerError(e, { route, tags: { diary: "no_key" } });
    return NextResponse.json(
      { error: "Дневник временно недоступен" },
      { status: 503, headers: NO_STORE },
    );
  }
  reportServerError(e, { route });
  return NextResponse.json(
    { error: "Не удалось открыть дневник" },
    { status: 500, headers: NO_STORE },
  );
}

/** `?days=N` — history depth, default a little over a month. */
export async function GET(req: NextRequest) {
  try {
    const clientId = await getAuthClientId(req);
    const raw = parseInt(req.nextUrl.searchParams.get("days") ?? "", 10);
    const days = Number.isFinite(raw)
      ? Math.min(DIARY_MAX_DAYS, Math.max(1, raw))
      : DIARY_DEFAULT_DAYS;
    const diary = await getDiary(clientId, days);
    return NextResponse.json(diary, { headers: NO_STORE });
  } catch (e) {
    return failure(e, "GET /api/diary");
  }
}

/** Creates or replaces the entry for `date`. */
export async function PUT(req: NextRequest) {
  try {
    const clientId = await getAuthClientId(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Пустой запрос" }, { status: 400, headers: NO_STORE });
    }
    const parsed = parseDiaryInput(body, isoDate(new Date()));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE });
    }
    const entry = await saveDiaryEntry(clientId, parsed.value);
    return NextResponse.json({ entry }, { headers: NO_STORE });
  } catch (e) {
    return failure(e, "PUT /api/diary");
  }
}

/** `?date=YYYY-MM-DD` — the client can take an entry back. */
export async function DELETE(req: NextRequest) {
  try {
    const clientId = await getAuthClientId(req);
    const date = checkEntryDate(req.nextUrl.searchParams.get("date"), isoDate(new Date()));
    if (!date.ok) {
      return NextResponse.json({ error: date.error }, { status: 400, headers: NO_STORE });
    }
    const deleted = await deleteDiaryEntry(clientId, date.value);
    return NextResponse.json({ deleted }, { headers: NO_STORE });
  } catch (e) {
    return failure(e, "DELETE /api/diary");
  }
}
