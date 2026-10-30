import type { Pool } from "pg";

/* Client requests to a live specialist (packages/database/migrations/015_support_tickets.sql). The admin side is
   apps/site /admin/support; staff replies come back here and show in the app. */

export const TOPICS = ["report", "plan", "tech", "other"] as const;
export type Topic = (typeof TOPICS)[number];
const MAX_OPEN = 5;
const MAX_BODY = 4000;

export type TicketMessage = { id: string; author: "client" | "staff"; staffName: string | null; body: string; createdAt: string };
export type Ticket = {
  id: string; topic: Topic; status: string; subject: string; createdAt: string; updatedAt: string; unread: number;
  messages?: TicketMessage[];
};

export function cleanBody(value: unknown): string {
  const body = typeof value === "string" ? value.trim().slice(0, MAX_BODY) : "";
  if (body.length < 2) throw new SupportError("Напишите вопрос");
  return body;
}

export class SupportError extends Error {}

const toTicket = (r: Record<string, unknown>): Ticket => ({
  id: String(r.id), topic: r.topic as Topic, status: String(r.status), subject: String(r.subject ?? ""),
  createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(),
  unread: Number(r.unread ?? 0),
});

export async function listTickets(pool: Pool, userId: string): Promise<Ticket[]> {
  const { rows } = await pool.query(
    `SELECT t.*, (SELECT count(*)::int FROM support_messages m WHERE m.ticket_id = t.id AND m.author = 'staff' AND m.read_at IS NULL) AS unread
       FROM support_tickets t WHERE t.user_id = $1 ORDER BY t.updated_at DESC LIMIT 50`,
    [userId],
  );
  return rows.map(toTicket);
}

/** One ticket with its conversation; opening it marks the staff replies as read. */
export async function getTicket(pool: Pool, userId: string, id: string): Promise<Ticket | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const { rows } = await pool.query(`SELECT t.*, 0 AS unread FROM support_tickets t WHERE t.id = $1 AND t.user_id = $2`, [id, userId]);
  if (!rows[0]) return null;
  await pool.query(`UPDATE support_messages SET read_at = now() WHERE ticket_id = $1 AND author = 'staff' AND read_at IS NULL`, [id]);
  const messages = await pool.query(
    `SELECT id, author, staff_name, body, created_at FROM support_messages WHERE ticket_id = $1 ORDER BY created_at`,
    [id],
  );
  return {
    ...toTicket(rows[0]),
    messages: messages.rows.map((m) => ({
      id: String(m.id), author: m.author, staffName: m.staff_name, body: m.body, createdAt: new Date(m.created_at).toISOString(),
    })),
  };
}

export async function createTicket(pool: Pool, userId: string, topic: unknown, message: unknown): Promise<Ticket> {
  const body = cleanBody(message);
  const t: Topic = TOPICS.includes(topic as Topic) ? (topic as Topic) : "other";
  const open = await pool.query(`SELECT count(*)::int AS n FROM support_tickets WHERE user_id = $1 AND status <> 'closed'`, [userId]);
  if (open.rows[0].n >= MAX_OPEN) throw new SupportError("У вас уже есть открытые обращения. Допишите в одно из них");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO support_tickets (user_id, topic, subject) VALUES ($1, $2, $3) RETURNING *, 0 AS unread`,
      [userId, t, body.split("\n")[0].slice(0, 120)],
    );
    await client.query(`INSERT INTO support_messages (ticket_id, author, body) VALUES ($1, 'client', $2)`, [rows[0].id, body]);
    await client.query("COMMIT");
    return toTicket(rows[0]);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** The client writes again; a closed or waiting ticket goes back to the staff queue. */
export async function addClientMessage(pool: Pool, userId: string, id: string, message: unknown): Promise<boolean> {
  const body = cleanBody(message);
  if (!/^\d{1,18}$/.test(id)) return false;
  const { rows } = await pool.query(
    `UPDATE support_tickets SET client_at = now(), updated_at = now(), closed_at = NULL,
            status = CASE WHEN status IN ('closed', 'waiting') THEN (CASE WHEN first_reply_at IS NULL THEN 'new' ELSE 'in_progress' END) ELSE status END
      WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId],
  );
  if (!rows[0]) return false;
  await pool.query(`INSERT INTO support_messages (ticket_id, author, body) VALUES ($1, 'client', $2)`, [id, body]);
  return true;
}
