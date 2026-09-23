#!/usr/bin/env npx tsx
import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";

async function main() {
  const path =
    process.argv[2] ||
    "/home/ubuntu/.cursor/projects/workspace/uploads/FOX______________e710.pdf";
  const buf = readFileSync(path);
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^БОБОВЫЕ|^ОРЕХИ|^ДРУГИЕ|^МОЛОКО И ЯЙЦО \d+/i.test(t)) {
      console.log(`--- line ${i}: ${t.slice(0, 60)} ---`);
      lines.slice(i, i + 25).forEach((l) => console.log(l));
    }
  }
}

main().catch(console.error);
