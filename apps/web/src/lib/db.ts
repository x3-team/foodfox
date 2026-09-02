import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import type { ParsedResult, Zone } from "./fox-parser";
import type { PlanDay } from "./plan-engine";
import { buildEightWeekPlan } from "./plan-engine";
import { parseFoxPdfText } from "./fox-parser";

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
  steps: string[];
  tags: string[];
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

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
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
  schemaReady = true;
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
    recipes: getDemoRecipes(),
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
    ('Салат с индейкой и брокколи', 'Лёгкий обед из зелёных продуктов',
     '["Нарежьте индейку и брокколи", "Смешайте, заправьте оливковым маслом"]'::jsonb,
     '["15 мин", "обед"]'::jsonb, true),
    ('Гречка с кабачком', 'Простое блюдо на ужин',
     '["Отварите гречку", "Обжарьте кабачок", "Подавайте вместе"]'::jsonb,
     '["25 мин", "ужин"]'::jsonb, true),
    ('Запечённая куриная грудка', 'Белковый ужин',
     '["Замаринуйте грудку", "Запекайте 35 мин при 180°C"]'::jsonb,
     '["40 мин", "ужин"]'::jsonb, true)
  `);
}

function getDemoRecipes(): RecipeRow[] {
  return [
    {
      id: "r1",
      title: "Салат с индейкой и брокколи",
      description: "Лёгкий обед из зелёных продуктов",
      steps: ["Нарежьте индейку и брокколи", "Смешайте, заправьте маслом"],
      tags: ["15 мин", "обед"],
    },
    {
      id: "r2",
      title: "Гречка с кабачком",
      description: "Простое блюдо на ужин",
      steps: ["Отварите гречку", "Обжарьте кабачок"],
      tags: ["25 мин", "ужин"],
    },
    {
      id: "r3",
      title: "Запечённая куриная грудка",
      description: "Белковый ужин",
      steps: ["Замаринуйте грудку", "Запекайте 35 мин при 180°C"],
      tags: ["40 мин", "ужин"],
    },
  ];
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

export async function saveReportFromPdf(
  clientId: string,
  pdfText: string,
): Promise<{ reportId: string; results: TestResultRow[]; planId: string }> {
  await ensureSchema();
  const parsed: ParsedResult[] = parseFoxPdfText(pdfText);
  if (parsed.length < 5) {
    const hint =
      pdfText.trim().length < 50
        ? "Не удалось извлечь текст из PDF. Убедитесь, что это отчёт FOX Food Xplorer."
        : `Распознано только ${parsed.length} антигенов из ~286. Проверьте, что PDF не повреждён.`;
    throw new Error(hint);
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
    `INSERT INTO nutrition_plans (client_id, report_id, started_at, status)
     VALUES ($1, $2, CURRENT_DATE, 'active') RETURNING id`,
    [clientId, reportId],
  );
  const planId = plan.rows[0].id;
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

  const results = await getResultsForClient(clientId);
  return { reportId, results, planId };
}

export async function getResultsForClient(clientId: string): Promise<TestResultRow[]> {
  await ensureSchema();
  const p = getPool();
  if (!p) {
    return memory!.results;
  }

  const { rows } = await p.query(
    `SELECT tr.id, fi.fox_name, tr.value_ug_ml, tr.is_floor_value, tr.zone
     FROM test_results tr
     JOIN reports r ON r.id = tr.report_id
     JOIN food_items fi ON fi.id = tr.food_item_id
     WHERE r.client_id = $1
     ORDER BY tr.zone, fi.fox_name`,
    [clientId],
  );
  return rows.map((row) => ({
    id: row.id,
    foxName: row.fox_name,
    valueUgMl: row.value_ug_ml ? parseFloat(row.value_ug_ml) : null,
    isFloorValue: row.is_floor_value,
    zone: row.zone,
  }));
}

export async function getRecipes(): Promise<RecipeRow[]> {
  await ensureSchema();
  const p = getPool();
  if (!p) return memory!.recipes;

  const { rows } = await p.query(
    `SELECT id, title, description, steps, tags FROM recipes WHERE published = true ORDER BY title`,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    steps: row.steps ?? [],
    tags: row.tags ?? [],
  }));
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

/** On-open daily reminder — free, no cron */
export async function ensureTodayReminder(clientId: string): Promise<void> {
  const ctx = await getActivePlanContext(clientId);
  if (!ctx?.todayPlan?.botMessage) return;

  const p = getPool();
  const today = new Date().toISOString().slice(0, 10);
  const content = ctx.todayPlan.botMessage;
  const header = `☀️ Напоминание · Неделя ${ctx.weekNumber}, ${today}`;

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
    `SELECT id FROM chat_messages cm
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
  const ctx = await getActivePlanContext(clientId);
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

  const threadId = ctx?.threadId;
  if (!threadId) throw new Error("No chat thread");

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
