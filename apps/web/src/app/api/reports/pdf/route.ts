import { NextResponse } from "next/server";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getLatestReportId } from "@/lib/db";
import { readReportPdf } from "@/lib/report-storage";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const reportId = await getLatestReportId(clientId);
    if (!reportId) {
      return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });
    }

    const pdf = await readReportPdf(clientId, reportId);
    if (!pdf) {
      return NextResponse.json(
        { error: "PDF не сохранён (загрузите отчёт заново)" },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="fox-report.pdf"',
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
