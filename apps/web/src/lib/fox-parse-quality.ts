import { readFileSync } from "fs";
import { join } from "path";
import type { ParsedResult, ParseValidation } from "./fox-parser";
import { parseFoxPdfText, validateParseResults } from "./fox-parser";

export type ParseConfidence = "high" | "medium" | "low";

export interface ParseQualityReport {
  parsedCount: number;
  verifiedInPdf: number | null;
  catalogCount: number;
  coverageVsHeader: number | null;
  coverageVsCatalog: number;
  confidence: ParseConfidence;
  warnings: string[];
  missingFromCatalog: string[];
  extraVsCatalog: string[];
  normalizedCount: number;
}

let catalogNamesCache: string[] | null = null;
let aliasesCache: Record<string, string> | null = null;

function loadCatalogNames(): string[] {
  if (catalogNamesCache) return catalogNamesCache;
  const path = join(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");
  const data = JSON.parse(readFileSync(path, "utf-8")) as { names: string[] };
  catalogNamesCache = data.names;
  return catalogNamesCache;
}

function loadAliases(): Record<string, string> {
  if (aliasesCache) return aliasesCache;
  const path = join(process.cwd(), "../../packages/database/seeds/fox-catalog-aliases.json");
  const data = JSON.parse(readFileSync(path, "utf-8")) as {
    aliases: Record<string, string>;
  };
  aliasesCache = data.aliases;
  return aliasesCache;
}

/** «ПРОВЕРЕННЫЕ АНТИГЕНЫ: 287» from FOX PDF header. */
export function extractVerifiedAntigenCount(pdfText: string): number | null {
  const m = pdfText.match(/ПРОВЕРЕННЫЕ\s+АНТИГЕНЫ:\s*(\d+)/i);
  if (m) return Number(m[1]);
  const m2 = pdfText.match(/verified\s+antigens?\s*:?\s*(\d+)/i);
  return m2 ? Number(m2[1]) : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Map parsed names to canonical RU catalog entries (exact + aliases + fuzzy). */
export function normalizeParsedResults(results: ParsedResult[]): ParsedResult[] {
  const catalog = loadCatalogNames();
  const aliases = loadAliases();
  const catalogLower = new Map(catalog.map((n) => [n.toLowerCase(), n]));

  return results.map((row) => {
    const key = row.foxName.trim().toLowerCase();
    const aliasHit = aliases[key];
    if (aliasHit) {
      return { ...row, foxName: aliasHit };
    }
    const exact = catalogLower.get(key);
    if (exact) return { ...row, foxName: exact };

    let best: string | null = null;
    let bestDist = 4;
    for (const name of catalog) {
      const dist = levenshtein(key, name.toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        best = name;
      }
    }
    if (best && bestDist <= 2) {
      return { ...row, foxName: best };
    }
    return row;
  });
}

export function assessParseQuality(
  results: ParsedResult[],
  pdfText: string,
  validation?: ParseValidation,
): ParseQualityReport {
  const catalog = loadCatalogNames();
  const verifiedInPdf = extractVerifiedAntigenCount(pdfText);
  const v = validation ?? validateParseResults(results, catalog);
  const parsedCount = results.length;
  const catalogCount = catalog.length;

  const coverageVsHeader =
    verifiedInPdf != null && verifiedInPdf > 0
      ? Math.round((parsedCount / verifiedInPdf) * 1000) / 10
      : null;
  const coverageVsCatalog =
    catalogCount > 0 ? Math.round((parsedCount / catalogCount) * 1000) / 10 : 100;

  const warnings: string[] = [];

  if (parsedCount < 50) {
    warnings.push("Слишком мало антигенов — возможно, PDF не от FOX или текст не извлечён.");
  }
  if (v.extraVsCatalog.length > 0) {
    warnings.push(`Лишние строки (${v.extraVsCatalog.length}): возможен мусор из PDF.`);
  }
  if (v.missingFromCatalog.length > 0) {
    warnings.push(`Не хватает ${v.missingFromCatalog.length} позиций из справочника.`);
  }
  if (verifiedInPdf != null && parsedCount < verifiedInPdf - 3) {
    warnings.push(
      `В шапке PDF указано ${verifiedInPdf} антигенов, распознано ${parsedCount}.`,
    );
  }
  if (
    verifiedInPdf != null &&
    parsedCount === catalogCount &&
    parsedCount < verifiedInPdf &&
    v.missingFromCatalog.length === 0
  ) {
    warnings.push(
      `Все ${parsedCount} позиций справочника найдены; разница с шапкой PDF (${verifiedInPdf}) — служебные строки (CCD, контроль).`,
    );
  }

  let confidence: ParseConfidence = "high";
  if (parsedCount < 200 || v.missingFromCatalog.length > 10 || v.extraVsCatalog.length > 5) {
    confidence = "low";
  } else if (
    v.missingFromCatalog.length > 0 ||
    v.extraVsCatalog.length > 0 ||
    (verifiedInPdf != null &&
      parsedCount < verifiedInPdf - 1 &&
      v.missingFromCatalog.length > 0)
  ) {
    confidence = "medium";
  }

  return {
    parsedCount,
    verifiedInPdf,
    catalogCount,
    coverageVsHeader,
    coverageVsCatalog,
    confidence,
    warnings,
    missingFromCatalog: v.missingFromCatalog,
    extraVsCatalog: v.extraVsCatalog,
    normalizedCount: parsedCount,
  };
}

export function parseAndNormalize(pdfText: string): {
  results: ParsedResult[];
  quality: ParseQualityReport;
} {
  const raw = parseFoxPdfText(pdfText);
  const results = normalizeParsedResults(raw);
  const validation = validateParseResults(results, loadCatalogNames());
  const quality = assessParseQuality(results, pdfText, validation);
  return { results, quality };
}
