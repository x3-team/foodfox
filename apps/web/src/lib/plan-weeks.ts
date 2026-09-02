import { getWeekPhase, PLAN_PROTOCOL } from "./plan-engine";

export const PLAN_WEEK_GROUPS = PLAN_PROTOCOL.map((block) => {
  const [start, end] = block.weeks.split("–").map((n) => parseInt(n, 10));
  const weeks: number[] = [];
  for (let w = start; w <= end; w++) weeks.push(w);
  return { phase: block.phase, weeks, detail: block.detail };
});

export type WeekStatus = "past" | "current" | "future";

export function getWeekStatus(weekNumber: number, currentWeek: number): WeekStatus {
  if (weekNumber < currentWeek) return "past";
  if (weekNumber === currentWeek) return "current";
  return "future";
}

export function getWeekPhaseFor(weekNumber: number): string {
  return getWeekPhase(weekNumber);
}
