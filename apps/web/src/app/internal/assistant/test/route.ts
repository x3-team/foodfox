import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { refuseInternal } from "@/lib/internal-api";
import { getWeekPhase } from "@/lib/plan-engine";
import { buildSystemPrompt, chatWithHeli, createHeliClient, parseRequestedWeek, type ClientChatContext } from "@/lib/heli";

export const dynamic = "force-dynamic";

type Row = { foxName: string; zone: "green" | "yellow" | "red" };

/**
 * The admin's sandbox: one question to a draft of the settings, answered over
 * the demo report from seeds, never over a real client's data. Nothing is
 * stored and the call does not count in llm_requests.
 */
function demoContext(message: string): ClientChatContext {
  const rows = JSON.parse(
    readFileSync(join(process.cwd(), "../../packages/database/seeds/fox-demo-report.json"), "utf-8"),
  ) as Row[];
  const names = (zone: Row["zone"]) => rows.filter((r) => r.zone === zone).map((r) => r.foxName);
  const green = names("green");
  const red = names("red");
  const weekNumber = 2;
  const focusWeek = parseRequestedWeek(message, weekNumber);
  return {
    displayName: "Тестовый клиент",
    weekNumber,
    greenProducts: green,
    yellowProducts: names("yellow"),
    redProducts: red,
    todayAllowed: green.slice(0, 20),
    todayForbidden: red,
    focusWeek,
    focusWeekPhase: getWeekPhase(focusWeek),
  };
}

export async function POST(req: NextRequest) {
  const refused = refuseInternal(req);
  if (refused) return refused;
  const body = (await req.json().catch(() => ({}))) as {
    instructions?: string; model?: string; temperature?: number; maxTokens?: number; message?: string;
  };
  const message = String(body.message ?? "").trim().slice(0, 1000);
  const instructions = String(body.instructions ?? "").trim();
  if (!message || !instructions) return NextResponse.json({ ok: false, error: "Нужны вопрос и инструкции" }, { status: 400 });
  const heli = createHeliClient();
  if (!heli) return NextResponse.json({ ok: false, error: "AI не настроен на сервере (FOX_HELI_API_KEY, HELI_BASE_URL)" }, { status: 503 });
  const model = body.model?.trim() || process.env.HELI_CHAT_MODEL || "gpt-4o-mini";
  const t0 = Date.now();
  try {
    const response = await chatWithHeli(heli, buildSystemPrompt(demoContext(message), message, instructions), [], message, model, {
      temperature: typeof body.temperature === "number" ? body.temperature : undefined,
      maxTokens: typeof body.maxTokens === "number" ? body.maxTokens : undefined,
    });
    return NextResponse.json({
      ok: true,
      reply: response.choices[0]?.message?.content?.trim() ?? "",
      model: response.model ?? model,
      tokensIn: response.usage?.prompt_tokens ?? null,
      tokensOut: response.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - t0,
    });
  } catch (e) {
    console.error("assistant sandbox failed", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "Ошибка AI" }, { status: 502 });
  }
}
