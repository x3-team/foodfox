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

/** FOX zones: green <10, yellow 10–19.99, red ≥20 µg/ml */
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

/** One product + value pair from FOX PDF (supports two-column lines) */
const FOX_ENTRY_RE =
  /(.+?)\s+(?:≤|<\s*)?(\d+(?:[.,]\d+)?)\s*мкг\/мл/gi;

function normalizeName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*≤\s*$/, "")
    .replace(/\*+\s*$/, " *")
    .replace(/\s+\*\s*$/, " *")
    .trim();
}

function isValidProductName(name: string): boolean {
  if (name.length < 2) return false;
  if (/^(page|стр|--\s*\d|patient|пациент|fox|food xplorer)/i.test(name)) return false;
  if (/^\d[\d\s\-–—.]*мкг/i.test(name)) return false;
  if (/^(\d+\s*-\s*|≥\s*\d+\s*$)/.test(name.trim())) return false;
  if (/^\d+\s*-\s*\d/i.test(name)) return false; // "0 - 9" legend
  if (/^\d+\s*\/\s*\d+$/.test(name)) return false;
  if (/^[0-9A-F]{6,}\s*\d/i.test(name)) return false;
  if (/^[\d\s/A-F≥]+$/.test(name)) return false;
  if (/^молекулярный антиген/i.test(name)) return false;
  return true;
}

function pushResult(
  results: ParsedResult[],
  seen: Set<string>,
  rawName: string,
  rawValue: string,
  isFloor: boolean,
) {
  const foxName = normalizeName(rawName);
  if (!isValidProductName(foxName)) return;

  const value = parseFloat(rawValue.replace(",", "."));
  if (Number.isNaN(value)) return;

  const key = foxName.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);

  const effectiveValue = isFloor ? 5 : value;
  results.push({
    foxName,
    valueUgMl: isFloor ? null : value,
    isFloorValue: isFloor,
    zone: classifyZone(effectiveValue),
  });
}

/**
 * Parse FOX Food Xplorer PDF text.
 * Handles two-column layout: "Продукт 12,34 мкг/мл Другой продукт ≤ 5,00 мкг/мл"
 */
export function parseFoxPdfText(text: string): ParsedResult[] {
  const results: ParsedResult[] = [];
  const seen = new Set<string>();
  let pendingName: string | null = null;

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Continuation: "* 6,76 мкг/мл" after product name on previous line
    const cont = line.match(/^\*\s*(?:≤|<\s*)?(\d+(?:[.,]\d+)?)\s*мкг\/мл/i);
    if (cont && pendingName) {
      const isFloor = line.includes("≤") || line.includes("<");
      pushResult(results, seen, pendingName, cont[1], isFloor);
      pendingName = null;
      continue;
    }

    if (!/мкг\/мл/i.test(line)) {
      if (/^[A-Za-zА-Яа-я(].*\*?\s*$/.test(line) && !/^\d/.test(line)) {
        pendingName = line.replace(/\*+\s*$/, "").trim();
      } else {
        pendingName = null;
      }
      continue;
    }

    pendingName = null;
    FOX_ENTRY_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FOX_ENTRY_RE.exec(line)) !== null) {
      const segment = match[0];
      const isFloor = segment.includes("≤") || segment.includes("<");
      pushResult(results, seen, match[1], match[2], isFloor);
    }
  }

  return results;
}
