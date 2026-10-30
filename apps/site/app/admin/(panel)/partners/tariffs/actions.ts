"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q, tx } from "@/lib/admin/db";
import { parseTiers, tariffSummary, type Tariff, type Tier } from "@/lib/admin/tariffs";

type Result = { ok: boolean; message?: string };
export type TariffInput = { name: string; fee: string; note: string; tiers: { from: string; fee: string }[] };

function clean(input: TariffInput): { name: string; fee: number; note: string; tiers: Tier[] } {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Назовите тариф");
  const fee = Number(input.fee);
  if (!Number.isInteger(fee) || fee < 0 || fee > 1_000_000) throw new Error("Сумма за отчёт — целое число рублей");
  const raw = input.tiers.filter((t) => t.from.trim() || t.fee.trim());
  for (const t of raw) {
    if (!/^\d+$/.test(t.from.trim()) || Number(t.from) < 2) throw new Error("Ступень: «с какого отчёта в месяце» — число от 2");
    if (!/^\d+$/.test(t.fee.trim())) throw new Error("Ступень: сумма — целое число рублей");
  }
  const tiers = parseTiers(raw.map((t) => ({ from: Number(t.from), fee: Number(t.fee) })));
  if (new Set(tiers.map((t) => t.from)).size !== tiers.length) throw new Error("Две ступени с одного и того же отчёта");
  return { name, fee, note: input.note.trim().slice(0, 500), tiers };
}

export async function saveTariff(id: string | null, input: TariffInput): Promise<Result & { id?: string }> {
  const staff = await assertStaff("tariffs");
  let data;
  try { data = clean(input); } catch (error) { return { ok: false, message: (error as Error).message }; }
  if (!id) {
    const row = await one<{ id: string }>(
      "INSERT INTO partner_tariffs (name, fee, tiers, note) VALUES ($1, $2, $3, $4) RETURNING id",
      [data.name, data.fee, JSON.stringify(data.tiers), data.note],
    );
    await audit(staff, { action: "create", entity: "tariff", entityId: row!.id, summary: `Тариф «${data.name}»: ${tariffSummary(data)}`, after: data });
    revalidatePath("/admin/partners", "layout");
    return { ok: true, id: row!.id, message: "Тариф добавлен" };
  }
  const before = await one<Tariff>("SELECT * FROM partner_tariffs WHERE id = $1", [id]);
  if (!before) return { ok: false, message: "Тариф не найден" };
  await q("UPDATE partner_tariffs SET name = $2, fee = $3, tiers = $4, note = $5, updated_at = now() WHERE id = $1", [id, data.name, data.fee, JSON.stringify(data.tiers), data.note]);
  await audit(staff, {
    action: "update", entity: "tariff", entityId: id, summary: `Тариф «${data.name}»: ${tariffSummary(before)} → ${tariffSummary(data)}`,
    before: { name: before.name, fee: before.fee, tiers: before.tiers, note: before.note }, after: data,
  });
  revalidatePath("/admin/partners", "layout");
  return { ok: true, id, message: "Сохранено. Уже зачисленные отчёты не пересчитываются." };
}

export async function makeDefault(id: string): Promise<Result> {
  const staff = await assertStaff("tariffs");
  const t = await one<Tariff>("SELECT * FROM partner_tariffs WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!t) return { ok: false, message: "Тариф не найден или в архиве" };
  await tx(async (c) => {
    await c.query("UPDATE partner_tariffs SET is_default = false, updated_at = now() WHERE is_default AND id <> $1", [id]);
    await c.query("UPDATE partner_tariffs SET is_default = true, updated_at = now() WHERE id = $1", [id]);
  });
  await audit(staff, { action: "update", entity: "tariff", entityId: id, summary: `Тариф по умолчанию: «${t.name}»` });
  revalidatePath("/admin/partners", "layout");
  return { ok: true };
}

export async function setArchived(id: string, archived: boolean): Promise<Result> {
  const staff = await assertStaff("tariffs");
  const t = await one<Tariff & { partners: number }>("SELECT *, (SELECT count(*)::int FROM partners WHERE tariff_id = $1) AS partners FROM partner_tariffs WHERE id = $1", [id]);
  if (!t) return { ok: false, message: "Тариф не найден" };
  if (archived && t.is_default) return { ok: false, message: "Сначала назначьте другой тариф по умолчанию" };
  if (archived && t.partners > 0) return { ok: false, message: `На тарифе ${t.partners} партн. — переведите их на другой тариф` };
  await q("UPDATE partner_tariffs SET archived_at = CASE WHEN $2 THEN now() END, updated_at = now() WHERE id = $1", [id, archived]);
  await audit(staff, { action: "update", entity: "tariff", entityId: id, summary: `Тариф «${t.name}» ${archived ? "в архиве" : "возвращён из архива"}` });
  revalidatePath("/admin/partners", "layout");
  return { ok: true };
}
