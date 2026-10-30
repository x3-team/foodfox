"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { callWeb } from "@/lib/admin/app";
import { one, q, tx } from "@/lib/admin/db";

export type Draft = { instructions: string; model: string; temperature: string; maxTokens: string; note: string };
export type SaveResult = { ok: boolean; message?: string; id?: number };
export type TestResult = { ok: boolean; message?: string; reply?: string; model?: string; tokensIn?: number | null; tokensOut?: number | null; latencyMs?: number };

function clean(d: Draft): { ok: true; v: { instructions: string; model: string | null; temperature: number | null; maxTokens: number | null; note: string } } | { ok: false; message: string } {
  const instructions = d.instructions.trim();
  if (instructions.length < 50) return { ok: false, message: "Инструкции слишком короткие" };
  if (instructions.length > 20000) return { ok: false, message: "Инструкции длиннее 20 000 знаков" };
  const model = d.model.trim().slice(0, 100) || null;
  if (model && !/^[\w.:/-]+$/.test(model)) return { ok: false, message: "В названии модели только латиница, цифры и . : / - _" };
  const temperature = d.temperature.trim() === "" ? null : Number(d.temperature.replace(",", "."));
  if (temperature !== null && !(temperature >= 0 && temperature <= 2)) return { ok: false, message: "Температура от 0 до 2" };
  const maxTokens = d.maxTokens.trim() === "" ? null : Math.round(Number(d.maxTokens));
  if (maxTokens !== null && !(maxTokens >= 50 && maxTokens <= 4000)) return { ok: false, message: "Длина ответа от 50 до 4000 токенов" };
  return { ok: true, v: { instructions, model, temperature, maxTokens, note: d.note.trim().slice(0, 300) } };
}

/** Every save is a new version; with activate it replaces the one the app uses. */
export async function savePrompt(draft: Draft, activate: boolean): Promise<SaveResult> {
  const staff = await assertStaff("app_assistant");
  const c = clean(draft);
  if (!c.ok) return { ok: false, message: c.message };
  const { v } = c;
  const id = await tx(async (db) => {
    if (activate) await db.query("UPDATE assistant_prompts SET is_active = false WHERE is_active");
    const r = await db.query<{ id: string }>(
      `INSERT INTO assistant_prompts (instructions, model, temperature, max_tokens, note, is_active, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [v.instructions, v.model, v.temperature, v.maxTokens, v.note, activate, staff.id, staff.name || staff.email],
    );
    const newId = Number(r.rows[0].id);
    await audit(staff, {
      action: activate ? "activate" : "create", entity: "assistant", entityId: newId,
      summary: `Версия ${newId} настроек помощника${activate ? " сохранена и включена" : " сохранена"}${v.note ? `: ${v.note}` : ""}`,
      after: { model: v.model, temperature: v.temperature, maxTokens: v.maxTokens, length: v.instructions.length },
    }, db);
    return newId;
  });
  revalidatePath("/admin/app/assistant");
  return { ok: true, id, message: activate ? `Версия ${id} включена. Приложение подхватит её в течение минуты.` : `Сохранено как версия ${id}` };
}

export async function activatePrompt(id: number): Promise<SaveResult> {
  const staff = await assertStaff("app_assistant");
  const row = await one<{ id: string }>("SELECT id FROM assistant_prompts WHERE id = $1", [id]);
  if (!row) return { ok: false, message: "Версия не найдена" };
  await tx(async (db) => {
    await db.query("UPDATE assistant_prompts SET is_active = false WHERE is_active");
    await db.query("UPDATE assistant_prompts SET is_active = true WHERE id = $1", [id]);
    await audit(staff, { action: "activate", entity: "assistant", entityId: id, summary: `Включена версия ${id} настроек помощника` }, db);
  });
  revalidatePath("/admin/app/assistant");
  return { ok: true, message: `Версия ${id} включена. Приложение подхватит её в течение минуты.` };
}

/** Back to the instructions written in the code (lib/heli.ts DEFAULT_INSTRUCTIONS). */
export async function resetToDefaults(): Promise<SaveResult> {
  const staff = await assertStaff("app_assistant");
  await q("UPDATE assistant_prompts SET is_active = false WHERE is_active");
  await audit(staff, { action: "activate", entity: "assistant", summary: "Помощник переведён на стандартные настройки из кода" });
  revalidatePath("/admin/app/assistant");
  return { ok: true, message: "Включены стандартные настройки. Приложение подхватит их в течение минуты." };
}

/** One question to the draft over the demo report; no client data goes to the model. */
export async function testPrompt(draft: Draft, message: string): Promise<TestResult> {
  await assertStaff("app_assistant");
  const c = clean(draft);
  if (!c.ok) return { ok: false, message: c.message };
  const text = message.trim().slice(0, 1000);
  if (!text) return { ok: false, message: "Напишите вопрос" };
  const res = await callWeb("/internal/assistant/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instructions: c.v.instructions, model: c.v.model, temperature: c.v.temperature, maxTokens: c.v.maxTokens, message: text }),
  }).catch(() => null);
  if (!res) return { ok: false, message: "Сервер приложения не отвечает" };
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return { ok: false, message: data.error ?? `Ошибка ${res.status}` };
  return { ok: true, reply: data.reply, model: data.model, tokensIn: data.tokensIn, tokensOut: data.tokensOut, latencyMs: data.latencyMs };
}
