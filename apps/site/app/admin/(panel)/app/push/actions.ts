"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { isSegment, SEGMENTS, segmentClients } from "@/lib/admin/app";
import { one, tx } from "@/lib/admin/db";

export type SendResult = { ok: boolean; message?: string };

/**
 * Writes the message into the assistant chat of every client in the segment, as a system message from FOX.
 * Real push notifications need the app built with FCM/APNs: until then the channel is in-app only.
 */
export async function sendCampaign(input: { title: string; body: string; segment: string; expected: number }): Promise<SendResult> {
  const staff = await assertStaff("app_push");
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim();
  if (title.length < 3) return { ok: false, message: "Назовите рассылку, чтобы найти её в истории" };
  if (body.length < 5) return { ok: false, message: "Напишите текст сообщения" };
  if (body.length > 1000) return { ok: false, message: "Сообщение длиннее 1000 знаков" };
  if (!isSegment(input.segment)) return { ok: false, message: "Выберите получателей" };
  const segment = input.segment;
  const twice = await one("SELECT 1 FROM push_campaigns WHERE body = $1 AND segment = $2 AND status = 'sent' AND created_at > now() - interval '24 hours'", [body, segment]);
  if (twice) return { ok: false, message: "Это же сообщение уже уходило этим получателям за последние сутки" };

  const sent = await tx(async (db) => {
    const c = await db.query<{ id: string }>(
      `INSERT INTO push_campaigns (title, body, segment, channel, status, created_by, created_by_name)
       VALUES ($1, $2, $3, 'inapp', 'sent', $4, $5) RETURNING id`,
      [title, body, segment, staff.id, staff.name || staff.email],
    );
    const id = c.rows[0].id;
    const r = await db.query(
      `INSERT INTO chat_messages (thread_id, role, message_type, content, metadata)
       SELECT DISTINCT ON (t.client_id) t.id, 'assistant', 'system', $1, jsonb_build_object('campaign_id', $2::bigint)
         FROM chat_threads t WHERE t.client_id IN (${segmentClients(segment)})
        ORDER BY t.client_id, t.created_at DESC`,
      [body, id],
    );
    const n = r.rowCount ?? 0;
    await db.query("UPDATE push_campaigns SET recipients = $2, sent_at = now() WHERE id = $1", [id, n]);
    await audit(staff, {
      action: "send", entity: "push", entityId: id,
      summary: `Рассылка «${title}»: ${SEGMENTS[segment].label.toLowerCase()}, получателей ${n}`,
      after: { segment, recipients: n, length: body.length },
    }, db);
    return n;
  });
  revalidatePath("/admin/app/push");
  const drift = sent !== input.expected ? ` (на экране было ${input.expected}: список успел измениться)` : "";
  return { ok: true, message: sent ? `Отправлено в чат ${sent} клиентам${drift}` : "В сегменте никого нет: сообщение не отправлено никому" };
}
