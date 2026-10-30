import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { currentStaff, can } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";
import { filtersFrom, leadWhere } from "@/lib/admin/lead-query";
import { LEAD_STATUSES, kindLabel, type Lead } from "@/lib/admin/leads";

/* CSV in the format Excel opens with a double click in a Russian locale: UTF-8 with BOM, ";" separators, CRLF. */
const cell = (value: unknown) => {
  const s = value == null ? "" : String(value);
  // A leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(request: NextRequest) {
  const staff = await currentStaff();
  // Relative Location: behind nginx request.url is the upstream http://localhost:<port>, not the public domain.
  if (!staff || !can(staff, "leads")) return new NextResponse(null, { status: 307, headers: { Location: "/admin/login?next=/admin/leads" } });
  const f = filtersFrom(Object.fromEntries(request.nextUrl.searchParams));
  const where = leadWhere(f, staff.id);
  const rows = await q<Lead>(
    `SELECT l.*, u.name AS assignee_name FROM leads l LEFT JOIN admin_users u ON u.id = l.assignee_id ${where.sql} ORDER BY l.created_at DESC LIMIT 50000`,
    where.params,
  );
  const head = ["Номер", "Дата", "Форма", "Статус", "Имя", "Почта", "Телефон", "Город", "Компания", "Сообщение", "Ответственный", "Страница", "UTM source", "UTM campaign"];
  const lines = [head.map(cell).join(";")];
  for (const r of rows) {
    lines.push([
      r.id, dateTime(r.created_at), kindLabel(r.kind), LEAD_STATUSES[r.status], r.name, r.email, r.phone, r.city, r.company,
      r.message, r.assignee_name ?? "", r.page, r.utm?.source ?? "", r.utm?.campaign ?? "",
    ].map(cell).join(";"));
  }
  await audit(staff, { action: "export", entity: "lead", summary: `Экспорт заявок в CSV: ${rows.length}`, after: { filters: f } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="foodfox-leads-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
