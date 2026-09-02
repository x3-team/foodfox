"use client";

import Link from "next/link";
import type { Zone } from "@/lib/fox-parser";
import { formatValue } from "@/lib/plan-engine";
import {
  intensityFraction,
  percentOf,
  summaryHeadline,
  ZONE_META,
  type ResultItem,
} from "@/lib/report-insights";
import { ZONE_HEX, ZoneDonut } from "./ZoneDonut";

const ORDER: Zone[] = ["green", "yellow", "red"];

interface ReportSummaryProps {
  counts: Record<Zone, number>;
  onSelectZone: (zone: Zone) => void;
}

export function ReportSummary({ counts, onSelectZone }: ReportSummaryProps) {
  const total = counts.green + counts.yellow + counts.red;

  return (
    <section className="fox-card overflow-hidden">
      <div className="flex items-center gap-4 px-5 pb-4 pt-5">
        <ZoneDonut counts={counts} />
        <div className="min-w-0 flex-1 space-y-2.5">
          {ORDER.map((zone) => {
            const meta = ZONE_META[zone];
            const pct = percentOf(counts[zone], total);
            return (
              <button
                key={zone}
                type="button"
                onClick={() => onSelectZone(zone)}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: ZONE_HEX[zone] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-tight text-fox-text">
                    {meta.short}
                  </span>
                  <span className="block text-[11px] leading-tight text-fox-muted">
                    {meta.hint}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-semibold leading-none text-fox-text">
                    {counts[zone]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-none text-fox-muted">
                    {pct}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-fox-border/70 bg-fox-primary-soft/50 px-5 py-3.5">
        <p className="text-[13px] leading-relaxed text-fox-primary-dark">
          {summaryHeadline(counts)}
        </p>
      </div>
    </section>
  );
}

interface TopTriggersProps {
  items: ResultItem[];
}

export function TopTriggers({ items }: TopTriggersProps) {
  if (items.length === 0) return null;

  return (
    <section className="fox-card px-5 py-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-fox-text">Главные триггеры</h2>
        <span className="text-[12px] text-fox-muted">µg/ml IgG</span>
      </div>
      <p className="mb-3 text-[12px] leading-snug text-fox-muted">
        Самые высокие реакции — их убираем первыми
      </p>
      <ol className="divide-y divide-fox-border/60">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-[12px] font-bold text-fox-red">
              {index + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-[14px] text-fox-text"
              title={item.foxName}
            >
              {item.foxName}
            </span>
            <span className="shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[12px] font-semibold tabular-nums text-fox-red">
              {item.valueUgMl?.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface ZoneSegmentsProps {
  active: Zone;
  counts: Record<Zone, number>;
  onChange: (zone: Zone) => void;
}

export function ZoneSegments({ active, counts, onChange }: ZoneSegmentsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-fox-surface p-1.5 shadow-card">
      {ORDER.map((zone) => {
        const meta = ZONE_META[zone];
        const isActive = active === zone;
        return (
          <button
            key={zone}
            type="button"
            onClick={() => onChange(zone)}
            className={`flex flex-col items-center rounded-xl px-2 py-2.5 transition ${
              isActive ? "text-white" : "text-fox-text hover:bg-fox-bg"
            }`}
            style={isActive ? { background: ZONE_HEX[zone] } : undefined}
          >
            <span className="text-[17px] font-bold leading-none tabular-nums">
              {counts[zone]}
            </span>
            <span
              className={`mt-1 text-[11px] font-medium leading-none ${
                isActive ? "text-white/85" : "text-fox-muted"
              }`}
            >
              {meta.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ResultRowProps {
  item: ResultItem;
  max: number;
}

export function ResultRow({ item, max }: ResultRowProps) {
  const fraction = intensityFraction(item.valueUgMl, item.zone, max);
  const hex = ZONE_HEX[item.zone];

  return (
    <li className="fox-card group px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ background: hex, opacity: 0.25 + fraction * 0.75 }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-tight text-fox-text" title={item.foxName}>
            {item.foxName}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-fox-border/60">
              <span
                className="block h-full rounded-full"
                style={{ width: `${fraction * 100}%`, background: hex }}
              />
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-fox-muted">
              {formatValue(item.valueUgMl, item.isFloorValue)}
            </span>
          </div>
        </div>
        <Link
          href={`/chat?q=${encodeURIComponent(`Можно ли ${item.foxName}?`)}`}
          className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-fox-primary transition hover:bg-fox-primary-soft"
        >
          Спросить
        </Link>
      </div>
    </li>
  );
}

export function ReportActions() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Link
        href="/plan"
        className="rounded-xl bg-fox-primary px-4 py-3 text-center text-[14px] font-semibold text-white transition hover:bg-fox-primary-dark"
      >
        Открыть план
      </Link>
      <Link
        href="/chat"
        className="rounded-xl bg-fox-surface px-4 py-3 text-center text-[14px] font-semibold text-fox-primary shadow-card transition hover:bg-fox-primary-soft"
      >
        Спросить бота
      </Link>
    </div>
  );
}
