"use client";

import { withBasePath } from "@/lib/base-path";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ZoneDot, ZoneTabs } from "@/components/ZoneTabs";
import { formatValue } from "@/lib/plan-engine";
import type { Zone } from "@/lib/fox-parser";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function ResultsPage() {
  const [zone, setZone] = useState<Zone>("green");
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

  const filtered = results.filter((r) => r.zone === zone);

  return (
    <AppShell>
      <PageHeader
        title="Мои результаты"
        subtitle="Продукты по зонам IgG — зелёные можно без ограничений"
      />
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-5">
        <ZoneTabs active={zone} counts={counts} onChange={setZone} />

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-fox-border/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="fox-card px-4 py-8 text-center">
            <p className="text-[15px] text-fox-muted">Пока нет данных по этой зоне.</p>
            <Link href="/upload" className="mt-2 inline-block text-[15px] font-semibold text-fox-primary">
              Загрузить отчёт →
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="fox-card flex items-center gap-3 px-4 py-3.5"
              >
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
      </main>
    </AppShell>
  );
}
