import { can, type Area, type Staff } from "@/lib/admin/auth";
import { queueWhere } from "@/lib/admin/app";
import { one } from "@/lib/admin/db";
import { plural as n } from "@/lib/admin/format";

/* «Что сделать сегодня» on the admin home: one line per queue the role can open, only when there is something in it.
   Each count is its own query with a catch, so a table that is not there yet (apps/web not migrated, a later
   migration) hides that line instead of breaking the page. */

export type TodayItem = { key: string; label: string; count: number; hint?: string; href: string; urgent?: boolean };

type Check = {
  key: string; area: Area; href: string; sql: string; params?: (staff: Staff) => unknown[];
  label: (n: number) => string; hint?: (row: Row) => string | undefined; urgent?: (row: Row) => boolean;
};
type Row = { n: number; late?: number; next?: string | null };

const CHECKS: Check[] = [
  {
    key: "tickets", area: "tickets", href: "/admin/support",
    sql: `SELECT count(*) FILTER (WHERE status IN ('new', 'in_progress'))::int AS n,
                 count(*) FILTER (WHERE status = 'new' AND first_reply_at IS NULL AND created_at < now() - interval '24 hours')::int AS late
            FROM support_tickets`,
    label: (c) => `${n(c, "обращение клиента ждёт", "обращения клиентов ждут", "обращений клиентов ждут")} ответа`,
    hint: (r) => (r.late ? `без ответа больше суток: ${r.late}` : undefined), urgent: (r) => Boolean(r.late),
  },
  {
    key: "leads", area: "leads", href: "/admin/leads?status=new",
    sql: `SELECT count(*) FILTER (WHERE status = 'new' AND kind NOT IN ('review', 'partner'))::int AS n,
                 count(*) FILTER (WHERE status = 'new' AND kind NOT IN ('review', 'partner') AND created_at < now() - interval '24 hours')::int AS late
            FROM leads`,
    label: (c) => `${n(c, "новая заявка", "новые заявки", "новых заявок")} с сайта`,
    hint: (r) => (r.late ? `старше суток: ${r.late}` : undefined), urgent: (r) => Boolean(r.late),
  },
  {
    key: "reports", area: "app_reports", href: "/admin/app/reports",
    sql: `SELECT count(*)::int AS n, count(*) FILTER (WHERE created_at < now() - interval '24 hours')::int AS late FROM reports WHERE ${queueWhere()}`,
    label: (c) => `${n(c, "отчёт ждёт", "отчёта ждут", "отчётов ждут")} проверки модератора`,
    hint: (r) => (r.late ? `в очереди больше суток: ${r.late}` : undefined), urgent: (r) => Boolean(r.late),
  },
  {
    key: "partner_applications", area: "partners", href: "/admin/partners?tab=applications",
    sql: `SELECT (SELECT count(*) FROM partners WHERE status = 'applied')::int
               + (SELECT count(*) FROM leads WHERE kind = 'partner' AND status IN ('new', 'in_progress'))::int AS n`,
    label: (c) => `${n(c, "анкета партнёра", "анкеты партнёров", "анкет партнёров")} на рассмотрении`,
  },
  {
    key: "partner_codes", area: "partners", href: "/admin/partners?tab=codes",
    sql: `SELECT count(*)::int AS n, count(*) FILTER (WHERE created_at < now() - interval '3 days')::int AS late FROM partner_reports WHERE status = 'review'`,
    label: (c) => `${n(c, "код анализа", "кода анализов", "кодов анализов")} от партнёров проверить`,
    hint: (r) => (r.late ? `ждут больше 3 дней: ${r.late}` : undefined), urgent: (r) => Boolean(r.late),
  },
  {
    key: "acts", area: "pd", href: "/admin/partners?tab=acts",
    sql: `SELECT count(*)::int AS n FROM partner_statements
           WHERE status = 'confirmed' AND (scan_received_at IS NOT NULL OR original_received_at IS NOT NULL)`,
    label: (c) => `${n(c, "акт со сканом ждёт", "акта со сканом ждут", "актов со сканом ждут")} оплаты`,
  },
  {
    key: "disputed", area: "pd", href: "/admin/partners?tab=acts",
    sql: `SELECT count(*)::int AS n FROM partner_statements WHERE status = 'disputed'`,
    label: (c) => `${n(c, "спорный акт", "спорных акта", "спорных актов")}: согласовать с партнёром`,
    urgent: () => true,
  },
  {
    key: "reviews", area: "reviews", href: "/admin/reviews",
    sql: `SELECT count(*)::int AS n FROM leads WHERE kind = 'review' AND status = 'new'`,
    label: (c) => `${n(c, "отзыв ждёт", "отзыва ждут", "отзывов ждут")} модерации`,
  },
  {
    key: "consents", area: "consents", href: "/admin/legal?state=due",
    sql: `SELECT count(DISTINCT (subject_type, subject_id))::int AS n, min(stop_by)::text AS next
            FROM consents WHERE withdrawn_at IS NOT NULL AND stop_by >= CURRENT_DATE AND stop_by < CURRENT_DATE + 7`,
    label: (c) => `${n(c, "отзыв согласия", "отзыва согласия", "отзывов согласия")}: срок прекращения обработки на этой неделе`,
    hint: (r) => (r.next ? `ближайший срок ${r.next.split("-").reverse().join(".")}` : undefined), urgent: () => true,
  },
  {
    key: "notify_errors", area: "notifications", href: "/admin/notifications",
    sql: `SELECT count(*)::int AS n FROM staff_notification_log WHERE NOT ok AND created_at > now() - interval '1 day'`,
    label: (c) => `${n(c, "уведомление не доставлено", "уведомления не доставлены", "уведомлений не доставлено")} за сутки`,
  },
  {
    key: "sms_errors", area: "notifications", href: "/admin/notifications",
    sql: `SELECT count(*)::int AS n FROM sms_log WHERE NOT ok AND created_at > now() - interval '1 day'`,
    label: (c) => `${n(c, "SMS с кодом не ушло", "SMS с кодом не ушли", "SMS с кодом не ушло")} за сутки`,
    urgent: (r) => r.n >= 5,
  },
];

export async function todayFor(staff: Staff): Promise<TodayItem[]> {
  const checks = CHECKS.filter((c) => can(staff, c.area));
  const rows = await Promise.all(checks.map((c) => one<Row>(c.sql, c.params?.(staff) ?? []).catch(() => null)));
  const items: TodayItem[] = [];
  checks.forEach((c, i) => {
    const row = rows[i];
    if (!row?.n) return;
    items.push({ key: c.key, label: c.label(row.n), count: row.n, hint: c.hint?.(row), href: c.href, urgent: c.urgent?.(row) ?? false });
  });
  // Overdue first, then the bigger queues.
  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.count - a.count);
}
