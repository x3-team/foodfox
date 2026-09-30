"use client";

import { useEffect, useRef } from "react";
import { getWeekStatus } from "@/lib/plan-weeks";
import { getWeekPhase } from "@/lib/plan-engine";

export interface PlanWeekTab {
  weekNumber: number;
  phase: string;
}

interface WeekSelectorProps {
  weeks: PlanWeekTab[];
  currentWeek: number;
  selectedWeek: number;
  onSelect: (week: number) => void;
}

/** Horizontal week pills: ~4 visible + peek of the 5th (scroll for 6–8). */
export function WeekSelector({ weeks, currentWeek, selectedWeek, onSelect }: WeekSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-week="${selectedWeek}"]`);
    active?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedWeek]);

  return (
    <div className="relative -mx-1">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 pl-0.5 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {weeks.map((w) => {
          const active = w.weekNumber === selectedWeek;
          const isCurrent = w.weekNumber === currentWeek;
          const status = getWeekStatus(w.weekNumber, currentWeek);
          const phase = w.phase || getWeekPhase(w.weekNumber);

          return (
            <button
              key={w.weekNumber}
              type="button"
              data-week={w.weekNumber}
              onClick={() => onSelect(w.weekNumber)}
              className={`shrink-0 snap-start rounded-xl px-3 py-2.5 text-left transition [flex:0_0_calc((100%-1.5rem)/4.15)] ${
                active
                  ? "bg-fox-primary text-white shadow-card"
                  : "bg-fox-surface text-fox-text ring-1 ring-fox-border"
              } ${isCurrent && !active ? "ring-2 ring-fox-primary/45" : ""}`}
            >
              <span className="block text-[13px] font-semibold">
                {status === "past" && !active ? "✓ " : ""}
                Нед. {w.weekNumber}
              </span>
              <span
                className={`block text-[11px] leading-tight ${active ? "text-white/85" : "text-fox-muted"}`}
              >
                {phase}
              </span>
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-fox-bg via-fox-bg/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}

interface PhaseBannerProps {
  currentWeek: number;
  selectedWeek: number;
  phase: string;
}

export function PhaseBanner({ currentWeek, selectedWeek, phase }: PhaseBannerProps) {
  if (selectedWeek !== currentWeek) return null;

  if (currentWeek === 5) {
    return (
      <div className="fox-card border border-fox-primary/20 bg-fox-primary-soft px-4 py-3 text-[14px] leading-relaxed text-fox-primary-dark">
        🎉 Элиминация завершена — началась <strong>стабилизация</strong> (нед. 5–6).
      </div>
    );
  }

  if (currentWeek === 7) {
    return (
      <div className="fox-card border border-fox-yellow/30 bg-amber-50 px-4 py-3 text-[14px] leading-relaxed text-fox-text">
        Финальная фаза — <strong>расширение</strong> (нед. 7–8).
      </div>
    );
  }

  if (currentWeek === 8) {
    return (
      <div className="fox-card border border-fox-primary/20 bg-fox-primary-soft px-4 py-3 text-[14px] leading-relaxed text-fox-primary-dark">
        Последняя неделя плана.
      </div>
    );
  }

  if (currentWeek <= 4 && phase === "Элиминация") {
    return (
      <p className="px-0.5 text-[13px] text-fox-muted">
        Листайте плашки вправо — всего 8 недель (→ стабилизация и расширение).
      </p>
    );
  }

  return null;
}
