import type { ParsedResult, Zone } from "./fox-parser";

export interface PlanDay {
  date: string;
  weekNumber: number;
  allowed: string[];
  forbidden: string[];
  rotation: string[];
  botMessage: string;
}

const WEEK_PHASES: Record<number, string> = {
  1: "Элиминация",
  2: "Элиминация",
  3: "Элиминация",
  4: "Элиминация",
  5: "Стабилизация",
  6: "Стабилизация",
  7: "Расширение",
  8: "Расширение",
};

/** Human-readable 8-week protocol (4 + 2 + 2). */
export const PLAN_PROTOCOL = [
  {
    weeks: "1–4",
    phase: "Элиминация",
    detail: "Строго убираем красную зону, питаемся из зелёной",
  },
  {
    weeks: "5–6",
    phase: "Стабилизация",
    detail: "Закрепляем режим, постепенно расширяем меню",
  },
  {
    weeks: "7–8",
    phase: "Расширение",
    detail: "Контролируемое добавление жёлтой зоны по ротации",
  },
] as const;

export function getWeekPhase(weekNumber: number): string {
  return WEEK_PHASES[weekNumber] ?? "План";
}

export function buildEightWeekPlan(
  results: ParsedResult[],
  startDate: Date = new Date(),
): PlanDay[] {
  const green = results.filter((r) => r.zone === "green").map((r) => r.foxName);
  const yellow = results.filter((r) => r.zone === "yellow").map((r) => r.foxName);
  const red = results.filter((r) => r.zone === "red").map((r) => r.foxName);

  const days: PlanDay[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  for (let d = 0; d < 56; d++) {
    const weekNumber = Math.floor(d / 7) + 1;
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);

    const rotationIndex = Math.floor(d / 4) % Math.max(yellow.length, 1);
    const todayYellow =
      yellow.length > 0 ? [yellow[rotationIndex % yellow.length]] : [];

    let allowed: string[];
    let forbidden: string[];

    if (weekNumber <= 4) {
      allowed = [...green.slice(0, 8), ...todayYellow];
      forbidden = red;
    } else if (weekNumber <= 6) {
      allowed = [...green.slice(0, 12), ...todayYellow];
      forbidden = red.slice(0, Math.max(1, Math.floor(red.length * 0.8)));
    } else {
      allowed = [...green, ...todayYellow];
      forbidden = red.slice(0, Math.max(1, Math.floor(red.length * 0.5)));
    }

    const phase = getWeekPhase(weekNumber);
    const botMessage =
      `Неделя ${weekNumber} · ${phase}. ` +
      `Сегодня можно: ${allowed.slice(0, 5).join(", ") || "см. план"}. ` +
      `Исключите: ${forbidden.slice(0, 5).join(", ") || "красную зону"}.`;

    days.push({
      date: dateStr,
      weekNumber,
      allowed: Array.from(new Set(allowed)),
      forbidden: Array.from(new Set(forbidden)),
      rotation: todayYellow,
      botMessage,
    });
  }

  return days;
}

export function getTodayPlan(days: PlanDay[]): PlanDay | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return days.find((d) => d.date === today);
}

export function formatValue(value: number | null, isFloor: boolean): string {
  if (isFloor || value === null) return "<10 µg/ml";
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} µg/ml`;
}

export function zoneEmoji(zone: Zone): string {
  if (zone === "green") return "🟢";
  if (zone === "yellow") return "🟡";
  return "🔴";
}
