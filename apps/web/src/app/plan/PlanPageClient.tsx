"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";

interface PlanDay {
  date: string;
  weekNumber: number;
  allowed: string[];
  forbidden: string[];
  rotation: string[];
  botMessage: string;
  isToday: boolean;
}

interface PlanWeek {
  weekNumber: number;
  phase: string;
  days: PlanDay[];
}

interface PlanData {
  planId: string;
  startedAt: string;
  weeks: PlanWeek[];
}

const QUICK_QUESTIONS = [
  "Что можно есть на этой неделе?",
  "Какие продукты исключить?",
  "Можно ли гречку?",
  "Что такое ротация жёлтой зоны?",
];

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

export default function PlanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWeek = parseInt(searchParams.get("week") ?? "0", 10);

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReport, setHasReport] = useState(false);

  useEffect(() => {
    fetch(withBasePath("/api/plan"))
      .then((r) => {
        if (r.status === 401) {
          router.replace("/login?next=/plan");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setPlan(d.plan);
        setCurrentWeek(d.currentWeek ?? 1);
        setHasReport(d.hasReport);
        const week =
          initialWeek >= 1 && initialWeek <= 8 ? initialWeek : (d.currentWeek ?? 1);
        setSelectedWeek(week);
      })
      .finally(() => setLoading(false));
  }, [router, initialWeek]);

  const weekData = useMemo(
    () => plan?.weeks.find((w) => w.weekNumber === selectedWeek),
    [plan, selectedWeek],
  );

  const summaryDay = weekData?.days[0];

  const askBot = (question: string) => {
    const q = encodeURIComponent(question);
    router.push(`/chat?q=${q}&week=${selectedWeek}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="План питания"
        subtitle="8 недель по вашему отчёту FOX — элиминация, стабилизация, расширение"
      />

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4">
        {loading && (
          <p className="py-8 text-center text-[14px] text-fox-muted">Загрузка плана…</p>
        )}

        {!loading && !hasReport && (
          <div className="fox-card px-5 py-8 text-center">
            <p className="text-[15px] font-medium text-fox-text">План пока не создан</p>
            <p className="mt-2 text-[14px] leading-relaxed text-fox-muted">
              Загрузите PDF-отчёт FOX — мы автоматически построим 8-недельный план на 56 дней.
            </p>
            <Link href="/upload" className="fox-btn-primary mt-5 inline-block px-6">
              Загрузить отчёт
            </Link>
          </div>
        )}

        {!loading && plan && (
          <>
            <div className="fox-card px-4 py-3">
              <p className="text-[13px] text-fox-muted">
                Старт: <span className="font-medium text-fox-text">{plan.startedAt}</span>
                {" · "}
                Сейчас неделя{" "}
                <span className="font-semibold text-fox-primary">{currentWeek}</span> из 8
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {plan.weeks.map((w) => {
                const active = w.weekNumber === selectedWeek;
                const isCurrent = w.weekNumber === currentWeek;
                return (
                  <button
                    key={w.weekNumber}
                    type="button"
                    onClick={() => setSelectedWeek(w.weekNumber)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-left transition ${
                      active
                        ? "bg-fox-primary text-white shadow-card"
                        : "bg-fox-surface text-fox-text ring-1 ring-fox-border"
                    }`}
                  >
                    <span className="block text-[13px] font-semibold">
                      Нед. {w.weekNumber}
                      {isCurrent && !active && (
                        <span className="ml-1 text-[10px] text-fox-primary">•</span>
                      )}
                    </span>
                    <span
                      className={`block text-[11px] ${active ? "text-white/85" : "text-fox-muted"}`}
                    >
                      {w.phase}
                    </span>
                  </button>
                );
              })}
            </div>

            {summaryDay && (
              <div className="fox-card space-y-3 px-4 py-4">
                <h2 className="text-[16px] font-semibold text-fox-text">
                  Неделя {selectedWeek}: {weekData?.phase}
                </h2>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-fox-green">
                    Можно
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-fox-text">
                    {summaryDay.allowed.slice(0, 12).join(", ")}
                    {summaryDay.allowed.length > 12 && "…"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-fox-red">
                    Исключить
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-fox-text">
                    {summaryDay.forbidden.slice(0, 10).join(", ")}
                    {summaryDay.forbidden.length > 10 && "…"}
                  </p>
                </div>
                {summaryDay.rotation.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium uppercase tracking-wide text-fox-yellow">
                      Ротация жёлтой зоны
                    </p>
                    <p className="mt-1 text-[14px] text-fox-text">
                      {summaryDay.rotation.join(", ")}
                    </p>
                  </div>
                )}
                {summaryDay.botMessage && (
                  <p className="rounded-xl bg-fox-primary-soft px-3 py-2.5 text-[13px] leading-relaxed text-fox-primary-dark">
                    {summaryDay.botMessage}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-fox-muted">
                Дни недели
              </h3>
              {weekData?.days.map((day) => {
                const open = expandedDay === day.date;
                return (
                  <div
                    key={day.date}
                    className={`fox-card overflow-hidden ${day.isToday ? "ring-2 ring-fox-primary/40" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay(open ? null : day.date)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-fox-text">
                          {formatDate(day.date)}
                          {day.isToday && (
                            <span className="ml-2 rounded-full bg-fox-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                              сегодня
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[12px] text-fox-muted">
                          {day.allowed.length} разрешённых · {day.forbidden.length} исключений
                        </p>
                      </div>
                      <span className="text-fox-muted">{open ? "▲" : "▼"}</span>
                    </button>
                    {open && (
                      <div className="space-y-2 border-t border-fox-border px-4 py-3 text-[13px]">
                        <p>
                          <span className="font-medium text-fox-green">Можно: </span>
                          {day.allowed.join(", ") || "—"}
                        </p>
                        <p>
                          <span className="font-medium text-fox-red">Нельзя: </span>
                          {day.forbidden.join(", ") || "—"}
                        </p>
                        {day.botMessage && (
                          <p className="text-fox-muted">{day.botMessage}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="fox-card space-y-3 px-4 py-4">
              <h3 className="text-[15px] font-semibold text-fox-text">Спросить бота</h3>
              <p className="text-[13px] text-fox-muted">
                Бот знает ваш план и ответит по неделе {selectedWeek}.
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => askBot(`Неделя ${selectedWeek}: ${q}`)}
                    className="rounded-full bg-fox-primary-soft px-3 py-1.5 text-[13px] font-medium text-fox-primary transition hover:bg-fox-primary/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <Link
                href={`/chat?week=${selectedWeek}`}
                className="fox-btn-primary block w-full text-center"
              >
                Открыть чат
              </Link>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
