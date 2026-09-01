export type Zone = "green" | "yellow" | "red";

export interface ParsedResult {
  foxName: string;
  valueUgMl: number | null;
  isFloorValue: boolean;
  zone: Zone;
}

export interface ZoneCounts {
  green: number;
  yellow: number;
  red: number;
}

export function classifyZone(value: number): Zone {
  if (value < 10) return "green";
  if (value < 20) return "yellow";
  return "red";
}

export function countZones(results: ParsedResult[]): ZoneCounts {
  return results.reduce(
    (acc, r) => {
      acc[r.zone] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );
}

/** Parse FOX PDF text: lines with product name + numeric µg/ml value */
export function parseFoxPdfText(text: string): ParsedResult[] {
  const results: ParsedResult[] = [];
  const seen = new Set<string>();

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 3) continue;

    // Skip headers / metadata
    if (/^(page|стр|patient|пациент|fox|food xplorer|результат)/i.test(line)) continue;

    // Pattern: "Product name  12.34" or "Product — 12.34 µg/ml"
    const match = line.match(
      /^(.+?)\s+([<≤]?\s*(\d+(?:[.,]\d+)?))\s*(?:µg\/ml|ug\/ml|мкг\/мл)?/i,
    );
    if (!match) continue;

    let name = match[1].replace(/[•·\-–—]+$/g, "").trim();
    name = name.replace(/\s{2,}/g, " ");
    if (name.length < 2 || /^\d+$/.test(name)) continue;

    const isFloor = match[2].includes("<") || match[2].includes("≤");
    const numStr = match[3].replace(",", ".");
    const value = parseFloat(numStr);
    if (Number.isNaN(value) && !isFloor) continue;

    const normalized = name.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const effectiveValue = isFloor ? 5 : value;
    results.push({
      foxName: name,
      valueUgMl: isFloor ? null : value,
      isFloorValue: isFloor,
      zone: classifyZone(effectiveValue),
    });
  }

  return results;
}
