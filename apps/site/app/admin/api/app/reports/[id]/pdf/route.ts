import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { can, currentStaff, mfaOk } from "@/lib/admin/auth";
import { callWeb, medicalGrant } from "@/lib/admin/app";
import { one } from "@/lib/admin/db";

export const dynamic = "force-dynamic";

/** The client's PDF for the moderator: role, 2FA and an open grant for this client, each view logged. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await currentStaff();
  if (!staff || !can(staff, "medical") || !mfaOk(staff)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const report = await one<{ client_id: string; user_id: string }>("SELECT r.client_id, c.user_id FROM reports r JOIN clients c ON c.id = r.client_id WHERE r.id = $1", [id]);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await medicalGrant(staff, report.client_id))) return NextResponse.json({ error: "Доступ к медданным не открыт" }, { status: 403 });

  const res = await callWeb(`/internal/reports/${id}/pdf`).catch(() => null);
  if (!res || !res.ok) {
    return new NextResponse("PDF недоступен: файл не сохранён или сервер приложения не отвечает", { status: res?.status === 404 ? 404 : 502, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  // The PDF viewer fetches the file in several requests: log one view per staff member and report per 10 minutes.
  const seen = await one("SELECT 1 FROM audit_log WHERE actor_id = $1 AND action = 'view_pdf' AND summary LIKE $2 AND created_at > now() - interval '10 minutes'", [staff.id, `%${id.slice(0, 8)}`]);
  if (!seen) await audit(staff, { action: "view_pdf", entity: "medical", entityId: report.user_id, summary: `Открыл PDF отчёта ${id.slice(0, 8)}` });
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="fox-report.pdf"',
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
