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
  /** When user asks about a specific week (may differ from current). */
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

export function buildSystemPrompt(ctx: ClientChatContext): string {
  const focusWeek = ctx.focusWeek ?? ctx.weekNumber;
  const focusPhase = ctx.focusWeekPhase ?? "Элиминация";
  const focusAllowed = ctx.focusWeekAllowed ?? ctx.todayAllowed;
  const focusForbidden = ctx.focusWeekForbidden ?? ctx.todayForbidden;

  return `Ты — бот-нутрициолог FoodFox, помощник после теста FOX Food Xplorer.

ПРАВИЛА:
- IgG ≠ диагноз. Рекомендации информационные, не заменяют врача.
- Красная зона — временная элиминация 4–6 недель, не пожизненный запрет.
- Отвечай ТОЛЬКО на основе списков продуктов клиента ниже. Не выдумывай продукты.
- Не повторяй один и тот же шаблонный ответ. Каждый ответ — конкретный, с продуктами из данных.
- Если спрашивают про неделю N — отвечай про неделю N (фаза, что можно/нельзя), не про «сегодня».
- Тон: спокойный, поддерживающий, на «вы». Кратко, 3–6 предложений.

ФАЗЫ ПЛАНА (8 недель):
- Недели 1–4: Элиминация — только зелёные + ротация жёлтых, красные исключены
- Недели 5–6: Стабилизация — зелёные + часть жёлтых, большинство красных исключены
- Недели 7–8: Жёлтая зона — постепенное расширение, часть красных ещё исключена

КЛИЕНТ: ${ctx.displayName ?? "клиент"}
ТЕКУЩАЯ НЕДЕЛЯ ПЛАНА: ${ctx.weekNumber} из 8

ОТВЕЧАЙ ПРО НЕДЕЛЮ ${focusWeek} (${focusPhase}):
- Можно: ${focusAllowed.slice(0, 15).join(", ") || "продукты зелёной зоны"}
- Исключить: ${focusForbidden.slice(0, 15).join(", ") || "красная зона"}

ЗЕЛЁНЫЕ (${ctx.greenProducts.length}): ${ctx.greenProducts.slice(0, 40).join(", ")}${ctx.greenProducts.length > 40 ? "…" : ""}
КРАСНЫЕ (${ctx.redProducts.length}): ${ctx.redProducts.slice(0, 25).join(", ")}${ctx.redProducts.length > 25 ? "…" : ""}
ЖЁЛТЫЕ (${ctx.yellowProducts.length}): ${ctx.yellowProducts.slice(0, 15).join(", ")}${ctx.yellowProducts.length > 15 ? "…" : ""}
${ctx.todayBotMessage ? `\nСЕГОДНЯ: ${ctx.todayBotMessage}` : ""}`;
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
    temperature: 0.35,
    frequency_penalty: 0.3,
  });
}

export function fallbackBotReply(
  userMessage: string,
  ctx: ClientChatContext,
): string {
  const q = userMessage.toLowerCase();
  const week = ctx.focusWeek ?? ctx.weekNumber;
  const phase = ctx.focusWeekPhase ?? "план";
  const allowed = ctx.focusWeekAllowed ?? ctx.todayAllowed;
  const forbidden = ctx.focusWeekForbidden ?? ctx.todayForbidden;

  if (/недел|week/.test(q)) {
    return (
      `Неделя ${week} · ${phase}. ` +
      `Можно: ${allowed.slice(0, 8).join(", ") || "зелёная зона"}. ` +
      `Исключите: ${forbidden.slice(0, 6).join(", ") || "красную зону"}. ` +
      `Спросите про конкретный продукт — проверю по вашему отчёту FOX.`
    );
  }

  if (/орех|миндал|фундук|грец/.test(q)) {
    const inRed = ctx.redProducts.some((p) => /орех|миндал|фундук|грец/i.test(p));
    if (inRed) {
      return "Орехи в вашей красной зоне — пока исключите на 4–6 недель элиминации. После этого обсудим с нутрициологом.";
    }
    return "Орехи у вас не в красной зоне — можно включать по плану с учётом ротации жёлтых продуктов.";
  }
  if (/молок|сыр|творог|кефир/.test(q)) {
    return "Молочные продукты часто требуют отдельного разбора (Bos d 4/5/8). Следуйте плану элиминации и уточните у нутрициолога при необходимости.";
  }
  return `Сегодня (неделя ${ctx.weekNumber}): можно ${allowed.slice(0, 4).join(", ") || "продукты из зелёной зоны"}. Исключите ${forbidden.slice(0, 4).join(", ") || "красную зону"}. Задайте конкретный продукт — подскажу точнее.`;
}
