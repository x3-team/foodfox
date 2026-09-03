#!/usr/bin/env npx tsx
/**
 * Extract all unique FOX product names from sample PDF text for catalog building.
 */
import { readFileSync, writeFileSync } from "fs";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText } from "../src/lib/fox-parser";

const PDF_PATH =
  process.argv[2] ||
  "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";

async function main() {
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const results = parseFoxPdfText(text);
  const names = results.map((r) => r.foxName).sort((a, b) => a.localeCompare(b, "ru"));

  // Raw lines that look like category headers (no value on same line)
  const headerLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[А-ЯA-Z][а-яa-zA-Z\s\-]+$/.test(l) && !/мкг\/мл/i.test(l) && l.length < 40);

  const out = {
    parsedCount: results.length,
    names,
    possibleHeaders: [...new Set(headerLines)],
  };

  writeFileSync(
    "/workspace/packages/database/seeds/fox-parsed-from-sample.json",
    JSON.stringify(out, null, 2),
    "utf8",
  );
  console.log("Wrote", names.length, "names to fox-parsed-from-sample.json");
  console.log("Possible headers:", out.possibleHeaders.length);
}

main().catch(console.error);
