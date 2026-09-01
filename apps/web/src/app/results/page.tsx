"use client";

import { useEffect, useState } from "react";
import { AppShell, Header } from "@/components/AppShell";
import { formatValue, zoneEmoji } from "@/lib/plan-engine";
import type { Zone } from "@/lib/fox-parser";

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
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results ?? []);
        setCounts(d.counts ?? { green: 0, yellow: 0, red: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter((r) => r.zone === zone);
  const tabs: Array<{ zone: Zone; label: string; count: number }> = [
    { zone: "green", label: "🟢 Зелёные", count: counts.green },
    { zone: "yellow", label: "🟡 Жёлтые", count: counts.yellow },
    { zone: "red", label: "🔴 Красные", count: counts.red },
  ];

  return (
    <AppShell>
      <Header title="Мои результаты" />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.zone}
              type="button"
              onClick={() => setZone(tab.zone)}
              className={`rounded-full px-3 py-2.5 text-[13px] ${
                zone === tab.zone
                  ? "bg-fox-primary font-semibold text-white"
                  : "border border-fox-border bg-white text-fox-text"
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="text-fox-muted">Загрузка…</p>
        ) : filtered.length === 0 ? (
          <p className="text-fox-muted">
            Нет данных.{" "}
            <a href="/upload" className="text-fox-primary underline">
              Загрузите отчёт
            </a>
          </p>
        ) : (
          <ul className="flex flex-col gap-2 pb-4">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm"
              >
                <span>{zoneEmoji(item.zone)}</span>
                <span>
                  {item.foxName} — {formatValue(item.valueUgMl, item.isFloorValue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
