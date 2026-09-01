#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, countZones, validateParseResults } from "../src/lib/fox-parser";
import { FOX_CATALOG_SIZE } from "../../../packages/database/seeds/fox-catalog-en";

const CATALOG_RU = resolve(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");

async function main() {
  const path =
    process.argv[2] ||
    "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";
  const buf = readFileSync(path);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const results = parseFoxPdfText(text);
  const counts = countZones(results);

  const catalogRu = JSON.parse(
    readFileSync(CATALOG_RU, "utf8"),
  ) as { count: number; verifiedInPdf: number; names: string[] };

  const validation = validateParseResults(results, catalogRu.names);

  console.log("PDF:", path);
  console.log("Text length:", text.length);
  console.log("\n=== PARSE SUMMARY ===");
  console.log("Total products:", results.length);
  console.log("Zones:", counts);
  console.log("PDF header verified antigens:", catalogRu.verifiedInPdf);
  console.log("EN IFU catalog size:", FOX_CATALOG_SIZE);
  console.log("RU catalog (from sample):", catalogRu.count);

  if (validation.extraVsCatalog.length > 0) {
    console.log("\n--- Extra vs RU catalog ---");
    validation.extraVsCatalog.forEach((n) => console.log("  +", n));
  }
  if (validation.missingFromCatalog.length > 0) {
    console.log("\n--- Missing vs RU catalog ---");
    validation.missingFromCatalog.forEach((n) => console.log("  -", n));
  }

  const coverage = ((results.length / catalogRu.verifiedInPdf) * 100).toFixed(1);
  console.log(`\nCoverage vs PDF verified (${catalogRu.verifiedInPdf}): ${coverage}%`);

  console.log("\n--- Green (first 6) ---");
  for (const r of results.filter((x) => x.zone === "green").slice(0, 6)) {
    console.log(`  🟢 ${r.foxName} — ${r.isFloorValue ? "≤5" : r.valueUgMl} мкг/мл`);
  }
  console.log("\n--- Yellow (first 6) ---");
  for (const r of results.filter((x) => x.zone === "yellow").slice(0, 6)) {
    console.log(`  🟡 ${r.foxName} — ${r.valueUgMl} мкг/мл`);
  }
  console.log("\n--- Red (first 6) ---");
  for (const r of results.filter((x) => x.zone === "red").slice(0, 6)) {
    console.log(`  🔴 ${r.foxName} — ${r.valueUgMl} мкг/мл`);
  }
}

main().catch(console.error);
