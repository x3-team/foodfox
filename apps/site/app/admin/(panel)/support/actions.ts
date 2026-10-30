"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, tx } from "@/lib/admin/db";
import { isTicketStatus, TICKET_STATUSES } from "@/lib/admin/support";

type Result = { ok: boolean; message?: string };

const ticketId = (id: string) => (/^\d{1,18}$/.test(id) ? id : null);

/** A reply to the client; it shows in the app under «Подключить специалиста». */
export async function replyTicket(id: string, text: string, next: string): Promise<Result> {
  const staff = await assertStaff("tickets");
  if (!ticketId(id)) return { ok: false, message: "Обращение не найдено" };
  const body = text.trim().slice(0, 4000);
  if (body.length < 2) return { ok: false, message: "Напишите ответ" };
  const status = isTicketStatus(next) ? next : "waiting";
  const found = await tx(async (c) => {
    const { rows } = await c.query(
      `UPDATE support_tickets SET status = $2, updated_at = now(), first_reply_at = coalesce(first_reply_at, now()),
              assignee_id = coalesce(assignee_id, $3), closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END
        WHERE id = $1 RETURNING id`,
      [id, status, staff.id],
    );
    if (!rows[0]) return false;
    await c.query(
      `INSERT INTO support_messages (ticket_id, author, staff_id, staff_name, body) VALUES ($1, 'staff', $2, $3, $4)`,
      [id, staff.id, staff.name || staff.email, body],
    );
    await audit(staff, { action: "reply", entity: "ticket", entityId: id, summary: `Ответ в обращении #${id}, статус «${TICKET_STATUSES[status]}»` }, c);
    return true;
  });
  if (!found) return { ok: false, message: "Обращение не найдено" };
  revalidatePath("/admin/support", "layout");
  return { ok: true, message: "Ответ отправлен, клиент увидит его в приложении" };
}

export async function setTicketStatus(id: string, status: string): Promise<Result> {
  const staff = await assertStaff("tickets");
  if (!ticketId(id) || !isTicketStatus(status)) return { ok: false, message: "Неверный статус" };
  const row = await one<{ id: string }>(
    `UPDATE support_tickets SET status = $2, updated_at = now(), closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE NULL END
      WHERE id = $1 RETURNING id`,
    [id, status],
  );
  if (!row) return { ok: false, message: "Обращение не найдено" };
  await audit(staff, { action: "update", entity: "ticket", entityId: id, summary: `Обращение #${id}: «${TICKET_STATUSES[status]}»` });
  revalidatePath("/admin/support", "layout");
  return { ok: true };
}

export async function assignTicket(id: string, staffId: string | null): Promise<Result> {
  const staff = await assertStaff("tickets");
  if (!ticketId(id) || (staffId && !/^[0-9a-f-]{36}$/i.test(staffId))) return { ok: false, message: "Не найдено" };
  const row = await one<{ name: string | null }>(
    `WITH t AS (UPDATE support_tickets SET assignee_id = $2, updated_at = now(),
                       status = CASE WHEN status = 'new' AND $2::uuid IS NOT NULL THEN 'in_progress' ELSE status END
                 WHERE id = $1 RETURNING assignee_id)
     SELECT (SELECT coalesce(nullif(name, ''), email) FROM admin_users WHERE id = t.assignee_id) AS name FROM t`,
    [id, staffId],
  );
  if (!row) return { ok: false, message: "Обращение не найдено" };
  await audit(staff, { action: "assign", entity: "ticket", entityId: id, summary: `Обращение #${id}: ответственный ${row.name ?? "не назначен"}` });
  revalidatePath("/admin/support", "layout");
  return { ok: true };
}
