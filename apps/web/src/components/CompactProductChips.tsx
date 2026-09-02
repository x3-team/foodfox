"use client";

import { useEffect, useState } from "react";
import { LIST_STEP, useIncrementalList } from "@/lib/list-pagination";

type ChipTone = "green" | "red" | "yellow";

const TONE_STYLES: Record<ChipTone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  red: "bg-red-50 text-red-800 ring-red-200/80",
  yellow: "bg-amber-50 text-amber-900 ring-amber-200/80",
};

function productCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} продукт`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} продукта`;
  return `${n} продуктов`;
}

interface CompactProductChipsProps {
  items: string[];
  tone: ChipTone;
  label: string;
  previewCount?: number;
  collapsedByDefault?: boolean;
}

export function CompactProductChips({
  items,
  tone,
  label,
  previewCount = 6,
  collapsedByDefault = false,
}: CompactProductChipsProps) {
  const [open, setOpen] = useState(!collapsedByDefault || items.length <= previewCount);

  useEffect(() => {
    setOpen(!collapsedByDefault || items.length <= previewCount);
  }, [items, collapsedByDefault, previewCount]);

  const { visibleItems, hasMore, loadMore, total, visibleCount } = useIncrementalList(
    items,
    previewCount,
    LIST_STEP,
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-fox-bg/60 px-3 py-2 text-[13px] text-fox-muted">
        {label}: нет данных
      </div>
    );
  }

  return (
    <div className="rounded-xl ring-1 ring-fox-border/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-fox-muted">
            {label}
          </p>
          {!open && (
            <p className="mt-1 text-[13px] text-fox-muted">
              {productCountLabel(items.length)} · нажмите, чтобы раскрыть
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${TONE_STYLES[tone]}`}
        >
          {items.length}
        </span>
        <span className="shrink-0 text-[11px] text-fox-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-fox-border/80 px-3 pb-3 pt-2">
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto overscroll-contain">
            {visibleItems.map((item) => (
              <span
                key={item}
                className={`inline-block max-w-full whitespace-normal break-words rounded-lg px-2 py-1 text-[12px] font-medium leading-snug ring-1 ${TONE_STYLES[tone]}`}
                title={item}
              >
                {item}
              </span>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="rounded-lg bg-fox-primary-soft px-2 py-1 text-[12px] font-semibold text-fox-primary"
              >
                +{total - visibleCount}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CompactDayDetailsProps {
  allowed: string[];
  forbidden: string[];
  rotation: string[];
}

export function CompactDayDetails({ allowed, forbidden, rotation }: CompactDayDetailsProps) {
  return (
    <div className="space-y-2 border-t border-fox-border px-4 py-3">
      <CompactProductChips items={allowed} tone="green" label="Можно" previewCount={6} />
      <CompactProductChips
        items={forbidden}
        tone="red"
        label="Исключить"
        previewCount={6}
        collapsedByDefault={forbidden.length > 5}
      />
      {rotation.length > 0 && (
        <CompactProductChips items={rotation} tone="yellow" label="Ротация" previewCount={4} />
      )}
    </div>
  );
}
