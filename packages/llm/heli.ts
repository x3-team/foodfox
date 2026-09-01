/**
 * Heli (getheli.ru) — OpenAI-compatible LLM gateway
 *
 * Env:
 *   HELI_API_KEY
 *   HELI_BASE_URL   — https://getheli.ru/v1 (OpenAI-compatible)
 *   HELI_CHAT_MODEL — default: gpt-4o-mini
 */

import OpenAI from 'openai';

export function createHeliClient() {
  const apiKey = process.env.HELI_API_KEY;
  const baseURL = process.env.HELI_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error('HELI_API_KEY and HELI_BASE_URL must be set');
  }

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

КЛИЕНТ: ${ctx.displayName ?? 'клиент'}
НЕДЕЛЯ ПЛАНА: ${ctx.weekNumber} из 8

ЗЕЛЁНЫЕ (можно без ограничений): ${ctx.greenProducts.slice(0, 50).join(', ')}${ctx.greenProducts.length > 50 ? '...' : ''}

КРАСНЫЕ (исключить): ${ctx.redProducts.slice(0, 30).join(', ')}

ЖЁЛТЫЕ (ротация): ${ctx.yellowProducts.slice(0, 20).join(', ')}

СЕГОДНЯ МОЖНО: ${ctx.todayAllowed.join(', ') || 'см. план'}
СЕГОДНЯ ИСКЛЮЧИТЬ: ${ctx.todayForbidden.join(', ') || 'см. план'}
${ctx.todayBotMessage ? `\nНАПОМИНАНИЕ НА СЕГОДНЯ: ${ctx.todayBotMessage}` : ''}`;
}

export async function chatWithHeli(
  client: OpenAI,
  systemPrompt: string,
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  userMessage: string,
  model?: string,
) {
  return client.chat.completions.create({
    model: model ?? process.env.HELI_CHAT_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
  });
}
