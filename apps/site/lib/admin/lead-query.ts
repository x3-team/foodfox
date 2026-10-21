import { isLeadStatus } from "./leads";

export type LeadFilters = { status?: string; kind?: string; q?: string; from?: string; to?: string; mine?: string; page?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** WHERE clause and params for the lead list, its counters and the CSV export, from the URL filters. */
export function leadWhere(f: LeadFilters, staffId: string, skip: Array<keyof LeadFilters> = []) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (!skip.includes("status")) {
    if (f.status && isLeadStatus(f.status)) add("l.status = ?", f.status);
    else if (f.status !== "all") where.push("l.status <> 'spam'");
  }
  if (f.kind && !skip.includes("kind")) add("l.kind = ?", f.kind);
  if (f.mine === "1") add("l.assignee_id = ?", staffId);
  if (f.from && DATE.test(f.from)) add("(l.created_at AT TIME ZONE 'Europe/Moscow')::date >= ?::date", f.from);
  if (f.to && DATE.test(f.to)) add("(l.created_at AT TIME ZONE 'Europe/Moscow')::date <= ?::date", f.to);
  const text = f.q?.trim();
  if (text) {
    const id = /^#?(\d{1,12})$/.exec(text);
    if (id) add("l.id = ?", id[1]);
    else {
      params.push(`%${text.replace(/[%_\\]/g, "\\$&")}%`);
      const p = `$${params.length}`;
      where.push(`(l.name ILIKE ${p} OR l.email ILIKE ${p} OR l.phone ILIKE ${p} OR l.city ILIKE ${p} OR l.company ILIKE ${p} OR l.message ILIKE ${p})`);
    }
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export function filtersFrom(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const pick = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);
  return { status: pick("status"), kind: pick("kind"), q: pick("q"), from: pick("from"), to: pick("to"), mine: pick("mine"), page: pick("page") };
}

export function filterQuery(f: LeadFilters, patch: Partial<LeadFilters> = {}): string {
  const merged = { ...f, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
  const s = params.toString();
  return s ? `?${s}` : "";
}
