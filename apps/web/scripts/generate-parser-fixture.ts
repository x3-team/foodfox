#!/usr/bin/env npx tsx
/**
 * Copy reference FOX PDF into fixtures/ and write golden expected JSON.
 * Run: npx tsx scripts/generate-parser-fixture.ts [path-to.pdf]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, validateParseResults } from "../src/lib/fox-parser";
import {
  assessParseQuality,
  normalizeParsedResults,
} from "../src/lib/fox-parse-quality";

const DEFAULT_PDF =
  "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";

async function main() {
  const pdfSrc = process.argv[2] || DEFAULT_PDF;
  const fixtureDir = resolve(process.cwd(), "../../packages/database/fixtures");
  mkdirSync(fixtureDir, { recursive: true });

  const buf = readFileSync(pdfSrc);
  writeFileSync(join(fixtureDir, "fox-report-e710.pdf"), buf);

  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const raw = parseFoxPdfText(text);
  const results = normalizeParsedResults(raw);
  const catalogPath = resolve(
    process.cwd(),
    "../../packages/database/seeds/fox-catalog-ru.json",
  );
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    names: string[];
  };
  const validation = validateParseResults(results, catalog.names);
  const quality = assessParseQuality(results, text, validation);

  const expected = {
    fixture: "fox-report-e710.pdf",
    verifiedInPdf: quality.verifiedInPdf,
    parsedCount: results.length,
    catalogCount: quality.catalogCount,
    confidence: quality.confidence,
    results: results.sort((a, b) => a.foxName.localeCompare(b.foxName, "ru")),
  };

  writeFileSync(
    join(fixtureDir, "fox-report-e710.expected.json"),
    `${JSON.stringify(expected, null, 2)}\n`,
  );

  console.log(
    `Wrote ${results.length} rows → fox-report-e710.expected.json (confidence: ${quality.confidence})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
