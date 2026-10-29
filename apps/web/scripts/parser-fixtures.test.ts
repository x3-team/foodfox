#!/usr/bin/env npx tsx
/**
 * Golden tests: parse fixture PDFs and compare to expected JSON.
 * Run: npm run parser:fixtures
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
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

function checkGolden(text: string, expectedFile: string, catalogNames: string[]) {
  const expected = JSON.parse(readFileSync(join(FIXTURE_DIR, expectedFile), "utf8")) as {
    parsedCount: number;
    confidence: string;
    results: Array<{
      foxName: string;
      valueUgMl: number | null;
      isFloorValue: boolean;
      zone: string;
    }>;
  };

  const results = normalizeParsedResults(parseFoxPdfText(text));
  const validation = validateParseResults(results, catalogNames);
  const quality = assessParseQuality(results, text, validation);

  assert.equal(results.length, expected.parsedCount);
  assert.equal(quality.confidence, expected.confidence);
  assert.deepEqual(validation.missingFromCatalog, []);
  assert.deepEqual(validation.extraVsCatalog, []);
  assert.equal(results.length, quality.verifiedInPdf, "every antigen from the PDF header");

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
    checkGolden(await parsePdfFixture("fox-report-e710.pdf"), "fox-report-e710.expected.json", catalog.names);
  });

  // Anonymised text fixtures (scripts/anonymize-fox-fixture.ts): real layouts, fake data.
  for (const file of readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".txt")).sort()) {
    await test(`${file} golden fixture`, () => {
      const text = readFileSync(join(FIXTURE_DIR, file), "utf8");
      checkGolden(text, file.replace(/\.txt$/, ".expected.json"), catalog.names);
    });
  }

  await test("2026 export: tabs, «<» floors and right-column names wrapped to the next line", () => {
    const text = [
      "Пахта \t46,06 \tмкг/мл Молоко коровье Bos d 8 *",
      "(Casein) 49,80 \tмкг/мл",
      "Козлятина \t< 5,00 \tмкг/мл \tСтраус \t12,00 \tмкг/мл",
      "Семена тыквы \t< 5,00 \tмкг/мл Глиадин пшеницы Tri a Gliadin",
      "* 30,79 \tмкг/мл",
      "Лук-порей \t5,35 \tмкг/мл Радиччо (красный салатный",
      "цикорий) < 5,00 \tмкг/мл",
      "Корица \t< 5,00 \tмкг/мл Перец (черный / белый /",
      "зеленый / красный / желтый) 9,22 \tмкг/мл",
      "Хмель \t< 5,00 \tмкг/мл М-трансглутаминаза, мясной",
      "клей 43,74 \tмкг/мл",
      "Дрожжи хлебопекарные \t< 5,00 \tмкг/мл",
      "CCD",
      "Человеческий лактоферрин \t7,60 \tмкг/мл",
      "Тестовый П.П. \t80DBE000 \t6 \t/ \t20",
    ].join("\n");
    const got = new Map(
      normalizeParsedResults(parseFoxPdfText(text)).map((r) => [r.foxName, r.valueUgMl]),
    );
    assert.deepEqual(
      [...got.entries()].sort(([a], [b]) => a.localeCompare(b, "ru")),
      [
        ["Глиадин пшеницы Tri a Gliadin *", 30.79],
        ["Дрожжи хлебопекарные", null],
        ["Козлятина", null],
        ["Корица", null],
        ["Лук-порей", 5.35],
        ["М-трансглутаминаза мясной клей", 43.74],
        ["Молоко коровье Bos d 8 *", 49.8],
        ["Пахта", 46.06],
        ["Перец (черный / белый / зеленый / красный / желтый)", 9.22],
        ["Радиччо (красный салатный цикорий)", null],
        ["Семена тыквы", null],
        ["Страус", 12],
        ["Хмель", null],
        ["CCD", 7.6],
      ],
    );
  });

  await test("a capitalised name on the next line is not glued to a dangling right-column name", () => {
    const text = "Пахта 46,06 мкг/мл Камамбер\nЭмменталь 41,80 мкг/мл";
    const names = parseFoxPdfText(text).map((r) => r.foxName);
    assert.deepEqual(names, ["Пахта", "Эмменталь"]);
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

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
