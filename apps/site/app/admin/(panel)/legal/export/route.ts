import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { can, currentStaff } from "@/lib/admin/auth";
import { CONSENT_KINDS, consentWhere, SOURCES, SUBJECTS, type Consent } from "@/lib/admin/consents";
import { q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";

/* The register for an inspection or a subject's request, in the same Excel-friendly CSV as the leads export. */
const cell = (value: unknown) => {
  const s = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(request: NextRequest) {
  const staff = await currentStaff();
  if (!staff || !can(staff, "consents")) return NextResponse.redirect(new URL("/admin/login", request.url));
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const filter = { q: sp.q, subject: sp.subject, kind: sp.kind, state: sp.state };
  const { where, params } = consentWhere(filter);
  const rows = await q<Consent>(`SELECT c.* FROM consents c ${where} ORDER BY c.accepted_at DESC LIMIT 100000`, params);
  const head = ["Номер", "Кто", "Контакт", "Документ", "Версия", "Дано", "Откуда", "IP", "Отозвано", "Основание отзыва", "Прекратить обработку до"];
  const lines = [head.map(cell).join(";")];
  for (const r of rows) {
    lines.push([
      r.subject_id, SUBJECTS[r.subject_type], r.contact, CONSENT_KINDS[r.kind] ?? r.kind, r.version, dateTime(r.accepted_at),
      SOURCES[r.source] ?? r.source, r.ip, r.withdrawn_at ? dateTime(r.withdrawn_at) : "", r.withdraw_reason,
      r.stop_by ? new Date(r.stop_by).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }) : "",
    ].map(cell).join(";"));
  }
  await audit(staff, { action: "export", entity: "consent", summary: `Экспорт реестра согласий в CSV: ${rows.length}`, after: { filters: filter } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="foodfox-consents-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
