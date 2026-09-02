"use client";

import { withBasePath } from "@/lib/base-path";
import { AppShell, PageHeader } from "@/components/AppShell";
import { LoadMoreSentinel } from "@/components/LoadMoreSentinel";
import {
  ReportActions,
  ReportSummary,
  ResultRow,
  TopTriggers,
  ZoneSegments,
} from "@/components/report/ReportCards";
import { useIncrementalList } from "@/lib/list-pagination";
import { maxValue, topTriggers, ZONE_META, type ResultItem } from "@/lib/report-insights";
import type { Zone } from "@/lib/fox-parser";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

interface Counts {
  green: number;
  yellow: number;
  red: number;
}

const EMPTY_COUNTS: Counts = { green: 0, yellow: 0, red: 0 };

function sortForZone(items: ResultItem[], zone: Zone): ResultItem[] {
  if (zone === "green") {
    return [...items].sort((a, b) => a.foxName.localeCompare(b.foxName, "ru"));
  }
  return [...items].sort((a, b) => (b.valueUgMl ?? 0) - (a.valueUgMl ?? 0));
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const justUploaded = searchParams.get("uploaded") === "1";
  const isDemo = searchParams.get("demo") === "1";

  const [zone, setZone] = useState<Zone>("green");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBasePath("/api/results"))
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results ?? []);
        setCounts(d.counts ?? EMPTY_COUNTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const antigenTotal = counts.green + counts.yellow + counts.red;
  const scaleMax = useMemo(() => maxValue(results), [results]);
  const triggers = useMemo(() => topTriggers(results), [results]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inZone = results.filter((r) => {
      if (r.zone !== zone) return false;
      if (!q) return true;
      return r.foxName.toLowerCase().includes(q);
    });
    return sortForZone(inZone, zone);
  }, [results, zone, query]);

  const { visibleItems, hasMore, loadMore, total: filteredTotal, visibleCount } =
    useIncrementalList(filtered);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-52 animate-pulse rounded-2xl bg-fox-border/40" />
        <div className="h-16 animate-pulse rounded-2xl bg-fox-border/40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-fox-border/40" />
        ))}
      </div>
    );
  }

  if (antigenTotal === 0) {
    return (
      <div className="fox-card px-5 py-10 text-center">
        <p className="text-[16px] font-semibold text-fox-text">Отчёт пока не загружен</p>
        <p className="mx-auto mt-2 max-w-[16rem] text-[14px] leading-relaxed text-fox-muted">
          Загрузите PDF FOX — разберём 286 антигенов по зонам и построим план.
        </p>
        <Link href="/upload" className="fox-btn-primary mt-5 inline-block px-6">
          Загрузить отчёт
        </Link>
      </div>
    );
  }

  return (
    <>
      {justUploaded && (
        <div className="rounded-2xl border border-fox-primary/20 bg-fox-primary-soft px-4 py-3">
          <p className="text-[14px] font-semibold text-fox-primary-dark">
            {isDemo ? "Демо-отчёт загружен" : "Отчёт FOX разобран"} — план на 8 недель готов
          </p>
        </div>
      )}

      <ReportSummary counts={counts} onSelectZone={setZone} />

      <ReportActions />

      <TopTriggers items={triggers} max={scaleMax} />

      <section className="space-y-3">
        <ZoneSegments active={zone} counts={counts} onChange={setZone} />

        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-[15px] font-semibold text-fox-text">
            {ZONE_META[zone].label}
          </h2>
          <span className="text-[12px] text-fox-muted">{ZONE_META[zone].hint}</span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск продукта…"
          className="w-full rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[15px] outline-none transition focus:border-fox-primary focus:ring-2 focus:ring-fox-primary/15"
        />

        {filtered.length === 0 ? (
          <div className="fox-card px-4 py-8 text-center">
            <p className="text-[15px] text-fox-muted">
              {query ? `Ничего не найдено по «${query}»` : "Нет продуктов в этой зоне"}
            </p>
          </div>
        ) : (
          <>
            {filteredTotal > 10 && (
              <p className="px-0.5 text-[12px] text-fox-muted">
                Показано {visibleCount} из {filteredTotal}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {visibleItems.map((item) => (
                <ResultRow key={item.id} item={item} max={scaleMax} />
              ))}
            </ul>
            <LoadMoreSentinel hasMore={hasMore} onLoadMore={loadMore} />
          </>
        )}
      </section>
    </>
  );
}

export default function ResultsPage() {
  return (
    <AppShell>
      <PageHeader title="Отчёт FOX" subtitle="Ваши IgG-реакции по зонам" />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
        <Suspense fallback={<p className="text-fox-muted">Загрузка…</p>}>
          <ResultsContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
