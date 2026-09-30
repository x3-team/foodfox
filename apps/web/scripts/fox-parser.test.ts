#!/usr/bin/env npx tsx
/**
 * Unit checks for FOX PDF parser edge cases.
 * Run: npx tsx scripts/fox-parser.test.ts
 */
import assert from "node:assert/strict";
import { parseFoxPdfText, countZones } from "../src/lib/fox-parser";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

test("filters narrative interpretation lines", () => {
  const text = `
    Пахта 45,01 мкг/мл
    Ваш уровень IgG к пахте составляет 45,01 мкг/мл.
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "Пахта");
});

test("pairs table block names with floor-only values", () => {
  const text = `
    Нут
    Соя
    ≤ 5,00 мкг/мл
    20,12 мкг/мл
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 2);
  assert.equal(r[0].foxName, "Нут");
  assert.equal(r[0].isFloorValue, true);
  assert.equal(r[1].foxName, "Соя");
  assert.equal(r[1].valueUgMl, 20.12);
  assert.equal(r[1].zone, "red");
});

test("parses Bos d 4 molecular continuation", () => {
  const text = `
    Молоко коровье Bos d 4 *
    (Alpha-Lactalbumin) 48,41 мкг/мл
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "Молоко коровье Bos d 4 *");
  assert.equal(r[0].valueUgMl, 48.41);
  assert.equal(r[0].zone, "red");
});

test("joins comma-split product name", () => {
  const text = `
    М-трансглутаминаза,
    мясной клей 48,70 мкг/мл
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "М-трансглутаминаза мясной клей");
  assert.equal(r[0].zone, "red");
});

test("assigns CCD value from lactoferrin control row", () => {
  const text = `
    CCD
    Человеческий лактоферрин ≤ 5,00 мкг/мл
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "CCD");
  assert.equal(r[0].isFloorValue, true);
});

test("parses split Radicchio name across lines", () => {
  const text = `
    Радиччо (красный салатный
    Лук-порей ≤ 5,00 мкг/мл ≤ 5,00 мкг/мл
    цикорий)
  `;
  const r = parseFoxPdfText(text);
  const rad = r.find((x) => x.foxName.includes("Радиччо"));
  assert.ok(rad);
  assert.equal(rad!.isFloorValue, true);
  assert.ok(r.find((x) => x.foxName.includes("Лук-порей")));
});

test("filters lab metadata and category index lines", () => {
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

test("survives non-breaking spaces and soft hyphens from PDF export", () => {
  const text = "\u041f\u0430\u0445\u0442\u0430\u00A045,01\u00A0\u043c\u043a\u0433/\u043c\u043b";
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "Пахта");
  assert.equal(r[0].valueUgMl, 45.01);
});

test("accepts latin and greek micro sign spellings", () => {
  for (const unit of ["мкг/мл", "µg/ml", "μg/ml", "ug/ml"]) {
    const r = parseFoxPdfText(`Гречка 12,50 ${unit}`);
    assert.equal(r.length, 1, unit);
    assert.equal(r[0].valueUgMl, 12.5, unit);
    assert.equal(r[0].zone, "yellow", unit);
  }
});

test("treats dot and comma decimals identically", () => {
  const comma = parseFoxPdfText("Овёс 13,55 мкг/мл");
  const dot = parseFoxPdfText("Овёс 13.55 мкг/мл");
  assert.equal(comma[0].valueUgMl, 13.55);
  assert.equal(dot[0].valueUgMl, 13.55);
});

test("drops patient identifiers regardless of the specific report", () => {
  const text = `
    833177605
    80aee345
    5512347788
    deadbeefcafe
    Пахта 45,01 мкг/мл
  `;
  const r = parseFoxPdfText(text);
  assert.equal(r.length, 1);
  assert.equal(r[0].foxName, "Пахта");
});

test("classifies zone boundaries exactly", () => {
  assert.equal(parseFoxPdfText("Гречка 9,99 мкг/мл")[0].zone, "green");
  assert.equal(parseFoxPdfText("Гречка 10,00 мкг/мл")[0].zone, "yellow");
  assert.equal(parseFoxPdfText("Гречка 19,99 мкг/мл")[0].zone, "yellow");
  assert.equal(parseFoxPdfText("Гречка 20,00 мкг/мл")[0].zone, "red");
});

test("floor values are reported without a number", () => {
  const r = parseFoxPdfText("Форель ≤ 5,00 мкг/мл");
  assert.equal(r[0].isFloorValue, true);
  assert.equal(r[0].valueUgMl, null);
  assert.equal(r[0].zone, "green");
});

test("never emits duplicates for a repeated product", () => {
  const r = parseFoxPdfText(`
    Гречка 12,50 мкг/мл
    Гречка 12,50 мкг/мл
    ГРЕЧКА 12,50 мкг/мл
  `);
  assert.equal(r.length, 1);
});

test("parses a two-column line into two products", () => {
  const r = parseFoxPdfText("Пахта 45,01 мкг/мл Лук-порей ≤ 5,00 мкг/мл");
  assert.equal(r.length, 2);
  assert.equal(r[0].foxName, "Пахта");
  assert.equal(r[1].foxName, "Лук-порей");
  assert.equal(r[1].isFloorValue, true);
});

test("returns an empty result instead of throwing on junk input", () => {
  for (const junk of ["", "   ", "\n\n", "%PDF-1.7 binary garbage"]) {
    assert.deepEqual(parseFoxPdfText(junk), []);
  }
});

console.log("\nAll parser tests passed.");
