import { getDbClient, runWithClientContext } from "./db-context";
import { ensureSchema, getDbPool, getFullPlan, getResultsForClient } from "./db";
import {
  DIARY_EDIT_WINDOW_DAYS,
  addDays,
  annotateFoods,
  diaryAad,
  isoDate,
  normalizePayload,
  type DiaryEntryDto,
  type DiaryInput,
  type DiaryPayload,
} from "./diary";
import { memoryDiary, memoryDiaryKey, type DiaryRow } from "./diary-memory";
import { assertHealthKey, decryptHealth, encryptHealth } from "./health-crypto";
import { getWeekPhase } from "./plan-engine";

/**
 * Symptom diary storage. Every query runs inside the client's RLS scope
 * (db-context.ts), and the health fields go in and out through
 * health-crypto.ts only. Nothing here logs entry content.
 */

async function scoped<T>(clientId: string, fn: () => Promise<T>): Promise<T> {
  const pool = getDbPool();
  if (!pool) return fn();
  return runWithClientContext(pool, clientId, fn);
}

function toDto(clientId: string, row: DiaryRow): DiaryEntryDto {
  const payload = normalizePayload(
    decryptHealth<Partial<DiaryPayload>>(row.payload, diaryAad(clientId, row.date)),
  );
  return {
    date: row.date,
    weekNumber: row.weekNumber,
    phase: row.weekNumber ? getWeekPhase(row.weekNumber) : null,
    updatedAt: row.updatedAt,
    ...payload,
  };
}

function mapDbRow(clientId: string, row: Record<string, unknown>): DiaryRow {
  return {
    clientId,
    date: isoDate(new Date(row.entry_date as string)),
    weekNumber: (row.week_number as number | null) ?? null,
    payload: row.payload as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export interface DiaryContext {
  today: string;
  hasPlan: boolean;
  weekNumber: number | null;
  phase: string | null;
  planStartedAt: string | null;
  /** Today's allowed foods from the plan, offered as quick picks for «Что ели». */
  foodSuggestions: string[];
  editWindowDays: number;
}

/** Plan week for each date, from the active plan. */
async function planWeeks(clientId: string) {
  const plan = await getFullPlan(clientId);
  const byDate = new Map<string, { weekNumber: number; allowed: string[] }>();
  for (const w of plan?.weeks ?? []) {
    for (const d of w.days) byDate.set(d.date, { weekNumber: w.weekNumber, allowed: d.allowed });
  }
  return { startedAt: plan?.startedAt ?? null, byDate };
}

export async function getDiary(
  clientId: string,
  days: number,
): Promise<{ context: DiaryContext; entries: DiaryEntryDto[] }> {
  assertHealthKey();
  await ensureSchema();
  const today = isoDate(new Date());
  const from = addDays(today, -days);
  const plan = await planWeeks(clientId);
  const todayPlan = plan.byDate.get(today);

  const rows = await scoped(clientId, async () => {
    const dbx = getDbClient();
    if (!dbx) {
      return Array.from(memoryDiary.values())
        .filter((r) => r.clientId === clientId && r.date >= from)
        .sort((a, b) => b.date.localeCompare(a.date));
    }
    const { rows } = await dbx.query(
      `SELECT entry_date::text AS entry_date, week_number, payload, created_at, updated_at
       FROM diary_entries
       WHERE client_id = $1 AND entry_date >= $2
       ORDER BY entry_date DESC`,
      [clientId, from],
    );
    return rows.map((r) => mapDbRow(clientId, r));
  });

  return {
    context: {
      today,
      hasPlan: plan.byDate.size > 0,
      weekNumber: todayPlan?.weekNumber ?? null,
      phase: todayPlan ? getWeekPhase(todayPlan.weekNumber) : null,
      planStartedAt: plan.startedAt,
      foodSuggestions: (todayPlan?.allowed ?? []).slice(0, 12),
      editWindowDays: DIARY_EDIT_WINDOW_DAYS,
    },
    entries: rows.map((r) => toDto(clientId, r)),
  };
}

export async function saveDiaryEntry(
  clientId: string,
  input: DiaryInput,
): Promise<DiaryEntryDto> {
  assertHealthKey();
  await ensureSchema();
  const [plan, results] = await Promise.all([
    planWeeks(clientId),
    input.foods.length ? getResultsForClient(clientId) : Promise.resolve([]),
  ]);
  const payload: DiaryPayload = {
    wellbeing: input.wellbeing,
    symptoms: input.symptoms,
    note: input.note,
    foods: annotateFoods(input.foods, results),
  };
  const sealed = encryptHealth(payload, diaryAad(clientId, input.date));
  const weekNumber = plan.byDate.get(input.date)?.weekNumber ?? null;

  const row = await scoped(clientId, async () => {
    const dbx = getDbClient();
    if (!dbx) {
      const key = memoryDiaryKey(clientId, input.date);
      const now = new Date().toISOString();
      const saved: DiaryRow = {
        clientId,
        date: input.date,
        weekNumber,
        payload: sealed,
        createdAt: memoryDiary.get(key)?.createdAt ?? now,
        updatedAt: now,
      };
      memoryDiary.set(key, saved);
      return saved;
    }
    const { rows } = await dbx.query(
      `INSERT INTO diary_entries (client_id, entry_date, week_number, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id, entry_date) DO UPDATE
         SET week_number = EXCLUDED.week_number,
             payload = EXCLUDED.payload,
             updated_at = now()
       RETURNING entry_date::text AS entry_date, week_number, payload, created_at, updated_at`,
      [clientId, input.date, weekNumber, sealed],
    );
    return mapDbRow(clientId, rows[0]);
  });

  return toDto(clientId, row);
}

export async function deleteDiaryEntry(clientId: string, date: string): Promise<boolean> {
  await ensureSchema();
  return scoped(clientId, async () => {
    const dbx = getDbClient();
    if (!dbx) return memoryDiary.delete(memoryDiaryKey(clientId, date));
    const { rowCount } = await dbx.query(
      `DELETE FROM diary_entries WHERE client_id = $1 AND entry_date = $2`,
      [clientId, date],
    );
    return (rowCount ?? 0) > 0;
  });
}
