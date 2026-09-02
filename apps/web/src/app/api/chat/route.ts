import { NextRequest, NextResponse } from "next/server";
import {
  addChatMessage,
  getActivePlanContext,
  getChatMessages,
  getOrCreateDemoClient,
  markMessagesRead,
} from "@/lib/db";
import {
  buildSystemPrompt,
  chatWithHeli,
  createHeliClient,
  fallbackBotReply,
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
  await addChatMessage(clientId, "user", message);

  const ctx = await getActivePlanContext(clientId);
  if (!ctx || ctx.green.length === 0) {
    const reply =
      "Сначала загрузите PDF-отчёт FOX на вкладке «Отчёт». После разбора я смогу ответить по вашим зонам IgG и плану питания.";
    await addChatMessage(clientId, "assistant", reply);
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  }

  const chatCtx = {
    displayName: "клиент",
    weekNumber: ctx?.weekNumber ?? 1,
    greenProducts: ctx?.green ?? [],
    redProducts: ctx?.red ?? [],
    yellowProducts: ctx?.yellow ?? [],
    todayAllowed: ctx?.todayPlan?.allowed ?? [],
    todayForbidden: ctx?.todayPlan?.forbidden ?? [],
    todayBotMessage: ctx?.todayPlan?.botMessage,
  };

  let reply: string;
  const heli = createHeliClient();
  if (!heli) {
    reply =
      "AI-чат не настроен на сервере. Администратору нужно добавить HELI_API_KEY (getheli.ru) в Render → Environment.";
    await addChatMessage(clientId, "assistant", reply);
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  }

  try {
      const history = (await getChatMessages(clientId))
        .filter((m) => m.messageType === "chat")
        .slice(-10)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      const response = await chatWithHeli(
        heli,
        buildSystemPrompt(chatCtx),
        history,
        message,
      );
      reply = response.choices[0]?.message?.content ?? fallbackBotReply(message, chatCtx);
  } catch {
    reply = fallbackBotReply(message, chatCtx);
  }

  await addChatMessage(clientId, "assistant", reply);
  const messages = await getChatMessages(clientId);
  return NextResponse.json({ messages });
}
