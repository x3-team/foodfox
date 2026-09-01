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

export interface ParseValidation {
  expectedCount: number;
  parsedCount: number;
  missingFromCatalog: string[];
  extraVsCatalog: string[];
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

const VALUE_ONLY_RE =
  /^(?:≤|<)\s*(\d+(?:[.,]\d+)?)\s*мкг\/мл\.?\s*$|^(\d+(?:[.,]\d+)?)\s*мкг\/мл\.?\s*$/i;
const MOLECULAR_SUBLINE_RE =
  /^\([^)]+\)\s+(?:≤|<\s*)?(\d+(?:[.,]\d+)?)\s*мкг\/мл/i;

/** Section / table headers in RU FOX reports — not food rows */
const SECTION_HEADER_RE =
  /^(?:молоко и яйц(?:о|а)|рыба и морепродукты|мясо|овощи|специи|зерновые и семена|орехи|бобовые(?: культуры)?|фрукты|съедобные грибы|новые продукты|кофе и чай|другие|молоко и яйца|молекулярный антиген)$/i;

function normalizeName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*$/, "")
    .replace(/\s*≤\s*$/, "")
    .replace(/\*+\s*$/, " *")
    .replace(/\s+\*\s*$/, " *")
    .trim();
}

function isNarrativeLine(line: string): boolean {
  return /ваш уровень|составляет|уровень\s+igg|самая высокая измеренная|концентрация\s+igg/i.test(
    line,
  );
}

function isMetadataField(name: string): boolean {
  return (
    /:$/.test(name) ||
    /^id\s/i.test(name) ||
    /пациент/i.test(name) ||
    /образца/i.test(name) ||
    /qr-/i.test(name) ||
    /проанализировано/i.test(name) ||
    /проверенные антиген/i.test(name) ||
    /метод исследования/i.test(name) ||
    /лечащий врач/i.test(name) ||
    /дополнительная информация/i.test(name) ||
    /лабораторный отчет/i.test(name) ||
    /^\*?\s*молекулярный антиген/i.test(name) ||
    /^--\s*\d+\s+of\s+\d+/i.test(name) ||
    /^833177605/i.test(name) ||
    /^80aee345$/i.test(name) ||
    /^\.+$/.test(name)
  );
}

function isControlRow(name: string): boolean {
  return /^человеческий лактоферрин$/i.test(name);
}

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (SECTION_HEADER_RE.test(t)) return true;
  // ALL-CAPS category banners from PDF export
  if (/^[А-ЯA-Z][А-ЯA-Z\s]{4,}$/.test(t) && !/\d/.test(t)) return true;
  return false;
}

export function isValidProductName(name: string): boolean {
  if (name.length < 2) return false;
  if (isMetadataField(name)) return false;
  if (isNarrativeLine(name)) return false;
  if (isControlRow(name)) return false;
  if (isSectionHeader(name)) return false;
  if (/^(page|стр|--\s*\d|patient|пациент|fox|food xplorer)/i.test(name)) return false;
  if (/^\d[\d\s\-–—.]*мкг/i.test(name)) return false;
  if (/^(\d+\s*-\s*|≥\s*\d+\s*$)/.test(name.trim())) return false;
  if (/^\d+\s*-\s*\d/i.test(name)) return false;
  if (/^\d+\s*\/\s*\d+$/.test(name)) return false;
  if (/^[0-9A-F]{8,}\s*\d/i.test(name)) return false;
  if (/^[0-9A-F]{6,}$/i.test(name.replace(/\s/g, ""))) return false;
  if (/^молекулярный антиген/i.test(name)) return false;
  if (/^\(.+\)$/.test(name)) return false;
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

function isNameOnlyLine(line: string): boolean {
  if (/мкг\/мл/i.test(line)) return false;
  if (isNarrativeLine(line)) return false;
  if (isSectionHeader(line)) return false;
  if (isMetadataField(line)) return false;
  if (!/^[A-Za-zА-Яа-я(]/.test(line)) return false;
  const name = normalizeName(line);
  return isValidProductName(name);
}

function parseValueOnlyLine(line: string): { value: string; isFloor: boolean } | null {
  const m = line.match(VALUE_ONLY_RE);
  if (!m) return null;
  const value = m[1] ?? m[2];
  const isFloor = line.includes("≤") || line.includes("<");
  return { value, isFloor };
}

function hasUnclosedParen(text: string): boolean {
  return (text.match(/\(/g)?.length ?? 0) > (text.match(/\)/g)?.length ?? 0);
}

function parseCombinedLine(
  results: ParsedResult[],
  seen: Set<string>,
  line: string,
  pendingName: string | null,
  nameQueue: string[],
  partialName: string | null,
  deferredValue: { value: string; isFloor: boolean } | null,
): { pendingName: string | null; partialName: string | null; deferredValue: { value: string; isFloor: boolean } | null } {
  nameQueue.length = 0;

  // "М-трансглутаминаза," + "мясной клей 48,70 мкг/мл"
  if (pendingName && /,\s*$/.test(pendingName)) {
    FOX_ENTRY_RE.lastIndex = 0;
    const commaJoin = FOX_ENTRY_RE.exec(line);
    if (commaJoin) {
      pushResult(
        results,
        seen,
        `${pendingName.replace(/,\s*$/, "")} ${commaJoin[1].trim()}`,
        commaJoin[2],
        commaJoin[0].includes("≤") || commaJoin[0].includes("<"),
      );
      pendingName = null;
      line = line.slice(commaJoin.index! + commaJoin[0].length).trim();
      if (!line) return { pendingName, partialName, deferredValue };
    }
  }

  // Trailing floor value for split product name on previous lines (Radicchio)
  if (partialName && hasUnclosedParen(partialName)) {
    const trailing = line.match(/(?:≤|<)\s*(\d+(?:[.,]\d+)?)\s*мкг\/мл\s*$/i);
    if (trailing) {
      deferredValue = { value: trailing[1], isFloor: true };
      line = line.replace(/(?:≤|<)\s*(\d+(?:[.,]\d+)?)\s*мкг\/мл\s*$/i, "").trim();
    }
  }

  // Molecular sub-line: pending "Молоко коровье Bos d 4 *" + "(Alpha-Lactalbumin) 48,41 мкг/мл ..."
  if (pendingName) {
    const sub = line.match(MOLECULAR_SUBLINE_RE);
    if (sub) {
      pushResult(results, seen, pendingName, sub[1], line.includes("≤") || line.includes("<"));
      pendingName = null;
      line = line.replace(MOLECULAR_SUBLINE_RE, "").trim();
      if (!line) return { pendingName, partialName, deferredValue };
    }
  }

  pendingName = null;
  FOX_ENTRY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FOX_ENTRY_RE.exec(line)) !== null) {
    const segment = match[0];
    const isFloor = segment.includes("≤") || segment.includes("<");
    pushResult(results, seen, match[1], match[2], isFloor);
  }
  return { pendingName, partialName, deferredValue };
}

/**
 * Parse FOX Food Xplorer PDF text.
 * Handles:
 * - two-column lines: "Продукт 12,34 мкг/мл Другой ≤ 5,00 мкг/мл"
 * - name/value table blocks (names stacked, then values stacked)
 * - molecular continuations: "Bos d 4 *" then "(Alpha-Lactalbumin) 48,41 мкг/мл"
 * - narrative interpretation pages (filtered out)
 */
export function parseFoxPdfText(text: string): ParsedResult[] {
  const results: ParsedResult[] = [];
  const seen = new Set<string>();
  let pendingName: string | null = null;
  let partialName: string | null = null;
  let deferredValue: { value: string; isFloor: boolean } | null = null;
  const nameQueue: string[] = [];

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || isNarrativeLine(line)) {
      pendingName = null;
      partialName = null;
      deferredValue = null;
      continue;
    }

    // Continuation: "* 6,76 мкг/мл" after product name on previous line
    const cont = line.match(/^\*\s*(?:≤|<\s*)?(\d+(?:[.,]\d+)?)\s*мкг\/мл/i);
    if (cont && pendingName) {
      const isFloor = line.includes("≤") || line.includes("<");
      pushResult(results, seen, pendingName, cont[1], isFloor);
      pendingName = null;
      continue;
    }

    // CCD row paired with lactoferrin control value on next line
    if (/мкг\/мл/i.test(line) && /лактоферрин/i.test(line)) {
      const ccdIdx = nameQueue.lastIndexOf("CCD");
      if (ccdIdx >= 0) {
        const val = line.match(/(?:≤|<)\s*(\d+(?:[.,]\d+)?)\s*мкг\/мл/i);
        if (val) {
          pushResult(results, seen, "CCD", val[1], line.includes("≤") || line.includes("<"));
          nameQueue.splice(ccdIdx, 1);
          continue;
        }
      }
    }

    // Value-only row in table layout — pair with queued or pending name
    const valueOnly = parseValueOnlyLine(line);
    if (valueOnly) {
      const name = nameQueue.length > 0 ? nameQueue.shift()! : pendingName;
      if (name) {
        pushResult(results, seen, name, valueOnly.value, valueOnly.isFloor);
        pendingName = null;
      }
      continue;
    }

    if (/мкг\/мл/i.test(line)) {
      ({ pendingName, partialName, deferredValue } = parseCombinedLine(
        results,
        seen,
        line,
        pendingName,
        nameQueue,
        partialName,
        deferredValue,
      ));
      continue;
    }

    if (isSectionHeader(line) || /^--\s*\d+\s+of\s+\d+/i.test(line)) {
      nameQueue.length = 0;
      pendingName = null;
      partialName = null;
      deferredValue = null;
      continue;
    }

    // Multi-line product name with unclosed parenthesis (Radicchio)
    if (partialName) {
      partialName = `${partialName} ${line}`.replace(/\s+/g, " ").trim();
      if (!hasUnclosedParen(partialName)) {
        const name = normalizeName(partialName);
        if (deferredValue) {
          pushResult(results, seen, name, deferredValue.value, deferredValue.isFloor);
          deferredValue = null;
        } else if (isValidProductName(name)) {
          nameQueue.push(name);
        }
        partialName = null;
      }
      continue;
    }

    if (hasUnclosedParen(line)) {
      partialName = line;
      continue;
    }

    // Name-only line
    if (isNameOnlyLine(line)) {
      const name = normalizeName(line);
      if (/,\s*$/.test(line)) {
        pendingName = line.replace(/\*+\s*$/, "").trim();
        continue;
      }
      if (/\*\s*$/.test(line)) {
        pendingName = name;
        continue;
      }
      nameQueue.push(name);
      pendingName = name;
      continue;
    }

    pendingName = null;
  }

  return results;
}

/** Validate parsed names against a canonical RU catalog (from seeds). */
export function validateParseResults(
  results: ParsedResult[],
  catalogNamesRu: readonly string[],
): ParseValidation {
  const catalog = new Set(catalogNamesRu.map((n) => n.toLowerCase()));
  const parsed = new Set(results.map((r) => r.foxName.toLowerCase()));

  const missingFromCatalog = catalogNamesRu.filter((n) => !parsed.has(n.toLowerCase()));
  const extraVsCatalog = results
    .map((r) => r.foxName)
    .filter((n) => !catalog.has(n.toLowerCase()));

  return {
    expectedCount: catalogNamesRu.length,
    parsedCount: results.length,
    missingFromCatalog,
    extraVsCatalog,
  };
}
