import { PDFParse } from "pdf-parse";
import type { PoolClient } from "pg";
import { getDbPool } from "./db";
import { countZones, type ParsedResult, type Zone, type ZoneCounts } from "./fox-parser";
import { parseAndNormalize } from "./fox-parse-quality";
import { buildEightWeekPlan } from "./plan-engine";
import { readReportPdf } from "./report-storage";

/**
 * Admin moderation (apps/site /admin/app/reports): parse a stored PDF again
 * with the current parser, or rebuild the plan after a moderator corrected
 * values by hand. Called through the internal routes under /internal.
 */

const CONFIDENCE = { high: 0.95, medium: 0.8, low: 0.5 } as const;

export interface ReprocessResult {
  ok: boolean;
  error?: string;
  status?: string;
  parsed?: number;
  counts?: ZoneCounts;
  confidence?: number;
  warnings?: string[];
  planRebuilt?: boolean;
}

function requirePool() {
  const pool = getDbPool();
  if (!pool) throw new Error("DATABASE_URL is not set");
  return pool;
}

async function inTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await requirePool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function reprocessReport(reportId: string): Promise<ReprocessResult> {
  const pool = requirePool();
  const { rows } = await pool.query(`SELECT id, client_id FROM reports WHERE id = $1`, [reportId]);
  const report = rows[0] as { id: string; client_id: string } | undefined;
  if (!report) return { ok: false, error: "Отчёт не найден" };

  const pdf = await readReportPdf(report.client_id, report.id);
  if (!pdf) return { ok: false, error: "PDF этого отчёта не сохранён на сервере" };

  let text = "";
  try {
    const parser = new PDFParse({ data: pdf });
    text = (await parser.getText()).text ?? "";
    await parser.destroy();
  } catch {
    text = "";
  }
  const { results, quality } = parseAndNormalize(text);
  if (results.length < 5) {
    const error = text.trim().length < 50 ? "Из PDF не извлекается текст" : `Распознано только ${results.length} антигенов`;
    await pool.query(
      `UPDATE reports SET status = 'failed', updated_at = now(),
              metadata = metadata || jsonb_build_object('last_error', $2::text, 'reprocessed_at', now())
        WHERE id = $1`,
      [reportId, error],
    );
    return { ok: false, error, status: "failed", parsed: results.length };
  }

  const confidence = CONFIDENCE[quality.confidence];
  const status = quality.confidence === "low" ? "review" : "ready";
  const planRebuilt = await inTx(async (c) => {
    await c.query(`DELETE FROM test_results WHERE report_id = $1`, [reportId]);
    for (const r of results) await insertResult(c, reportId, r);
    await c.query(
      `UPDATE reports SET status = $2, parse_confidence = $3, updated_at = now(), reviewed_at = NULL,
              metadata = (metadata - 'last_error') || jsonb_build_object(
                'reprocessed_at', now(), 'parsed_count', $4::int, 'warnings', $5::jsonb, 'verified_in_pdf', $6::int)
        WHERE id = $1`,
      [reportId, status, confidence, results.length, JSON.stringify(quality.warnings), quality.verifiedInPdf],
    );
    return rebuildPlan(c, reportId, results);
  });
  return { ok: true, status, parsed: results.length, counts: countZones(results), confidence, warnings: quality.warnings, planRebuilt };
}

/** After a moderator edited values: the active plan built from this report follows the stored results. */
export async function rebuildPlanFromStored(reportId: string): Promise<ReprocessResult> {
  return inTx(async (c) => {
    const { rows } = await c.query(
      `SELECT f.fox_name, t.value_ug_ml, t.is_floor_value, t.zone
         FROM test_results t JOIN food_items f ON f.id = t.food_item_id WHERE t.report_id = $1`,
      [reportId],
    );
    const results: ParsedResult[] = rows.map((r) => ({
      foxName: r.fox_name,
      valueUgMl: r.value_ug_ml == null ? null : Number(r.value_ug_ml),
      isFloorValue: r.is_floor_value,
      zone: r.zone as Zone,
    }));
    if (!results.length) return { ok: false, error: "В отчёте нет результатов" };
    const planRebuilt = await rebuildPlan(c, reportId, results);
    return { ok: true, parsed: results.length, counts: countZones(results), planRebuilt };
  });
}

async function insertResult(c: PoolClient, reportId: string, r: ParsedResult) {
  let item = await c.query("SELECT id FROM food_items WHERE lower(fox_name) = lower($1) LIMIT 1", [r.foxName]);
  if (!item.rows[0]) item = await c.query("INSERT INTO food_items (fox_name) VALUES ($1) RETURNING id", [r.foxName]);
  await c.query(
    `INSERT INTO test_results (report_id, food_item_id, value_ug_ml, is_floor_value, zone)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (report_id, food_item_id) DO UPDATE SET value_ug_ml = EXCLUDED.value_ug_ml, zone = EXCLUDED.zone`,
    [reportId, item.rows[0].id, r.valueUgMl, r.isFloorValue, r.zone],
  );
}

/** Same days as the original plan (it keeps its start date), contents recomputed. False when no active plan uses the report. */
async function rebuildPlan(c: PoolClient, reportId: string, results: ParsedResult[]): Promise<boolean> {
  const { rows } = await c.query(
    `SELECT id, started_at FROM nutrition_plans WHERE report_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
    [reportId],
  );
  const plan = rows[0] as { id: string; started_at: Date } | undefined;
  if (!plan) return false;
  for (const day of buildEightWeekPlan(results, new Date(plan.started_at))) {
    await c.query(
      `INSERT INTO plan_days (plan_id, date, week_number, allowed, forbidden, rotation, bot_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plan_id, date) DO UPDATE SET week_number = EXCLUDED.week_number, allowed = EXCLUDED.allowed,
         forbidden = EXCLUDED.forbidden, rotation = EXCLUDED.rotation, bot_message = EXCLUDED.bot_message`,
      [plan.id, day.date, day.weekNumber, JSON.stringify(day.allowed), JSON.stringify(day.forbidden), JSON.stringify(day.rotation), day.botMessage],
    );
  }
  return true;
}
