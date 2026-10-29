"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { callWeb, clientTitle } from "@/lib/admin/app";
import { one } from "@/lib/admin/db";

/** Rebuilds the plan days from the report's stored results, with the plan engine of apps/web. */
export async function rebuildPlan(planId: string): Promise<{ ok: boolean; message?: string }> {
  const staff = await assertStaff("app_plans");
  if (!/^[0-9a-f-]{36}$/i.test(planId)) return { ok: false, message: "План не найден" };
  const plan = await one<{ report_id: string | null; user_id: string; display_name: string | null; phone: string | null }>(
    `SELECT p.report_id, c.user_id, c.display_name, u.phone FROM nutrition_plans p JOIN clients c ON c.id = p.client_id
       LEFT JOIN users u ON u.id = c.user_id WHERE p.id = $1`, [planId]);
  if (!plan) return { ok: false, message: "План не найден" };
  if (!plan.report_id) return { ok: false, message: "У плана нет отчёта, пересобрать не из чего" };
  const res = await callWeb(`/internal/reports/${plan.report_id}/reprocess`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "plan" }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok || !data.ok) return { ok: false, message: data.error ?? "Сервер приложения не ответил" };
  await audit(staff, { action: "rebuild_plan", entity: "app_user", entityId: plan.user_id, summary: `Пересобран план клиента ${clientTitle(plan.display_name, plan.phone)}` });
  revalidatePath("/admin/app/plans");
  return { ok: true, message: "План пересобран из отчёта" };
}
