/**
 * Heli (getheli.ru) — OpenAI-compatible LLM gateway
 */
import OpenAI from "openai";

export function createHeliClient() {
  const apiKey = process.env.FOX_HELI_API_KEY;
  const baseURL = process.env.HELI_BASE_URL;
  if (!apiKey || !baseURL) return null;
  return new OpenAI({ apiKey, baseURL });
}

export interface ClientChatContext {
  displayName?: string;
  weekNumber: number;
  greenProducts: string[];
  redProducts: string[];
  yellowProducts: string[];
  todayAllowed: string[];
  todayForbidden: string[];
  todayBotMessage?: string;
  focusWeek?: number;
  focusWeekPhase?: string;
  focusWeekAllowed?: string[];
  focusWeekForbidden?: string[];
}

/** Parse «6 неделю», «неделя 6», «week 6» from user text. */
export function parseRequestedWeek(message: string, fallback: number): number {
  const patterns = [
    /(?:на\s+)?(\d+)[-–]?(?:й|ю|е|м)?\s*недел/i,
    /недел(?:я|ю|е|и)\s*(\d+)/i,
    /week\s*(\d+)/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 8) return n;
    }
  }
  return fallback;
}

function zoneLabel(zone: "green" | "yellow" | "red"): string {
  if (zone === "green") return "зелёная";
  if (zone === "yellow") return "жёлтая";
  return "красная";
}

/** Match product names from FOX lists mentioned in the user's message. */
export function findMentionedProducts(
  message: string,
  ctx: ClientChatContext,
): { name: string; zone: "green" | "yellow" | "red" }[] {
  const q = message.toLowerCase();
  const all = [
    ...ctx.redProducts.map((name) => ({ name, zone: "red" as const })),
    ...ctx.yellowProducts.map((name) => ({ name, zone: "yellow" as const })),
    ...ctx.greenProducts.map((name) => ({ name, zone: "green" as const })),
  ];
  const hits: { name: string; zone: "green" | "yellow" | "red" }[] = [];
  for (const item of all) {
    const token = item.name.toLowerCase();
    if (token.length >= 3 && q.includes(token)) {
      hits.push(item);
    }
  }
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = h.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSystemPrompt(ctx: ClientChatContext, userMessage?: string): string {
  const focusWeek = ctx.focusWeek ?? ctx.weekNumber;
  const focusPhase = ctx.focusWeekPhase ?? "Элиминация";
  const focusAllowed = ctx.focusWeekAllowed ?? ctx.todayAllowed;
  const focusForbidden = ctx.focusWeekForbidden ?? ctx.todayForbidden;
  const mentioned = userMessage ? findMentionedProducts(userMessage, ctx) : [];

  const productHints =
    mentioned.length > 0
      ? mentioned
          .map((p) => `- ${p.name}: ${zoneLabel(p.zone)} зона в отчёте FOX`)
          .join("\n")
      : "— явных совпадений с названиями из отчёта не найдено; ищи по смыслу в списках ниже";

  return `Ты — бот-нутрициолог FoodFox. Клиент сдал IgG-тест FOX Food Xplorer, у тебя есть его персональные данные и 8-недельный план.

Как отвечать (важно):
- Общайся естественно, как живой нутрициолог в чате: сначала прямой ответ на вопрос, потом при необходимости детали.
- Опирайся на списки продуктов и план клиента — не выдумывай продукты и зоны.
- Не начинай каждый ответ одинаковой фразой и не перечисляй весь план, если спросили про одно.
- Никогда не используй шаблон «Сегодня можно: … Исключите: …» — отвечай живым языком.
- Не копируй формулировки из предыдущих сообщений в чате, если они звучат одинаково.
- Длину ответа подбирай под вопрос: на «можно гречку?» — коротко; на «что есть на 6 неделе?» — развёрнуто.
- IgG — не диагноз; красная зона — временная элиминация, не пожизненный запрет.
- Тон: спокойный, поддерживающий, на «вы». Можно мягко мотивировать.

Клиент: ${ctx.displayName ?? "клиент"}
Сейчас неделя ${ctx.weekNumber} из 8.
${ctx.focusWeek !== ctx.weekNumber ? `В вопросе речь о неделе ${focusWeek} — отвечай про неё.` : ""}

Неделя ${focusWeek} · ${focusPhase}:
Разрешено на этой неделе: ${focusAllowed.slice(0, 20).join(", ") || "см. зелёную зону"}
Исключено: ${focusForbidden.slice(0, 20).join(", ") || "см. красную зону"}

Продукты из вопроса (если есть):
${productHints}

Справочно — зоны из отчёта FOX:
Зелёные (${ctx.greenProducts.length}): ${ctx.greenProducts.slice(0, 50).join(", ")}${ctx.greenProducts.length > 50 ? "…" : ""}
Красные (${ctx.redProducts.length}): ${ctx.redProducts.slice(0, 30).join(", ")}${ctx.redProducts.length > 30 ? "…" : ""}
Жёлтые (${ctx.yellowProducts.length}): ${ctx.yellowProducts.slice(0, 20).join(", ")}${ctx.yellowProducts.length > 20 ? "…" : ""}`;
}

export async function chatWithHeli(
  client: OpenAI,
  systemPrompt: string,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  userMessage: string,
  model?: string,
) {
  return client.chat.completions.create({
    model: model ?? process.env.HELI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ],
    temperature: 0.72,
    max_tokens: 700,
    presence_penalty: 0.15,
  });
}

/** Only when Heli is unavailable — minimal, not a fake «smart» reply. */
export function offlineChatNotice(): string {
  return "Сейчас AI-чат недоступен. Попробуйте через минуту или посмотрите план на вкладке «План».";
}

export function heliErrorNotice(): string {
  return "Не получилось связаться с AI. Повторите вопрос — обычно помогает со второй попытки.";
}
