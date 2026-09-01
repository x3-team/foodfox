#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, validateParseResults } from "../src/lib/fox-parser";

const PDF_PATH =
  process.argv[2] ||
  "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";
const CATALOG_RU = resolve(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");

async function main() {
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const results = parseFoxPdfText(text);
  const catalog = JSON.parse(readFileSync(CATALOG_RU, "utf8")) as {
    verifiedInPdf: number;
    names: string[];
  };

  const v = validateParseResults(results, catalog.names);

  console.log("Parsed:", results.length, "/ PDF verified:", catalog.verifiedInPdf);
  console.log("Extra:", v.extraVsCatalog.length ? v.extraVsCatalog : "(none)");
  console.log("Missing from RU seed:", v.missingFromCatalog.length ? v.missingFromCatalog : "(none)");

  const narrativeLike = results.filter((r) => /ваш уровень|составляет/i.test(r.foxName));
  console.log("Narrative leaks:", narrativeLike.length);
}

main().catch(console.error);
