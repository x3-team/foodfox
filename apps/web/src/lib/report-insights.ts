import type { Zone } from "./fox-parser";

export interface ResultItem {
  id: string;
  foxName: string;
  valueUgMl: number | null;
  isFloorValue: boolean;
  zone: Zone;
}

export const ZONE_META: Record<
  Zone,
  { label: string; short: string; hint: string; dot: string; text: string; soft: string }
> = {
  green: {
    label: "Зелёная зона",
    short: "Зелёные",
    hint: "Можно без ограничений",
    dot: "bg-fox-green",
    text: "text-fox-green",
    soft: "bg-emerald-50",
  },
  yellow: {
    label: "Жёлтая зона",
    short: "Жёлтые",
    hint: "Ротация раз в 4 дня",
    dot: "bg-fox-yellow",
    text: "text-fox-yellow",
    soft: "bg-amber-50",
  },
  red: {
    label: "Красная зона",
    short: "Красные",
    hint: "Временная элиминация",
    dot: "bg-fox-red",
    text: "text-fox-red",
    soft: "bg-red-50",
  },
};

export function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

/** Highest-IgG red items — the products driving the elimination plan. */
export function topTriggers(results: ResultItem[], limit = 5): ResultItem[] {
  return results
    .filter((r) => r.zone === "red" && r.valueUgMl !== null)
    .sort((a, b) => (b.valueUgMl ?? 0) - (a.valueUgMl ?? 0))
    .slice(0, limit);
}

/** Scale for the intensity bar; red zone starts at 20 µg/ml. */
export function intensityFraction(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0.06;
  return Math.min(Math.max(value / max, 0.06), 1);
}

export function maxValue(results: ResultItem[]): number {
  return results.reduce((m, r) => Math.max(m, r.valueUgMl ?? 0), 20);
}

export function summaryHeadline(counts: Record<Zone, number>): string {
  const total = counts.green + counts.yellow + counts.red;
  if (total === 0) return "Загрузите отчёт FOX, чтобы увидеть свои зоны";
  const greenPct = percentOf(counts.green, total);
  if (counts.red === 0) {
    return `Отличный результат: выраженных реакций нет, ${greenPct}% продуктов доступны свободно`;
  }
  return `${greenPct}% продуктов доступны без ограничений, ${counts.red} — под временной элиминацией`;
}
