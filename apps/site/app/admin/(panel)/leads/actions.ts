"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q, tx } from "@/lib/admin/db";
import { LEAD_STATUSES, isLeadStatus, type Lead } from "@/lib/admin/leads";

export type ActionResult = { ok: boolean; message?: string };

async function staffName(id: string | null) {
  if (!id) return "никто";
  const row = await one<{ name: string; email: string }>("SELECT name, email FROM admin_users WHERE id = $1", [id]);
  return row ? row.name || row.email : "—";
}

export async function updateLead(id: string, patch: { status?: string; assignee_id?: string | null }): Promise<ActionResult> {
  const staff = await assertStaff("leads");
  try {
    await tx(async (db) => {
      const { rows } = await db.query<Lead>("SELECT * FROM leads WHERE id = $1 FOR UPDATE", [id]);
      const lead = rows[0];
      if (!lead) throw new Error("Заявка не найдена");
      if (patch.status !== undefined && patch.status !== lead.status) {
        if (!isLeadStatus(patch.status)) throw new Error("Неизвестный статус");
        await db.query(
          `UPDATE leads SET status = $2, updated_at = now(),
                  closed_at = CASE WHEN $2 IN ('done', 'spam') THEN now() ELSE NULL END,
                  assignee_id = CASE WHEN $2 = 'in_progress' AND assignee_id IS NULL THEN $3::uuid ELSE assignee_id END
            WHERE id = $1`,
          [id, patch.status, staff.id],
        );
        await audit(staff, {
          action: "status", entity: "lead", entityId: id,
          summary: `Заявка #${id}: «${LEAD_STATUSES[lead.status]}» → «${LEAD_STATUSES[patch.status]}»`,
          before: { status: lead.status }, after: { status: patch.status },
        }, db);
      }
      if (patch.assignee_id !== undefined && (patch.assignee_id || null) !== lead.assignee_id) {
        const next = patch.assignee_id || null;
        await db.query("UPDATE leads SET assignee_id = $2, updated_at = now() WHERE id = $1", [id, next]);
        await audit(staff, {
          action: "assign", entity: "lead", entityId: id,
          summary: `Заявка #${id}: ответственный — ${await staffName(next)}`,
          before: { assignee_id: lead.assignee_id }, after: { assignee_id: next },
        }, db);
      }
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Не сохранилось" };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function addNote(id: string, text: string): Promise<ActionResult> {
  const staff = await assertStaff("leads");
  const body = text.trim().slice(0, 4000);
  if (!body) return { ok: false, message: "Пустая заметка" };
  await q("INSERT INTO lead_notes (lead_id, author_id, author_name, text) VALUES ($1, $2, $3, $4)", [id, staff.id, staff.name || staff.email, body]);
  await q("UPDATE leads SET updated_at = now() WHERE id = $1", [id]);
  await audit(staff, { action: "note", entity: "lead", entityId: id, summary: `Заявка #${id}: заметка`, after: { text: body } });
  revalidatePath(`/admin/leads/${id}`);
  return { ok: true };
}

export async function bulkLeads(ids: string[], status: string): Promise<ActionResult> {
  const staff = await assertStaff("leads");
  const list = ids.filter((id) => /^\d+$/.test(id)).slice(0, 500);
  if (!list.length) return { ok: false, message: "Ничего не выбрано" };
  if (!isLeadStatus(status)) return { ok: false, message: "Неизвестный статус" };
  const rows = await q<{ id: string }>(
    `UPDATE leads SET status = $2, updated_at = now(), closed_at = CASE WHEN $2 IN ('done', 'spam') THEN now() ELSE NULL END
      WHERE id = ANY($1::bigint[]) AND status <> $2 RETURNING id`,
    [list, status],
  );
  if (rows.length) {
    await audit(staff, {
      action: "bulk_status", entity: "lead", entityId: rows.map((r) => r.id).join(","),
      summary: `${rows.length} заявок → «${LEAD_STATUSES[status]}»`, after: { status, ids: rows.map((r) => r.id) },
    });
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Обновлено: ${rows.length}` };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const staff = await assertStaff("users"); // admins only
  const lead = await one<Lead>("SELECT * FROM leads WHERE id = $1", [id]);
  if (!lead) return { ok: false, message: "Заявка не найдена" };
  await q("DELETE FROM leads WHERE id = $1", [id]);
  await audit(staff, { action: "delete", entity: "lead", entityId: id, summary: `Заявка #${id} удалена`, before: lead });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
