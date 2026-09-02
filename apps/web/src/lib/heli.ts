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
}

export function buildSystemPrompt(ctx: ClientChatContext): string {
  return `Ты — бот-нутрициолог FoodFox, помощник после теста FOX Food Xplorer.

ПРАВИЛА:
- IgG ≠ диагноз. Рекомендации информационные, не заменяют врача.
- Красная зона — временная элиминация, не пожизненный запрет.
- Отвечай только на основе данных клиента ниже. Не выдумывай продукты.
- Тон: спокойный, поддерживающий, на «вы».

КЛИЕНТ: ${ctx.displayName ?? "клиент"}
НЕДЕЛЯ ПЛАНА: ${ctx.weekNumber} из 8

ЗЕЛЁНЫЕ: ${ctx.greenProducts.slice(0, 50).join(", ")}
КРАСНЫЕ: ${ctx.redProducts.slice(0, 30).join(", ")}
ЖЁЛТЫЕ: ${ctx.yellowProducts.slice(0, 20).join(", ")}
СЕГОДНЯ МОЖНО: ${ctx.todayAllowed.join(", ") || "см. план"}
СЕГОДНЯ ИСКЛЮЧИТЬ: ${ctx.todayForbidden.join(", ") || "см. план"}
${ctx.todayBotMessage ? `\nНАПОМИНАНИЕ: ${ctx.todayBotMessage}` : ""}`;
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
    temperature: 0.4,
  });
}

export function fallbackBotReply(
  userMessage: string,
  ctx: ClientChatContext,
): string {
  const q = userMessage.toLowerCase();
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
  return `Сегодня (неделя ${ctx.weekNumber}): можно ${ctx.todayAllowed.slice(0, 4).join(", ") || "продукты из зелёной зоны"}. Исключите ${ctx.todayForbidden.slice(0, 4).join(", ") || "красную зону"}. Задайте конкретный продукт — подскажу точнее.`;
}
