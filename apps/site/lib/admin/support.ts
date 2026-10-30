/* Client requests to a live specialist (migrations/015_support_tickets.sql); the app side is apps/web/src/lib/support.ts. */

export const TICKET_TOPICS = { report: "Отчёт и результаты", plan: "План питания", tech: "Приложение", other: "Другое" } as const;
export const TICKET_STATUSES = { new: "Новое", in_progress: "В работе", waiting: "Ждём клиента", closed: "Закрыто" } as const;
export type TicketStatus = keyof typeof TICKET_STATUSES;
export const isTicketStatus = (v: string): v is TicketStatus => v in TICKET_STATUSES;

/** Hours a client may wait for the first answer before the ticket turns red in the queue. */
export const FIRST_REPLY_HOURS = 24;

export type TicketRow = {
  id: string; user_id: string; topic: keyof typeof TICKET_TOPICS; status: TicketStatus; subject: string; assignee_id: string | null;
  assignee_name: string | null; created_at: Date; updated_at: Date; client_at: Date; first_reply_at: Date | null; closed_at: Date | null;
  phone: string | null; unread: number; messages: number;
};
