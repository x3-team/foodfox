#!/usr/bin/env npx tsx
/**
 * Turn a real FOX PDF into an anonymised text fixture for parser regression tests.
 * Real reports are patient data: never commit the PDF, only the output of this script.
 *
 * - keeps the result tables, the index page and the first narrative page (layout is what we test);
 * - replaces name, birth date, patient/sample ids, QR code and dates with placeholders;
 * - replaces every measured value with a seeded synthetic one (floors «< 5,00» stay floors);
 * - refuses to write if any original identifier survives.
 *
 * Run: npx tsx scripts/anonymize-fox-fixture.ts <report.pdf> <fixture-name> [pages=9]
 * Writes packages/database/fixtures/<fixture-name>.txt and <fixture-name>.expected.json.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, validateParseResults } from "../src/lib/fox-parser";
import { assessParseQuality, normalizeParsedResults } from "../src/lib/fox-parse-quality";

const FIXTURE_DIR = resolve(process.cwd(), "../../packages/database/fixtures");
const CATALOG_PATH = resolve(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");

const FAKE_NAME = "Тестовый П.П.";
const FAKE_QR = "80DBE000";
const FAKE_DATE = "01.01.2026";

/** Field label → placeholder for the value printed on the next line. */
const HEADER_FIELDS: Array<[RegExp, string]> = [
  [/^id пациента:?$/i, "000000000"],
  [/^имя пациента:?$/i, FAKE_NAME],
  [/^дата рождения:?$/i, "01.01.1990"],
  [/^id образца:?$/i, "000"],
  [/^qr-код:?$/i, FAKE_QR],
  [/^проанализировано\s*:?$/i, FAKE_DATE],
  [/^напечатано$/i, FAKE_DATE],
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function anonymize(text: string, pages: number): { text: string; secrets: string[] } {
  const lines = text.split("\n");
  const secrets: string[] = [];
  const out: string[] = [];

  const pageEnd = lines.findIndex((l) => new RegExp(`^--\\s*${pages}\\s+of\\s+\\d+\\s*--$`).test(l.trim()));
  const kept = pageEnd >= 0 ? lines.slice(0, pageEnd + 1) : lines;

  for (let i = 0; i < kept.length; i++) {
    const field = HEADER_FIELDS.find(([re]) => re.test(kept[i].trim()));
    out.push(kept[i]);
    if (!field) continue;
    const next = kept[i + 1]?.trim() ?? "";
    // Empty fields are followed directly by the next label.
    if (next && !/:\s*$/.test(next)) {
      if (next.length > 2) secrets.push(next);
      out.push(field[1]);
      i++;
    }
  }

  const rand = mulberry32(20261028);
  const synthetic = new Map<string, string>();
  const fakeValue = (orig: string) => {
    const key = orig.replace(".", ",");
    if (!synthetic.has(key)) {
      const v = 5.01 + rand() * 45;
      synthetic.set(key, v.toFixed(2).replace(".", ","));
    }
    const fake = synthetic.get(key)!;
    // Narrative pages print values with a dot ("составляет 43.74").
    return orig.includes(".") ? fake.replace(",", ".") : fake;
  };

  const anonymized = out.map((line) => {
    let l = line.replace(/\b80[0-9A-F]{6}\b/g, FAKE_QR);
    // Short ids (sample «0E6») would match inside other tokens; only the name and
    // birth date are long enough to replace everywhere (page footers repeat the name).
    for (const s of secrets) if (s.length >= 5) l = l.split(s).join(FAKE_NAME);
    // Legend «0 - 9,99 мкг/мл», floors «< 5,00» and «≥ 20» stay as printed.
    if (!/\d\s*-\s*\d+,\d\d|≥/.test(l)) {
      l = l.replace(
        /(<\s*|≤\s*)?(?<![\d.,])(\d+[.,]\d{1,2})(?![\d.,])/g,
        (m, floor: string | undefined, num: string) => (floor ? m : fakeValue(num)),
      );
    }
    return l.replace(/\b\d{2}\.\d{2}\.\d{4}\b/g, FAKE_DATE);
  });

  // Header placeholders replaced the real values; surface anything that leaked anyway.
  const result = anonymized.join("\n");
  const leaks = secrets.filter((s) => result.includes(s));
  if (leaks.length > 0) throw new Error(`identifiers survived anonymisation: ${leaks.length}`);
  return { text: result, secrets };
}

async function main() {
  const [pdfPath, name, pagesArg] = process.argv.slice(2);
  if (!pdfPath || !name) {
    console.error("usage: anonymize-fox-fixture.ts <report.pdf> <fixture-name> [pages=9]");
    process.exit(2);
  }
  const parser = new PDFParse({ data: readFileSync(pdfPath) });
  const { text: raw } = await parser.getText();
  await parser.destroy();

  const { text } = anonymize(raw, Number(pagesArg ?? 9));

  const results = normalizeParsedResults(parseFoxPdfText(text));
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as { names: string[] };
  const validation = validateParseResults(results, catalog.names);
  const quality = assessParseQuality(results, text, validation);

  writeFileSync(join(FIXTURE_DIR, `${name}.txt`), text);
  writeFileSync(
    join(FIXTURE_DIR, `${name}.expected.json`),
    `${JSON.stringify(
      {
        fixture: `${name}.txt`,
        verifiedInPdf: quality.verifiedInPdf,
        parsedCount: results.length,
        catalogCount: quality.catalogCount,
        confidence: quality.confidence,
        results: results.sort((a, b) => a.foxName.localeCompare(b.foxName, "ru")),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${name}.txt (${results.length} rows, confidence ${quality.confidence})`);
  console.log("Review the .txt by eye before committing: it must not contain any personal data.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
