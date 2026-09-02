"use client";

import { withBasePath } from "@/lib/base-path";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ZoneDot, ZoneTabs } from "@/components/ZoneTabs";
import { formatValue } from "@/lib/plan-engine";
import type { Zone } from "@/lib/fox-parser";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

interface ResultItem {
  id: string;
  foxName: string;
  valueUgMl: number | null;
  isFloorValue: boolean;
  zone: Zone;
}

interface Counts {
  green: number;
  yellow: number;
  red: number;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const justUploaded = searchParams.get("uploaded") === "1";
  const isDemo = searchParams.get("demo") === "1";
  const uploadCounts = {
    green: parseInt(searchParams.get("green") ?? "0", 10),
    yellow: parseInt(searchParams.get("yellow") ?? "0", 10),
    red: parseInt(searchParams.get("red") ?? "0", 10),
  };

  const [zone, setZone] = useState<Zone>("green");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ green: 0, yellow: 0, red: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withBasePath("/api/results"))
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results ?? []);
        setCounts(d.counts ?? { green: 0, yellow: 0, red: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      if (r.zone !== zone) return false;
      if (!q) return true;
      return r.foxName.toLowerCase().includes(q);
    });
  }, [results, zone, query]);

  const total = counts.green + counts.yellow + counts.red;

  return (
    <>
      {justUploaded && total > 0 && (
        <div className="fox-card space-y-3 border border-fox-primary/20 bg-fox-primary-soft px-4 py-4">
          <p className="text-[16px] font-semibold text-fox-primary-dark">
            {isDemo ? "✅ Демо-отчёт загружен" : "✅ Отчёт FOX разобран"}
          </p>
          <p className="text-[14px] leading-relaxed text-fox-text">
            {uploadCounts.green + uploadCounts.yellow + uploadCounts.red || total} антигенов · 🟢{" "}
            {uploadCounts.green || counts.green} · 🟡 {uploadCounts.yellow || counts.yellow} · 🔴{" "}
            {uploadCounts.red || counts.red}
          </p>
          <p className="text-[13px] text-fox-muted">
            Создан 8-недельный план на 56 дней. Дальше — план и чат с ботом.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/plan"
              className="rounded-xl bg-fox-primary px-4 py-2 text-[14px] font-semibold text-white"
            >
              Открыть план
            </Link>
            <Link
              href="/chat"
              className="rounded-xl bg-white px-4 py-2 text-[14px] font-semibold text-fox-primary ring-1 ring-fox-primary/30"
            >
              Спросить бота
            </Link>
          </div>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск продукта…"
        className="w-full rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[15px] outline-none focus:border-fox-primary"
      />

      <ZoneTabs active={zone} counts={counts} onChange={setZone} />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-fox-border/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fox-card px-4 py-8 text-center">
          <p className="text-[15px] text-fox-muted">
            {query ? "Ничего не найдено" : "Пока нет данных по этой зоне."}
          </p>
          {!query && (
            <Link href="/upload" className="mt-2 inline-block text-[15px] font-semibold text-fox-primary">
              Загрузить отчёт →
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id} className="fox-card flex items-center gap-3 px-4 py-3.5">
              <ZoneDot zone={item.zone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-fox-text">{item.foxName}</p>
                <p className="text-[13px] text-fox-muted">
                  {formatValue(item.valueUgMl, item.isFloorValue)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ResultsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Мои результаты"
        subtitle="Продукты по зонам IgG — зелёные можно без ограничений"
      />
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-5">
        <Suspense fallback={<p className="text-fox-muted">Загрузка…</p>}>
          <ResultsContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
