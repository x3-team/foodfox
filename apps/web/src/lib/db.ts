import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { type ParsedResult, type Zone } from "./fox-parser";
import {
  parseAndNormalize,
  type ParseQualityReport,
} from "./fox-parse-quality";
import type { PlanDay } from "./plan-engine";
import { buildEightWeekPlan, getWeekPhase } from "./plan-engine";
import { hashPassword, verifyPassword, type SessionData } from "./auth";
import { analyzeRecipe } from "./recipe-match";
import { saveReportPdf } from "./report-storage";
import {
  RECIPES_CATALOG,
  getCatalogRecipesForMemory,
  type RecipeStep,
} from "./recipes-catalog";

export interface TestResultRow {
  id: string;
  foxName: string;
  valueUgMl: number | null;
  isFloorValue: boolean;
  zone: Zone;
}

export interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  lead?: string | null;
  steps: RecipeStep[];
  tags: string[];
  photoUrl?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  tips?: string[];
  ingredientsList?: { name: string; amount: string }[];
  suitable?: boolean;
  allGreen?: boolean;
  warnings?: string[];
  ingredients?: { name: string; zone: string }[];
}

function parseRecipeSteps(raw: unknown): RecipeStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((body, i) => ({
      title: `Шаг ${i + 1}`,
      body,
    }));
  }
  return raw as RecipeStep[];
}

function mapRecipeRow(row: {
  id: string;
  title: string;
  description: string | null;
  steps: unknown;
  tags: unknown;
  photo_url?: string | null;
  lead?: string | null;
  prep_time?: string | null;
  cook_time?: string | null;
  servings?: number | null;
  tips?: unknown;
  ingredients_list?: unknown;
}): RecipeRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lead: row.lead ?? null,
    steps: parseRecipeSteps(row.steps),
    tags: (row.tags as string[]) ?? [],
    photoUrl: row.photo_url ?? null,
    prepTime: row.prep_time ?? null,
    cookTime: row.cook_time ?? null,
    servings: row.servings ?? null,
    tips: (row.tips as string[]) ?? [],
    ingredientsList: (row.ingredients_list as { name: string; amount: string }[]) ?? [],
  };
}

export interface ChatMessageRow {
  id: string;
  role: "user" | "assistant" | "system";
  messageType: "chat" | "daily_reminder" | "plan_update" | "system";
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface MemoryStore {
  clientId: string;
  reportId: string;
  planId: string;
  threadId: string;
  results: TestResultRow[];
  planDays: PlanDay[];
  messages: ChatMessageRow[];
  recipes: RecipeRow[];
}

let pool: Pool | null = null;
let memory: MemoryStore | null = null;
let schemaReady = false;

function shouldUseDbSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return !/localhost|127\.0\.0\.1/.test(connectionString);
}

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      ssl: shouldUseDbSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const p = getPool();
  if (!p) {
    seedMemoryIfNeeded();
    schemaReady = true;
    return;
  }
  const schemaPath = join(process.cwd(), "../../packages/database/schema.sql");
  try {
    const sql = readFileSync(schemaPath, "utf-8");
    await p.query(sql);
  } catch {
    // schema may already exist
  }
  await seedPostgresIfEmpty(p);
  await syncRecipesCatalog(p);
  schemaReady = true;
}

async function syncRecipesCatalog(p: Pool) {
  await p.query(`
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS lead TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time TEXT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INT;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tips JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients_list JSONB NOT NULL DEFAULT '[]';
    CREATE UNIQUE INDEX IF NOT EXISTS recipes_title_unique ON recipes (title);
  `);

  for (const entry of RECIPES_CATALOG) {
    await p.query(
      `INSERT INTO recipes (
         title, description, lead, steps, tags, photo_url,
         prep_time, cook_time, servings, tips, ingredients_list, published
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10::jsonb, $11::jsonb, true)
       ON CONFLICT (title) DO UPDATE SET
         description = EXCLUDED.description,
         lead = EXCLUDED.lead,
         steps = EXCLUDED.steps,
         tags = EXCLUDED.tags,
         photo_url = EXCLUDED.photo_url,
         prep_time = EXCLUDED.prep_time,
         cook_time = EXCLUDED.cook_time,
         servings = EXCLUDED.servings,
         tips = EXCLUDED.tips,
         ingredients_list = EXCLUDED.ingredients_list,
         updated_at = now()`,
      [
        entry.title,
        entry.description,
        entry.lead,
        JSON.stringify(entry.steps),
        JSON.stringify(entry.tags),
        entry.photoUrl,
        entry.prepTime,
        entry.cookTime,
        entry.servings,
        JSON.stringify(entry.tips),
        JSON.stringify(entry.ingredients),
      ],
    );
  }
}

function seedMemoryIfNeeded() {
  if (memory) return;
  memory = {
    clientId: "demo-client",
    reportId: "",
    planId: "",
    threadId: "demo-thread",
    results: [],
    planDays: [],
    messages: [
      {
        id: "welcome",
        role: "assistant",
        messageType: "chat",
        content:
          "Здравствуйте! Загрузите PDF-отчёт FOX на вкладке «Отчёт» — после разбора смогу ответить по вашим зонам и плану питания.",
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    recipes: getCatalogRecipesForMemory(),
  };
}

function loadFoxCatalogNames(): string[] {
  const catalogPath = join(process.cwd(), "../../packages/database/seeds/fox-catalog-ru.json");
  const data = JSON.parse(readFileSync(catalogPath, "utf-8")) as { names: string[] };
  return data.names;
}

async function seedPostgresIfEmpty(p: Pool) {
  const { rows } = await p.query("SELECT COUNT(*)::int AS c FROM food_items");
  if (rows[0].c > 0) return;

  await p.query(`
    INSERT INTO food_categories (slug, name_ru, sort_order) VALUES
      ('fox', 'FOX антигены', 1)
    ON CONFLICT DO NOTHING
  `);

  const catalogNames = loadFoxCatalogNames();
  for (const name of catalogNames) {
    await p.query(
      `INSERT INTO food_items (category_id, fox_name)
       SELECT fc.id, $1 FROM food_categories fc
       WHERE fc.slug = 'fox'
         AND NOT EXISTS (SELECT 1 FROM food_items fi WHERE lower(fi.fox_name) = lower($1))`,
      [name],
    );
  }

  await p.query(`
    INSERT INTO recipes (title, description, steps, tags, published) VALUES
    ('Салат с индейкой и брокколи', 'placeholder', '[]'::jsonb, '[]'::jsonb, true),
    ('Гречка с кабачком', 'placeholder', '[]'::jsonb, '[]'::jsonb, true),
    ('Запечённая куриная грудка', 'placeholder', '[]'::jsonb, '[]'::jsonb, true)
    ON CONFLICT DO NOTHING
  `);
}

export async function getOrCreateDemoClient(): Promise<string> {
  await ensureSchema();
  const p = getPool();
  if (!p) return memory!.clientId;

  const existing = await p.query(
    "SELECT c.id FROM clients c JOIN users u ON u.id = c.user_id WHERE u.email = $1 LIMIT 1",
    ["demo@foodfox.local"],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const user = await p.query(
    `INSERT INTO users (email, role) VALUES ($1, 'client') RETURNING id`,
    ["demo@foodfox.local"],
  );
  const client = await p.query(
    `INSERT INTO clients (user_id, display_name) VALUES ($1, $2) RETURNING id`,
    [user.rows[0].id, "Демо клиент"],
  );
  return client.rows[0].id;
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<SessionData> {
  await ensureSchema();
  const p = getPool();
  if (!p) throw new Error("Database required for registration");

  const normalized = email.trim().toLowerCase();
  const existing = await p.query("SELECT id FROM users WHERE email = $1", [normalized]);
  if (existing.rows[0]) throw new Error("Email уже зарегистрирован");

  const user = await p.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'client') RETURNING id`,
    [normalized, hashPassword(password)],
  );
  const client = await p.query(
    `INSERT INTO clients (user_id, display_name) VALUES ($1, $2) RETURNING id`,
    [user.rows[0].id, displayName.trim() || "Клиент"],
  );
  const clientId = client.rows[0].id;

  await ensureChatThread(p, clientId, null);
  await seedWelcomeMessage(p, clientId);

  return {
    userId: user.rows[0].id,
    clientId,
    email: normalized,
    displayName: displayName.trim() || "Клиент",
  };
}

async function ensureChatThread(
  p: Pool,
  clientId: string,
  planId: string | null,
): Promise<string> {
  const { rows } = await p.query(
    `INSERT INTO chat_threads (client_id, plan_id) VALUES ($1, $2)
     ON CONFLICT (client_id) DO UPDATE SET
       plan_id = COALESCE(EXCLUDED.plan_id, chat_threads.plan_id)
     RETURNING id`,
    [clientId, planId],
  );
  return rows[0].id as string;
}

async function seedWelcomeMessage(p: Pool, clientId: string): Promise<void> {
  const { rows } = await p.query(
    `SELECT cm.id FROM chat_messages cm
     JOIN chat_threads ct ON ct.id = cm.thread_id
     WHERE ct.client_id = $1 LIMIT 1`,
    [clientId],
  );
  if (rows[0]) return;

  const threadId = await ensureChatThread(p, clientId, null);
  await p.query(
    `INSERT INTO chat_messages (thread_id, role, message_type, content, read_at)
     VALUES ($1, 'assistant', 'chat', $2, now())`,
    [
      threadId,
      "Здравствуйте! Загрузите PDF-отчёт FOX на вкладке «Отчёт» — после разбора создам 8-недельный план и смогу ответить по вашим зонам IgG.",
    ],
  );
}

export async function loginUser(
  email: string,
  password: string,
): Promise<SessionData | null> {
  await ensureSchema();
  const p = getPool();
  if (!p) return null;

  const normalized = email.trim().toLowerCase();
  const { rows } = await p.query(
    `SELECT u.id, u.password_hash, c.id AS client_id, c.display_name
     FROM users u
     JOIN clients c ON c.user_id = u.id
     WHERE u.email = $1 LIMIT 1`,
    [normalized],
  );
  const row = rows[0];
  if (!row?.password_hash || !verifyPassword(password, row.password_hash)) return null;

  return {
    userId: row.id,
    clientId: row.client_id,
    email: normalized,
    displayName: row.display_name ?? "Клиент",
  };
}

/** Latest active plan's report, or the most recent upload if no active plan. */
async function resolveActiveReportId(p: Pool, clientId: string): Promise<string | null> {
  const { rows } = await p.query(
    `SELECT COALESCE(
       (SELECT np.report_id FROM nutrition_plans np
        WHERE np.client_id = $1 AND np.status = 'active'
        ORDER BY np.created_at DESC LIMIT 1),
       (SELECT r.id FROM reports r
        WHERE r.client_id = $1
        ORDER BY r.created_at DESC LIMIT 1)
     ) AS report_id`,
    [clientId],
  );
  return (rows[0]?.report_id as string | undefined) ?? null;
}

export async function getClientProfile(clientId: string) {
  await ensureSchema();
  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);

  if (!p) {
    return {
      email: "demo@local",
      displayName: "Демо",
      hasReport: memory!.results.length > 0,
      parsedCount: memory!.results.length,
      planStartedAt: memory!.planDays[0]?.date ?? null,
      currentWeek: memory!.planDays.find((d) => d.date === today)?.weekNumber ?? 1,
      hasPdf: false,
      reportId: memory!.reportId || null,
    };
  }

  const { rows } = await p.query(
    `SELECT u.email, c.display_name,
            (SELECT COUNT(*)::int FROM test_results tr
             WHERE tr.report_id = COALESCE(
               (SELECT np.report_id FROM nutrition_plans np
                WHERE np.client_id = c.id AND np.status = 'active'
                ORDER BY np.created_at DESC LIMIT 1),
               (SELECT r.id FROM reports r
                WHERE r.client_id = c.id
                ORDER BY r.created_at DESC LIMIT 1)
             )) AS parsed_count,
            np.started_at,
            (SELECT pd.week_number FROM plan_days pd
             JOIN nutrition_plans np2 ON np2.id = pd.plan_id
             WHERE np2.client_id = c.id AND np2.status = 'active' AND pd.date = $2 LIMIT 1) AS current_week,
            (SELECT r.storage_key FROM reports r WHERE r.client_id = c.id
             ORDER BY r.created_at DESC LIMIT 1) AS storage_key,
            (SELECT r.id FROM reports r WHERE r.client_id = c.id
             ORDER BY r.created_at DESC LIMIT 1) AS report_id
     FROM clients c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN nutrition_plans np ON np.client_id = c.id AND np.status = 'active'
     WHERE c.id = $1`,
    [clientId, today],
  );
  const row = rows[0];
  if (!row) throw new Error("Client not found");

  return {
    email: row.email,
    displayName: row.display_name ?? "Клиент",
    hasReport: (row.parsed_count as number) > 0,
    parsedCount: row.parsed_count as number,
    planStartedAt: row.started_at
      ? new Date(row.started_at).toISOString().slice(0, 10)
      : null,
    currentWeek: (row.current_week as number) ?? 1,
    hasPdf: Boolean(row.storage_key),
    reportId: row.report_id as string | null,
  };
}

export async function getFullPlan(clientId: string) {
  await ensureSchema();
  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);

  if (!p) {
    if (!memory!.planDays.length) return null;
    const weeks = new Map<number, PlanDay[]>();
    for (const d of memory!.planDays) {
      weeks.set(d.weekNumber, [...(weeks.get(d.weekNumber) ?? []), d]);
    }
    return {
      planId: memory!.planId,
      startedAt: memory!.planDays[0]?.date ?? null,
      weeks: Array.from(weeks.entries())
        .sort(([a], [b]) => a - b)
        .map(([weekNumber, days]) => ({
          weekNumber,
          phase: getWeekPhase(weekNumber),
          days: days.map((d) => ({
            ...d,
            isToday: d.date === today,
          })),
        })),
    };
  }

  const plan = await p.query(
    `SELECT id, started_at FROM nutrition_plans
     WHERE client_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [clientId],
  );
  if (!plan.rows[0]) return null;

  const planId = plan.rows[0].id;
  const { rows } = await p.query(
    `SELECT date, week_number, allowed, forbidden, rotation, bot_message
     FROM plan_days WHERE plan_id = $1 ORDER BY date`,
    [planId],
  );

  const weeks = new Map<number, PlanDayDto[]>();
  for (const row of rows) {
    const wn = row.week_number as number;
    const day: PlanDayDto = {
      date: new Date(row.date).toISOString().slice(0, 10),
      weekNumber: wn,
      allowed: row.allowed ?? [],
      forbidden: row.forbidden ?? [],
      rotation: row.rotation ?? [],
      botMessage: row.bot_message ?? "",
      isToday: new Date(row.date).toISOString().slice(0, 10) === today,
    };
    weeks.set(wn, [...(weeks.get(wn) ?? []), day]);
  }

  return {
    planId,
    startedAt: new Date(plan.rows[0].started_at).toISOString().slice(0, 10),
    weeks: Array.from(weeks.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, days]) => ({
        weekNumber,
        phase: getWeekPhase(weekNumber),
        days,
      })),
  };
}

/** Lightweight plan header + week tabs (no day payloads). */
export async function getPlanOverview(clientId: string) {
  await ensureSchema();
  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);

  if (!p) {
    if (!memory!.planDays.length) return null;
    const currentWeek =
      memory!.planDays.find((d) => d.date === today)?.weekNumber ?? 1;
    return {
      planId: memory!.planId,
      startedAt: memory!.planDays[0]?.date ?? null,
      currentWeek,
      hasReport: memory!.results.length > 0,
      weekTabs: Array.from({ length: 8 }, (_, i) => ({
        weekNumber: i + 1,
        phase: getWeekPhase(i + 1),
      })),
    };
  }

  const plan = await p.query(
    `SELECT np.id, np.started_at,
            (SELECT pd.week_number FROM plan_days pd
             WHERE pd.plan_id = np.id AND pd.date = $2 LIMIT 1) AS current_week
     FROM nutrition_plans np
     WHERE np.client_id = $1 AND np.status = 'active'
     ORDER BY np.created_at DESC LIMIT 1`,
    [clientId, today],
  );
  if (!plan.rows[0]) return null;

  const reportId = await resolveActiveReportId(p, clientId);
  return {
    planId: plan.rows[0].id as string,
    startedAt: new Date(plan.rows[0].started_at).toISOString().slice(0, 10),
    currentWeek: (plan.rows[0].current_week as number) ?? 1,
    hasReport: Boolean(reportId),
    weekTabs: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      phase: getWeekPhase(i + 1),
    })),
  };
}

/** One plan week — ~4 KB instead of full 56-day payload. */
export async function getPlanWeek(clientId: string, weekNumber: number) {
  await ensureSchema();
  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);
  const wn = Math.min(8, Math.max(1, weekNumber));

  if (!p) {
    const days = memory!.planDays.filter((d) => d.weekNumber === wn);
    if (!days.length) return null;
    return {
      weekNumber: wn,
      phase: getWeekPhase(wn),
      days: days.map((d) => ({
        ...d,
        isToday: d.date === today,
      })),
    };
  }

  const plan = await p.query(
    `SELECT id FROM nutrition_plans
     WHERE client_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [clientId],
  );
  if (!plan.rows[0]) return null;

  const { rows } = await p.query(
    `SELECT date, week_number, allowed, forbidden, rotation, bot_message
     FROM plan_days WHERE plan_id = $1 AND week_number = $2 ORDER BY date`,
    [plan.rows[0].id, wn],
  );
  if (!rows.length) return null;

  return {
    weekNumber: wn,
    phase: getWeekPhase(wn),
    days: rows.map((row) => ({
      date: new Date(row.date).toISOString().slice(0, 10),
      weekNumber: row.week_number as number,
      allowed: row.allowed ?? [],
      forbidden: row.forbidden ?? [],
      rotation: row.rotation ?? [],
      botMessage: row.bot_message ?? "",
      isToday: new Date(row.date).toISOString().slice(0, 10) === today,
    })),
  };
}

export interface PlanDayDto {
  date: string;
  weekNumber: number;
  allowed: string[];
  forbidden: string[];
  rotation: string[];
  botMessage: string;
  isToday: boolean;
}

export async function saveReportFromPdf(
  clientId: string,
  pdfText: string,
  pdfBuffer?: Buffer,
): Promise<{
  reportId: string;
  results: TestResultRow[];
  planId: string;
  parseQuality: ParseQualityReport;
}> {
  await ensureSchema();
  const { results: parsed, quality } = parseAndNormalize(pdfText);
  if (parsed.length < 5) {
    const hint =
      pdfText.trim().length < 50
        ? "Не удалось извлечь текст из PDF. Убедитесь, что это отчёт FOX Food Xplorer."
        : `Распознано только ${parsed.length} антигенов из ~286. Проверьте, что PDF не повреждён.`;
    throw new Error(hint);
  }
  const saved = await saveReportFromParsed(clientId, parsed, pdfBuffer);
  return { ...saved, parseQuality: quality };
}

export async function loadDemoReport(
  clientId: string,
): Promise<{ reportId: string; results: TestResultRow[]; planId: string }> {
  await ensureSchema();
  const seedPath = join(process.cwd(), "../../packages/database/seeds/fox-demo-report.json");
  const raw = JSON.parse(readFileSync(seedPath, "utf-8")) as ParsedResult[];
  const parsed = raw.filter(
    (r) => r.foxName && r.zone && !/зеленый \/ красный/i.test(r.foxName),
  );
  if (parsed.length < 50) {
    throw new Error("Демо-отчёт недоступен");
  }
  return saveReportFromParsed(clientId, parsed);
}

export async function saveReportFromParsed(
  clientId: string,
  parsed: ParsedResult[],
  pdfBuffer?: Buffer,
): Promise<{ reportId: string; results: TestResultRow[]; planId: string }> {
  if (parsed.length < 5) {
    throw new Error(`Недостаточно данных отчёта (${parsed.length} антигенов)`);
  }

  const p = getPool();
  if (!p) {
    memory!.results = parsed.map((r, i) => ({
      id: `r-${i}`,
      foxName: r.foxName,
      valueUgMl: r.valueUgMl,
      isFloorValue: r.isFloorValue,
      zone: r.zone,
    }));
    memory!.planDays = buildEightWeekPlan(parsed);
    return {
      reportId: memory!.reportId,
      results: memory!.results,
      planId: memory!.planId,
    };
  }

  const report = await p.query(
    `INSERT INTO reports (client_id, status, parse_confidence)
     VALUES ($1, 'ready', $2) RETURNING id`,
    [clientId, parsed.length >= 50 ? 0.9 : 0.6],
  );
  const reportId = report.rows[0].id;

  if (pdfBuffer && pdfBuffer.length > 0) {
    const storageKey = await saveReportPdf(clientId, reportId, pdfBuffer);
    await p.query(`UPDATE reports SET storage_key = $1 WHERE id = $2`, [storageKey, reportId]);
  }

  for (const r of parsed) {
    let foodItem = await p.query(
      "SELECT id FROM food_items WHERE lower(fox_name) = lower($1) LIMIT 1",
      [r.foxName],
    );
    if (!foodItem.rows[0]) {
      foodItem = await p.query(
        "INSERT INTO food_items (fox_name) VALUES ($1) RETURNING id",
        [r.foxName],
      );
    }
    await p.query(
      `INSERT INTO test_results (report_id, food_item_id, value_ug_ml, is_floor_value, zone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (report_id, food_item_id) DO UPDATE SET
         value_ug_ml = EXCLUDED.value_ug_ml,
         zone = EXCLUDED.zone`,
      [reportId, foodItem.rows[0].id, r.valueUgMl, r.isFloorValue, r.zone],
    );
  }

  const plan = await p.query(
    `UPDATE nutrition_plans SET status = 'completed'
     WHERE client_id = $1 AND status = 'active'`,
    [clientId],
  );
  void plan;

  const newPlan = await p.query(
    `INSERT INTO nutrition_plans (client_id, report_id, started_at, status)
     VALUES ($1, $2, CURRENT_DATE, 'active') RETURNING id`,
    [clientId, reportId],
  );
  const planId = newPlan.rows[0].id;
  const planDays = buildEightWeekPlan(parsed);

  for (const day of planDays) {
    await p.query(
      `INSERT INTO plan_days (plan_id, date, week_number, allowed, forbidden, rotation, bot_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (plan_id, date) DO NOTHING`,
      [
        planId,
        day.date,
        day.weekNumber,
        JSON.stringify(day.allowed),
        JSON.stringify(day.forbidden),
        JSON.stringify(day.rotation),
        day.botMessage,
      ],
    );
  }

  const threadId = await ensureChatThread(p, clientId, planId);
  const greenCount = parsed.filter((r) => r.zone === "green").length;
  const redCount = parsed.filter((r) => r.zone === "red").length;
  await p.query(
    `INSERT INTO chat_messages (thread_id, role, message_type, content)
     VALUES ($1, 'assistant', 'plan_update', $2)`,
    [
      threadId,
      `✅ Отчёт FOX разобран: ${parsed.length} антигенов (🟢 ${greenCount}, 🔴 ${redCount}). ` +
        `Создан 8-недельный план на 56 дней. Неделя 1 — элиминация. ` +
        `Откройте вкладку «План» или спросите меня про продукты и недели.`,
    ],
  );

  const results = await getResultsForClient(clientId);
  return { reportId, results, planId };
}

export async function getResultsForClient(clientId: string): Promise<TestResultRow[]> {
  await ensureSchema();
  const p = getPool();
  if (!p) {
    return memory!.results;
  }

  const reportId = await resolveActiveReportId(p, clientId);
  if (!reportId) return [];

  const { rows } = await p.query(
    `SELECT tr.id, fi.fox_name, tr.value_ug_ml, tr.is_floor_value, tr.zone
     FROM test_results tr
     JOIN food_items fi ON fi.id = tr.food_item_id
     WHERE tr.report_id = $1
     ORDER BY tr.zone, fi.fox_name`,
    [reportId],
  );
  return rows.map((row) => ({
    id: row.id,
    foxName: row.fox_name,
    valueUgMl: row.value_ug_ml ? parseFloat(row.value_ug_ml) : null,
    isFloorValue: row.is_floor_value,
    zone: row.zone,
  }));
}

export async function getRecipesForClient(
  clientId: string,
  preloadedResults?: TestResultRow[],
): Promise<RecipeRow[]> {
  await ensureSchema();
  const recipes = await getRecipes();
  const results = preloadedResults ?? (await getResultsForClient(clientId));

  if (results.length === 0) {
    return recipes.map((r) => ({ ...r, suitable: true, allGreen: true, warnings: [] }));
  }

  const zones = {
    green: results.filter((r) => r.zone === "green").map((r) => r.foxName),
    yellow: results.filter((r) => r.zone === "yellow").map((r) => r.foxName),
    red: results.filter((r) => r.zone === "red").map((r) => r.foxName),
  };

  const scored = recipes.map((recipe) => {
    const match = analyzeRecipe(recipe.title, zones);
    return {
      ...recipe,
      suitable: match.suitable,
      allGreen: match.allGreen,
      warnings: match.warnings,
      ingredients: match.ingredients.map((i) => ({ name: i.name, zone: i.zone })),
    };
  });

  return scored.sort((a, b) => {
    if (a.suitable !== b.suitable) return a.suitable ? -1 : 1;
    if (a.allGreen !== b.allGreen) return a.allGreen ? -1 : 1;
    return a.title.localeCompare(b.title, "ru");
  });
}

/** Recipes page: one results fetch, light week lookup. */
export async function getRecipesPageData(clientId: string) {
  await ensureSchema();
  const p = getPool();
  const results = await getResultsForClient(clientId);
  const recipes = await getRecipesForClient(clientId, results);

  let weekNumber = 1;
  if (p) {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await p.query(
      `SELECT pd.week_number FROM plan_days pd
       JOIN nutrition_plans np ON np.id = pd.plan_id
       WHERE np.client_id = $1 AND np.status = 'active' AND pd.date = $2
       LIMIT 1`,
      [clientId, today],
    );
    weekNumber = (rows[0]?.week_number as number) ?? 1;
  } else if (memory!.planDays.length) {
    const today = new Date().toISOString().slice(0, 10);
    weekNumber =
      memory!.planDays.find((d) => d.date === today)?.weekNumber ?? 1;
  }

  return {
    recipes,
    weekNumber,
    suitableCount: recipes.filter((r) => r.suitable).length,
    totalCount: recipes.length,
  };
}

export async function getChatHistory(
  clientId: string,
  limit = 12,
): Promise<ChatMessageRow[]> {
  await ensureSchema();
  const p = getPool();
  if (!p) {
    return memory!.messages
      .filter((m) => m.messageType === "chat")
      .slice(-limit);
  }

  const { rows } = await p.query(
    `SELECT cm.id, cm.role, cm.message_type, cm.content, cm.read_at, cm.created_at
     FROM chat_messages cm
     JOIN chat_threads ct ON ct.id = cm.thread_id
     WHERE ct.client_id = $1 AND cm.message_type = 'chat'
     ORDER BY cm.created_at DESC
     LIMIT $2`,
    [clientId, limit],
  );
  return rows.reverse().map((row) => ({
    id: row.id,
    role: row.role,
    messageType: row.message_type,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function getLatestReportId(clientId: string): Promise<string | null> {
  await ensureSchema();
  const p = getPool();
  if (!p) return memory!.reportId || null;
  const { rows } = await p.query(
    `SELECT id FROM reports WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [clientId],
  );
  return rows[0]?.id ?? null;
}

export async function getRecipes(): Promise<RecipeRow[]> {
  await ensureSchema();
  const p = getPool();
  if (!p) return memory!.recipes;

  const { rows } = await p.query(
    `SELECT id, title, description, lead, steps, tags, photo_url,
            prep_time, cook_time, servings, tips, ingredients_list
     FROM recipes WHERE published = true ORDER BY title`,
  );
  return rows.map((row) => mapRecipeRow(row));
}

export async function getActivePlanContext(clientId: string) {
  await ensureSchema();
  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);

  if (!p) {
    const todayPlan =
      memory!.planDays.find((d) => d.date === today) ?? memory!.planDays[0];
    const results = memory!.results;
    return {
      weekNumber: todayPlan?.weekNumber ?? 1,
      todayPlan,
      green: results.filter((r) => r.zone === "green").map((r) => r.foxName),
      yellow: results.filter((r) => r.zone === "yellow").map((r) => r.foxName),
      red: results.filter((r) => r.zone === "red").map((r) => r.foxName),
      planId: memory!.planId,
      threadId: memory!.threadId,
    };
  }

  const plan = await p.query(
    `SELECT np.id FROM nutrition_plans np
     WHERE np.client_id = $1 AND np.status = 'active'
     ORDER BY np.created_at DESC LIMIT 1`,
    [clientId],
  );
  if (!plan.rows[0]) return null;

  const planId = plan.rows[0].id;
  const day = await p.query(
    `SELECT week_number, allowed, forbidden, bot_message FROM plan_days
     WHERE plan_id = $1 AND date = $2`,
    [planId, today],
  );

  const results = await getResultsForClient(clientId);
  let threadId: string;
  const thread = await p.query(
    "SELECT id FROM chat_threads WHERE client_id = $1",
    [clientId],
  );
  if (thread.rows[0]) {
    threadId = thread.rows[0].id;
  } else {
    const t = await p.query(
      "INSERT INTO chat_threads (client_id, plan_id) VALUES ($1, $2) RETURNING id",
      [clientId, planId],
    );
    threadId = t.rows[0].id;
  }

  const todayRow = day.rows[0];
  return {
    weekNumber: todayRow?.week_number ?? 1,
    todayPlan: todayRow
      ? {
          date: today,
          weekNumber: todayRow.week_number,
          allowed: todayRow.allowed ?? [],
          forbidden: todayRow.forbidden ?? [],
          rotation: [],
          botMessage: todayRow.bot_message ?? "",
        }
      : null,
    green: results.filter((r) => r.zone === "green").map((r) => r.foxName),
    yellow: results.filter((r) => r.zone === "yellow").map((r) => r.foxName),
    red: results.filter((r) => r.zone === "red").map((r) => r.foxName),
    planId,
    threadId,
  };
}

/** Sample plan day for a given week (for chat context). */
export async function getPlanWeekSummary(
  planId: string,
  weekNumber: number,
): Promise<{
  weekNumber: number;
  phase: string;
  allowed: string[];
  forbidden: string[];
  botMessage: string;
} | null> {
  await ensureSchema();
  const p = getPool();

  if (!p) {
    const day =
      memory!.planDays.find((d) => d.weekNumber === weekNumber) ??
      memory!.planDays[0];
    if (!day) return null;
    return {
      weekNumber: day.weekNumber,
      phase: getWeekPhase(day.weekNumber),
      allowed: day.allowed,
      forbidden: day.forbidden,
      botMessage: day.botMessage,
    };
  }

  const { rows } = await p.query(
    `SELECT week_number, allowed, forbidden, bot_message FROM plan_days
     WHERE plan_id = $1 AND week_number = $2
     ORDER BY date ASC LIMIT 1`,
    [planId, weekNumber],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    weekNumber: row.week_number,
    phase: getWeekPhase(row.week_number),
    allowed: row.allowed ?? [],
    forbidden: row.forbidden ?? [],
    botMessage: row.bot_message ?? "",
  };
}

/** On-open daily reminder — free, no cron */
export async function ensureTodayReminder(clientId: string): Promise<void> {
  const ctx = await getActivePlanContext(clientId);
  if (!ctx?.todayPlan) return;

  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);
  const phase = getWeekPhase(ctx.weekNumber);
  const content =
    `Вы на ${ctx.weekNumber}-й неделе плана (${phase}). ` +
    `Спросите про любой продукт или блюдо — отвечу по вашему отчёту FOX.`;
  const header = `☀️ Напоминание · ${today}`;

  if (!p) {
    const exists = memory!.messages.some(
      (m) =>
        m.messageType === "daily_reminder" &&
        m.content.includes(today),
    );
    if (!exists) {
      memory!.messages.unshift({
        id: `rem-${Date.now()}`,
        role: "assistant",
        messageType: "daily_reminder",
        content: `${header}\n${content}`,
        readAt: null,
        createdAt: new Date().toISOString(),
      });
    }
    return;
  }

  const existing = await p.query(
    `SELECT cm.id FROM chat_messages cm
     JOIN chat_threads ct ON ct.id = cm.thread_id
     WHERE ct.client_id = $1 AND cm.message_type = 'daily_reminder'
       AND cm.created_at::date = CURRENT_DATE`,
    [clientId],
  );
  if (existing.rows[0]) return;

  await p.query(
    `INSERT INTO chat_messages (thread_id, role, message_type, content)
     VALUES ($1, 'assistant', 'daily_reminder', $2)`,
    [ctx.threadId, `${header}\n${content}`],
  );
}

export async function getChatMessages(clientId: string): Promise<ChatMessageRow[]> {
  await ensureSchema();
  await ensureTodayReminder(clientId);

  const p = getPool();
  if (p) await seedWelcomeMessage(p, clientId);

  if (!p) {
    return [...memory!.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  const { rows } = await p.query(
    `SELECT cm.id, cm.role, cm.message_type, cm.content, cm.read_at, cm.created_at
     FROM chat_messages cm
     JOIN chat_threads ct ON ct.id = cm.thread_id
     WHERE ct.client_id = $1
     ORDER BY cm.created_at ASC`,
    [clientId],
  );
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    messageType: row.message_type,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function addChatMessage(
  clientId: string,
  role: "user" | "assistant",
  content: string,
  messageType: ChatMessageRow["messageType"] = "chat",
): Promise<ChatMessageRow> {
  await ensureSchema();
  const p = getPool();

  if (!p) {
    const msg: ChatMessageRow = {
      id: `m-${Date.now()}`,
      role,
      messageType,
      content,
      readAt: role === "user" ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    memory!.messages.push(msg);
    return msg;
  }

  const ctx = await getActivePlanContext(clientId);
  const threadId =
    ctx?.threadId ?? (await ensureChatThread(p, clientId, ctx?.planId ?? null));

  const { rows } = await p.query(
    `INSERT INTO chat_messages (thread_id, role, message_type, content)
     VALUES ($1, $2, $3, $4) RETURNING id, role, message_type, content, read_at, created_at`,
    [threadId, role, messageType, content],
  );
  const row = rows[0];
  return {
    id: row.id,
    role: row.role,
    messageType: row.message_type,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function markMessagesRead(clientId: string): Promise<number> {
  await ensureSchema();
  const p = getPool();
  if (!p) {
    let count = 0;
    for (const m of memory!.messages) {
      if (!m.readAt && m.role !== "user") {
        m.readAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }

  const { rowCount } = await p.query(
    `UPDATE chat_messages cm SET read_at = now()
     FROM chat_threads ct
     WHERE cm.thread_id = ct.id AND ct.client_id = $1 AND cm.read_at IS NULL`,
    [clientId],
  );
  return rowCount ?? 0;
}

export async function getUnreadCount(clientId: string): Promise<number> {
  await ensureSchema();
  const p = getPool();
  if (!p) {
    return memory!.messages.filter((m) => !m.readAt && m.role !== "user").length;
  }
  const { rows } = await p.query(
    `SELECT COUNT(*)::int AS c FROM chat_messages cm
     JOIN chat_threads ct ON ct.id = cm.thread_id
     WHERE ct.client_id = $1 AND cm.read_at IS NULL AND cm.role != 'user'`,
    [clientId],
  );
  return rows[0].c;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
