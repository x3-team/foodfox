#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, countZones } from "../src/lib/fox-parser";

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

  console.log("PDF:", path);
  console.log("Text length:", text.length);
  console.log("\n=== PARSE SUMMARY ===");
  console.log("Total products:", results.length);
  console.log("Zones:", counts);
  console.log("Expected: ~287 antigens");

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
