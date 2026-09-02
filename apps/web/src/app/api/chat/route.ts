import { NextRequest, NextResponse } from "next/server";
import {
  addChatMessage,
  getActivePlanContext,
  getChatMessages,
  getOrCreateDemoClient,
  getPlanWeekSummary,
  markMessagesRead,
} from "@/lib/db";
import {
  buildSystemPrompt,
  chatWithHeli,
  createHeliClient,
  fallbackBotReply,
  parseRequestedWeek,
} from "@/lib/heli";

export async function GET() {
  const clientId = await getOrCreateDemoClient();
  const messages = await getChatMessages(clientId);
  return NextResponse.json({ messages });
}

export async function PATCH() {
  const clientId = await getOrCreateDemoClient();
  await markMessagesRead(clientId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const clientId = await getOrCreateDemoClient();
  const ctx = await getActivePlanContext(clientId);

  if (!ctx || ctx.green.length === 0) {
    await addChatMessage(clientId, "user", message);
    const reply =
      "Сначала загрузите PDF-отчёт FOX на вкладке «Отчёт». После разбора я смогу ответить по вашим зонам IgG и плану питания.";
    await addChatMessage(clientId, "assistant", reply);
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  }

  const focusWeek = parseRequestedWeek(message, ctx.weekNumber);
  const weekPlan = await getPlanWeekSummary(ctx.planId, focusWeek);

  const chatCtx = {
    displayName: "клиент",
    weekNumber: ctx.weekNumber,
    greenProducts: ctx.green,
    redProducts: ctx.red,
    yellowProducts: ctx.yellow,
    todayAllowed: ctx.todayPlan?.allowed ?? [],
    todayForbidden: ctx.todayPlan?.forbidden ?? [],
    todayBotMessage: ctx.todayPlan?.botMessage,
    focusWeek,
    focusWeekPhase: weekPlan?.phase,
    focusWeekAllowed: weekPlan?.allowed,
    focusWeekForbidden: weekPlan?.forbidden,
  };

  // History BEFORE saving current user message (avoids duplicate in LLM request)
  const history = (await getChatMessages(clientId))
    .filter((m) => m.messageType === "chat")
    .slice(-8)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  await addChatMessage(clientId, "user", message);

  let reply: string;
  const heli = createHeliClient();
  if (!heli) {
    reply =
      "AI-чат не настроен на сервере. Администратору нужно добавить FOX_HELI_API_KEY (getheli.ru) в переменные окружения.";
    await addChatMessage(clientId, "assistant", reply);
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  }

  try {
    const response = await chatWithHeli(
      heli,
      buildSystemPrompt(chatCtx),
      history,
      message,
    );
    reply = response.choices[0]?.message?.content?.trim() ?? fallbackBotReply(message, chatCtx);
  } catch (e) {
    console.error("Heli chat error:", e);
    reply = fallbackBotReply(message, chatCtx);
  }

  await addChatMessage(clientId, "assistant", reply);
  const messages = await getChatMessages(clientId);
  return NextResponse.json({ messages });
}
