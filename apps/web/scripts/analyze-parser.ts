import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText } from "../src/lib/fox-parser";

async function main() {
  const buf = readFileSync(
    "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf",
  );
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  const results = parseFoxPdfText(text);

  console.log("Total:", results.length);

  const suspicious = results.filter(
    (r) =>
      r.foxName.startsWith("(") ||
      /^Bos d \d/i.test(r.foxName) ||
      /Alpha-Lactalbumin|Casein/i.test(r.foxName) ||
      r.foxName.length < 4,
  );
  console.log("\nSuspicious/extra entries:", suspicious.length);
  suspicious.forEach((r) => console.log(" ", r.foxName, r.valueUgMl, r.zone));

  const molecular = results.filter((r) => /Bos d|Alpha|Lactalbumin|Casein/i.test(r.foxName));
  console.log("\nMolecular total:", molecular.length);
  molecular.forEach((r) => console.log(" ", r.foxName));
}

main();
