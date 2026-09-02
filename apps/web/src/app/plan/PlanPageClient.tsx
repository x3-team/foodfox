"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { CompactDayDetails, CompactProductChips } from "@/components/CompactProductChips";
import { PhaseBanner, WeekSelector } from "@/components/WeekSelector";
import { PLAN_PROTOCOL } from "@/lib/plan-engine";

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
        subtitle="8 недель: 4 элиминация → 2 стабилизация → 2 расширение"
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
            <div className="fox-card space-y-2 px-4 py-3">
              <p className="text-[13px] font-semibold text-fox-text">Структура 8 недель</p>
              {PLAN_PROTOCOL.map((block) => (
                <div key={block.weeks} className="flex gap-2 text-[13px] leading-snug">
                  <span className="shrink-0 font-semibold text-fox-primary">Нед. {block.weeks}</span>
                  <span className="text-fox-text">
                    {block.phase} — {block.detail}
                  </span>
                </div>
              ))}
            </div>

            <div className="fox-card px-4 py-3">
              <p className="text-[13px] text-fox-muted">
                Старт: <span className="font-medium text-fox-text">{plan.startedAt}</span>
                {" · "}
                Сейчас неделя{" "}
                <span className="font-semibold text-fox-primary">{currentWeek}</span> из 8
                {currentWeek > 4 && (
                  <>
                    {" · "}
                    <span className="font-medium text-fox-text">{weekData?.phase}</span>
                  </>
                )}
              </p>
            </div>

            <WeekSelector
              weeks={plan.weeks.map((w) => ({
                weekNumber: w.weekNumber,
                phase: w.phase,
              }))}
              currentWeek={currentWeek}
              selectedWeek={selectedWeek}
              onSelect={setSelectedWeek}
            />

            <PhaseBanner
              currentWeek={currentWeek}
              selectedWeek={selectedWeek}
              phase={weekData?.phase ?? ""}
            />

            {summaryDay && (
              <div className="fox-card space-y-3 px-4 py-4">
                <h2 className="text-[16px] font-semibold text-fox-text">
                  Неделя {selectedWeek}: {weekData?.phase}
                </h2>
                <CompactProductChips
                  items={summaryDay.allowed}
                  tone="green"
                  label="Можно"
                  previewCount={8}
                />
                <CompactProductChips
                  items={summaryDay.forbidden}
                  tone="red"
                  label="Исключить"
                  previewCount={8}
                  collapsedByDefault={summaryDay.forbidden.length > 8}
                />
                {summaryDay.rotation.length > 0 && (
                  <CompactProductChips
                    items={summaryDay.rotation}
                    tone="yellow"
                    label="Ротация жёлтой зоны"
                    previewCount={4}
                  />
                )}
                {summaryDay.botMessage && (
                  <p className="line-clamp-3 rounded-xl bg-fox-primary-soft px-3 py-2.5 text-[13px] leading-relaxed text-fox-primary-dark">
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
                      <CompactDayDetails
                        allowed={day.allowed}
                        forbidden={day.forbidden}
                        rotation={day.rotation}
                        botMessage={day.botMessage}
                      />
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
