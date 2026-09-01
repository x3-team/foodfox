import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { countZones } from "@/lib/fox-parser";
import { getOrCreateDemoClient, getResultsForClient, saveReportFromPdf } from "@/lib/db";

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

    const clientId = await getOrCreateDemoClient();
    const { reportId, results, planId } = await saveReportFromPdf(clientId, text);
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
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка парсинга" },
      { status: 500 },
    );
  }
}
