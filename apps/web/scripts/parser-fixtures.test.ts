#!/usr/bin/env npx tsx
/**
 * Golden tests: parse fixture PDFs and compare to expected JSON.
 * Run: npm run parser:fixtures
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { PDFParse } from "pdf-parse";
import { parseFoxPdfText, validateParseResults } from "../src/lib/fox-parser";
import {
  assessParseQuality,
  extractVerifiedAntigenCount,
  normalizeParsedResults,
} from "../src/lib/fox-parse-quality";

const FIXTURE_DIR = resolve(process.cwd(), "../../packages/database/fixtures");
const CATALOG_PATH = resolve(
  process.cwd(),
  "../../packages/database/seeds/fox-catalog-ru.json",
);

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`✓ ${name}`))
    .catch((e) => {
      console.error(`✗ ${name}`);
      throw e;
    });
}

async function parsePdfFixture(pdfName: string) {
  const buf = readFileSync(join(FIXTURE_DIR, pdfName));
  const parser = new PDFParse({ data: buf });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as {
    names: string[];
    verifiedInPdf: number;
  };

  await test("extractVerifiedAntigenCount reads PDF header", () => {
    const text = "ПРОВЕРЕННЫЕ АНТИГЕНЫ: 287\nПахта 45,01 мкг/мл";
    assert.equal(extractVerifiedAntigenCount(text), 287);
  });

  await test("normalizeParsedResults maps aliases", () => {
    const raw = parseFoxPdfText("Radicchio ≤ 5,00 мкг/мл");
    const norm = normalizeParsedResults(raw);
    assert.equal(
      norm[0]?.foxName,
      "Радиччо (красный салатный цикорий)",
    );
  });

  await test("fox-report-e710 golden fixture", async () => {
    const expectedPath = join(FIXTURE_DIR, "fox-report-e710.expected.json");
    const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as {
      parsedCount: number;
      confidence: string;
      results: Array<{
        foxName: string;
        valueUgMl: number | null;
        isFloorValue: boolean;
        zone: string;
      }>;
    };

    const text = await parsePdfFixture("fox-report-e710.pdf");
    const raw = parseFoxPdfText(text);
    const results = normalizeParsedResults(raw);
    const validation = validateParseResults(results, catalog.names);
    const quality = assessParseQuality(results, text, validation);

    assert.equal(results.length, expected.parsedCount);
    assert.equal(quality.confidence, expected.confidence);
    assert.equal(validation.missingFromCatalog.length, 0);
    assert.equal(validation.extraVsCatalog.length, 0);

    const byName = new Map(results.map((r) => [r.foxName, r]));
    for (const exp of expected.results) {
      const got = byName.get(exp.foxName);
      assert.ok(got, `missing ${exp.foxName}`);
      assert.equal(got!.zone, exp.zone, exp.foxName);
      assert.equal(got!.isFloorValue, exp.isFloorValue, exp.foxName);
      if (exp.valueUgMl == null) {
        assert.equal(got!.valueUgMl, null, exp.foxName);
      } else {
        assert.ok(
          Math.abs((got!.valueUgMl ?? 0) - exp.valueUgMl) < 0.01,
          `${exp.foxName}: ${got!.valueUgMl} vs ${exp.valueUgMl}`,
        );
      }
    }
  });

  await test("filters lab metadata and category index lines", () => {
    const text = `
      АНАЛИЗ ВЫПОЛНЕН 01.01.2025
      МОЛОКО И ЯЙЦО 17
      Пахта, Коровье молоко, Сыр
      Пахта 45,01 мкг/мл
    `;
    const r = parseFoxPdfText(text);
    assert.equal(r.length, 1);
    assert.equal(r[0].foxName, "Пахта");
  });

  console.log("\nAll fixture tests passed.");
}

main().catch(() => process.exit(1));
