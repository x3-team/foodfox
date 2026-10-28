/* Lead types the site forms send to /api/lead (kind) and the statuses a manager moves them through. */

export const LEAD_KINDS: Record<string, string> = {
  contact: "Обратная связь",
  course: "Запись на курс",
  review: "Отзыв",
  "city-wait": "Ждут в городе",
  "book-wait": "Запись на тест",
  partner: "Анкета партнёра",
  partner_doctor: "Врач хочет в партнёры",
};

export const kindLabel = (kind: string) => LEAD_KINDS[kind] ?? kind;

export const LEAD_STATUSES = {
  new: "Новая",
  in_progress: "В работе",
  done: "Закрыта",
  spam: "Спам",
} as const;
export type LeadStatus = keyof typeof LEAD_STATUSES;
export const isLeadStatus = (value: string): value is LeadStatus => value in LEAD_STATUSES;

export type Lead = {
  id: string;
  created_at: Date;
  updated_at: Date;
  kind: string;
  status: LeadStatus;
  name: string;
  email: string;
  phone: string;
  city: string;
  company: string;
  message: string;
  payload: Record<string, unknown>;
  page: string;
  utm: Record<string, string>;
  ip: string | null;
  user_agent: string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  closed_at: Date | null;
};

const text = (value: unknown, max = 2000) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Splits a form body into the columns the list filters on; the whole body is kept in payload as well. */
export function normalizeLead(body: Record<string, unknown>) {
  const contact = text(body.contact, 200);
  const looksLikeMail = contact.includes("@");
  const email = text(body.email, 200) || (looksLikeMail ? contact : "");
  const phone = text(body.phone, 60) || (!looksLikeMail ? contact : "");
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body).slice(0, 40)) {
    if (["string", "number", "boolean"].includes(typeof value)) payload[key.slice(0, 60)] = typeof value === "string" ? value.slice(0, 4000) : value;
  }
  return {
    kind: text(body.kind, 40) || "contact",
    name: text(body.name, 200),
    email,
    phone,
    city: text(body.city, 120),
    company: text(body.company, 200),
    message: text(body.text, 4000) || text(body.message, 4000),
    payload,
  };
}

export function utmFrom(url: string): Record<string, string> {
  try {
    const params = new URL(url).searchParams;
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const value = params.get(key);
      if (value) utm[key.slice(4)] = value.slice(0, 200);
    }
    return utm;
  } catch {
    return {};
  }
}

export function pagePath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.slice(0, 300);
  } catch {
    return "";
  }
}
