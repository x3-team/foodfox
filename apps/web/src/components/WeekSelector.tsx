"use client";

import { PLAN_WEEK_GROUPS, getWeekStatus } from "@/lib/plan-weeks";

interface WeekSelectorProps {
  currentWeek: number;
  selectedWeek: number;
  onSelect: (week: number) => void;
}

export function WeekSelector({ currentWeek, selectedWeek, onSelect }: WeekSelectorProps) {
  return (
    <div className="space-y-3">
      {PLAN_WEEK_GROUPS.map((group) => (
        <div key={group.phase} className="space-y-1.5">
          <p className="px-0.5 text-[12px] font-semibold uppercase tracking-wide text-fox-muted">
            {group.phase} · нед. {group.weeks[0]}–{group.weeks[group.weeks.length - 1]}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.weeks.map((weekNumber) => {
              const active = weekNumber === selectedWeek;
              const status = getWeekStatus(weekNumber, currentWeek);
              const isCurrent = status === "current";

              return (
                <button
                  key={weekNumber}
                  type="button"
                  onClick={() => onSelect(weekNumber)}
                  className={`min-w-[4.5rem] rounded-xl px-3 py-2 text-left transition ${
                    active
                      ? "bg-fox-primary text-white shadow-card"
                      : status === "past"
                        ? "bg-fox-surface/80 text-fox-muted ring-1 ring-fox-border"
                        : "bg-fox-surface text-fox-text ring-1 ring-fox-border"
                  } ${isCurrent && !active ? "ring-2 ring-fox-primary/50" : ""}`}
                >
                  <span className="block text-[13px] font-semibold">
                    {status === "past" && !active ? "✓ " : ""}
                    Нед. {weekNumber}
                    {isCurrent && !active && (
                      <span className="ml-1 text-[10px] text-fox-primary">•</span>
                    )}
                  </span>
                  <span
                    className={`block text-[11px] ${
                      active ? "text-white/85" : "text-fox-muted"
                    }`}
                  >
                    {isCurrent ? "сейчас" : status === "past" ? "пройдена" : "далее"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
        🎉 Элиминация завершена — началась <strong>стабилизация</strong> (нед. 5–6). Меню
        постепенно расширяется, красная зона по-прежнему исключена.
      </div>
    );
  }

  if (currentWeek === 7) {
    return (
      <div className="fox-card border border-fox-yellow/30 bg-amber-50 px-4 py-3 text-[14px] leading-relaxed text-fox-text">
        Финальная фаза — <strong>расширение</strong> (нед. 7–8). Жёлтая зона добавляется по
        ротации, бот подскажет что можно сегодня.
      </div>
    );
  }

  if (currentWeek === 8) {
    return (
      <div className="fox-card border border-fox-primary/20 bg-fox-primary-soft px-4 py-3 text-[14px] leading-relaxed text-fox-primary-dark">
        Последняя неделя плана. После неё можно обсудить с нутрициologом следующие шаги в чате.
      </div>
    );
  }

  if (currentWeek <= 4 && phase === "Элиминация") {
    return (
      <p className="px-0.5 text-[13px] text-fox-muted">
        Сейчас элиминация — нед. {currentWeek} из 4. Дальше автоматически откроются нед. 5–8 с
        новыми фазами в этих же плашках.
      </p>
    );
  }

  return null;
}
