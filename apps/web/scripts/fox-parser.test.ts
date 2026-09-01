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

console.log("\nAll parser tests passed.");
