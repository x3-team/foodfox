import { NextResponse, type NextRequest } from "next/server";
import { hasDatabase, q } from "@/lib/admin/db";
import { normalizeLead, pagePath, utmFrom } from "@/lib/admin/leads";

/* Every form of the site posts here (kind: contact, course, review, city-wait, book-wait). Leads go to the `leads`
   table and show up in /admin/leads. A failed save answers 503, so the form keeps the data and offers to retry
   instead of reporting a success that was never stored. */

const recent = new Map<string, number[]>();
const WINDOW = 10 * 60_000;
const LIMIT = 20;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > LIMIT;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 32_000) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  if (tooMany(ip)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  if (!hasDatabase()) {
    // No Postgres (local dev, the e2e run in CI): answer like the old stub. On the VPS DATABASE_URL is always set,
    // deploy/vps/update.sh checks /admin/api/health for it.
    console.warn("[lead] DATABASE_URL is not set, lead not stored");
    return NextResponse.json({ ok: true, stored: false });
  }

  const lead = normalizeLead(body);
  const referer = request.headers.get("referer") || "";
  try {
    const [row] = await q<{ id: string }>(
      `INSERT INTO leads (kind, name, email, phone, city, company, message, payload, page, utm, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        lead.kind,
        lead.name,
        lead.email,
        lead.phone,
        lead.city,
        lead.company,
        lead.message,
        JSON.stringify(lead.payload),
        pagePath(referer),
        JSON.stringify(utmFrom(referer)),
        ip || null,
        (request.headers.get("user-agent") || "").slice(0, 300),
      ],
    );
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error("[lead] save failed", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
