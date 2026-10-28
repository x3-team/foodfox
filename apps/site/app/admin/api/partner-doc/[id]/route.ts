import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/admin/audit";
import { can, currentStaff } from "@/lib/admin/auth";
import { one } from "@/lib/admin/db";
import { readSealedFile } from "@/lib/admin/pd-seal";

export const dynamic = "force-dynamic";

/* A partner's file, opened from its sealed copy. Analysis photos and act scans are for everyone who works with
   partners; passport, СНИЛС and ИНН scans only for the accountant and the admin. Every opening goes to the audit log. */

const PERSONAL = new Set(["passport_main", "passport_reg", "snils", "inn"]);
const LABEL: Record<string, string> = {
  passport_main: "скан паспорта (фото)", passport_reg: "скан паспорта (прописка)", snils: "скан СНИЛС", inn: "скан ИНН",
  analysis: "фото анализа", act_scan: "скан акта",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await currentStaff();
  if (!staff || !can(staff, "partners")) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const doc = await one<{ partner_id: string; kind: string; mime: string; path: string; full_name: string }>(
    "SELECT d.partner_id, d.kind, d.mime, d.path, p.full_name FROM partner_documents d JOIN partners p ON p.id = d.partner_id WHERE d.id = $1",
    [id],
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (PERSONAL.has(doc.kind) && !can(staff, "pd")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let data: Buffer;
  try {
    data = await readSealedFile(doc.path);
  } catch (error) {
    console.error("[partner-doc]", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  await audit(staff, { action: "doc_view", entity: "partner", entityId: doc.partner_id, summary: `Открыт файл: ${LABEL[doc.kind] ?? doc.kind}, ${doc.full_name}` });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": doc.mime,
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
