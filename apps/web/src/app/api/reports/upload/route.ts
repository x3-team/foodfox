import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getAuthClientId, handleAuthError } from "@/lib/api-auth";
import { getResultsForClient, saveReportFromPdf } from "@/lib/db";
import { countZones } from "@/lib/fox-parser";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      text = parsed.text ?? "";
      await parser.destroy();
    } catch {
      text = "";
    }

    const clientId = await getAuthClientId();
    const { reportId, results, planId } = await saveReportFromPdf(clientId, text, buffer);
    const counts = countZones(
      results.map((r) => ({
        foxName: r.foxName,
        valueUgMl: r.valueUgMl,
        isFloorValue: r.isFloorValue,
        zone: r.zone,
      })),
    );

    return NextResponse.json({
      reportId,
      planId,
      parsedCount: results.length,
      counts,
      results: await getResultsForClient(clientId),
    });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка парсинга" },
      { status: 500 },
    );
  }
}
