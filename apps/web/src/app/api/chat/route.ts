import { NextRequest, NextResponse } from "next/server";
import {
  addChatMessage,
  getActivePlanContext,
  getChatMessages,
  getClientProfile,
  getPlanWeekSummary,
  markMessagesRead,
} from "@/lib/db";
import {
  getAuthClientId,
  getAuthSession,
  handleAuthError,
} from "@/lib/api-auth";
import {
  buildSystemPrompt,
  chatWithHeli,
  createHeliClient,
  fallbackBotReply,
  parseRequestedWeek,
} from "@/lib/heli";

export async function GET() {
  try {
    const clientId = await getAuthClientId();
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const clientId = await getAuthClientId();
    await markMessagesRead(clientId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const session = await getAuthSession();
    const clientId = session.clientId;
    const profile = await getClientProfile(clientId);
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
      displayName: profile.displayName,
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
      reply =
        response.choices[0]?.message?.content?.trim() ??
        fallbackBotReply(message, chatCtx);
    } catch (err) {
      console.error("Heli chat error:", err);
      reply = fallbackBotReply(message, chatCtx);
    }

    await addChatMessage(clientId, "assistant", reply);
    const messages = await getChatMessages(clientId);
    return NextResponse.json({ messages });
  } catch (e) {
    const auth = handleAuthError(e);
    if (auth) return auth;
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
