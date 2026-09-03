#!/usr/bin/env npx tsx
/**
 * Regenerate fox-catalog-ru.json from a reference FOX PDF.
 * Usage: npx tsx scripts/generate-fox-catalog-ru.ts [path/to.pdf]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText } from "../src/lib/fox-parser";

const PDF_PATH =
  process.argv[2] ||
  "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";
const OUT = resolve(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");

async function main() {
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const verified = text.match(/ПРОВЕРЕННЫЕ АНТИГЕНЫ:\s*\n?\s*(\d+)/i)?.[1];
  const results = parseFoxPdfText(text);
  const names = results.map((r) => r.foxName).sort((a, b) => a.localeCompare(b, "ru"));

  const payload = {
    source: PDF_PATH,
    verifiedInPdf: verified ? Number(verified) : null,
    count: names.length,
    names,
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${names.length} RU names → ${OUT}`);
  if (verified) console.log(`PDF reports ${verified} verified antigens`);
}

main().catch(console.error);
