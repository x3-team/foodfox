import type { SessionData } from "@/lib/auth";
import { formatPhone } from "@/lib/otp";
import * as demo from "@/lib/partner-demo";
import type { PartnerReport, ReportStatus } from "@/lib/partner-demo";
import { LEGAL_FORMS, type LegalForm } from "@/lib/partner-program/contracts";
import { partnerPool } from "@/lib/partner-program/db";
import { loadStatements, type Statement } from "@/lib/partner-program/rewards";

/* What the partner cabinet shows. A partner an admin created in the site admin (/admin/partners, tables from
   packages/database/migrations/005_site_admin.sql) sees their own profile, reports and payouts; the demo login and
   any database without that partner keep the demo data of lib/partner-demo.ts. */

export type PartnerProfile = typeof demo.partner;
export type Payout = { date: string; period: string; count: string; method: string; amount: string; status: "Выплачено" | "В обработке" };
export type Kpi = { label: string; value: string; hint: string; tone: "dark" | "light" };
/** The cards on «Начисления и выплаты». */
export type Money = { available: string; availableHint: string; review: string; reviewHint: string; paidLabel: string; paid: string; paidHint: string };
export type PartnerData = {
  source: "db" | "demo"; partner: PartnerProfile; reports: PartnerReport[]; payouts: Payout[]; kpis: Kpi[]; money: Money; fee: number;
  /** Monthly reports and acts (БПИТ10.1.1). */
  statements: Statement[];
};

const DEMO: PartnerData = { source: "demo", partner: demo.partner, reports: demo.reports, payouts: demo.payouts, kpis: demo.kpis, money: demo.money, fee: 2400, statements: demo.statements };

const STATUS: Record<string, string> = { applied: "анкета на рассмотрении", approved: "одобрен", certified: "сертифицирован", blocked: "заблокирован", rejected: "отклонён" };
const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
const day = (d: Date | string | null) => (d ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow" }).format(new Date(d)) : "—");
const month = (d: Date) => new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", month: "long", year: "numeric" }).format(d).replace(" г.", "");

export async function loadPartnerData(session: SessionData): Promise<PartnerData> {
  try {
    const pool = await partnerPool();
    if (!pool) return DEMO;
    const user = await pool.query(`SELECT phone FROM users WHERE id = $1`, [session.userId]);
    const phone = user.rows[0]?.phone as string | undefined;
    if (!phone) return DEMO;
    const found = await pool.query(`SELECT * FROM partners WHERE phone = $1 AND status IN ('approved', 'certified')`, [phone]);
    const p = found.rows[0];
    if (!p) return DEMO;
    const feeRow = await pool.query(`SELECT value FROM site_content WHERE key = 'prices.partnerFee'`);
    const fee = (p.fee as number | null) ?? Number(feeRow.rows[0]?.value ?? 2400);
    const reportRows = await pool.query(`SELECT * FROM partner_reports WHERE partner_id = $1 ORDER BY coalesce(test_date, created_at::date) DESC, id DESC`, [p.id]);
    const payoutRows = await pool.query(`SELECT * FROM partner_payouts WHERE partner_id = $1 ORDER BY created_at DESC`, [p.id]);

    const reports: PartnerReport[] = reportRows.rows.map((r) => ({
      number: r.report_number,
      client: r.client_name || "—",
      date: day(r.test_date ?? r.created_at),
      status: r.status as ReportStatus,
      fee: r.status === "credited" ? rub(r.fee) : "—",
      lab: r.lab || undefined,
    }));
    const now = new Date();
    const credited = reportRows.rows.filter((r) => r.status === "credited");
    const thisMonth = credited.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const earned = credited.reduce((sum, r) => sum + (r.fee as number), 0);
    const paidOrPending = payoutRows.rows.reduce((sum, r) => sum + (r.amount as number), 0);
    const review = reportRows.rows.filter((r) => r.status === "review").length;
    const available = Math.max(0, earned - paidOrPending);
    const paidThisYear = payoutRows.rows.filter((r) => r.status === "paid" && new Date(r.paid_at).getFullYear() === now.getFullYear());
    const nextPayout = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 5 ? 1 : 0), 5);
    const statements = await loadStatements(pool, p.id);
    const code = (p.promo_code as string | null) ?? "";

    return {
      source: "db",
      fee,
      statements,
      partner: {
        name: greetingName(String(p.full_name)),
        fullName: p.full_name,
        email: p.email || "—",
        phone: formatPhone(p.phone),
        specialty: p.specialty || "—",
        certificate: p.certificate_no || "—",
        status: STATUS[p.status] ?? p.status,
        period: month(now).replace(/^./, (c) => c.toUpperCase()),
        code: code || "—",
        link: code ? `foodfox.ru/t/${code}` : "—",
        payoutMethod: p.payout_method || (p.legal_form ? LEGAL_FORMS[p.legal_form as LegalForm].short : "не указан"),
      },
      reports,
      payouts: payoutRows.rows.map((r) => ({
        date: r.status === "paid" ? day(r.paid_at) : "—",
        period: r.period,
        count: String(r.reports),
        method: r.status === "paid" ? p.payout_method || "—" : "Запрос на вывод отправлен",
        amount: rub(r.amount),
        status: r.status === "paid" ? "Выплачено" : "В обработке",
      })),
      kpis: [
        { label: `Начислено за ${month(now).split(" ")[0]}`, value: rub(thisMonth.reduce((s, r) => s + (r.fee as number), 0)), hint: `${thisMonth.length} отч. в этом месяце`, tone: "dark" },
        { label: "Клиентов всего", value: String(reportRows.rows.length), hint: `${credited.length} с начислением`, tone: "light" },
        { label: "На проверке", value: String(review), hint: "отчёта ждут подтверждения", tone: "light" },
        { label: "Доступно к выплате", value: rub(available), hint: "выплаты — 5 числа", tone: "light" },
      ],
      money: {
        available: rub(available),
        availableHint: `ближайшая выплата ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(nextPayout)}`,
        review: rub(review * fee),
        reviewHint: `${review} ${review === 1 ? "отчёт ждёт" : "отчётов ждут"} подтверждения лаборатории`,
        paidLabel: `Выплачено за ${now.getFullYear()}`,
        paid: rub(paidThisYear.reduce((s, r) => s + (r.amount as number), 0)),
        paidHint: `выплат: ${paidThisYear.length} · отчётов: ${paidThisYear.reduce((s, r) => s + (r.reports as number), 0)}`,
      },
    };
  } catch (error) {
    console.error("[partner] cabinet data", error);
    return DEMO;
  }
}

const PATRONYMIC = /(вич|вна|ична|инична|оглы|кызы)$/i;
const SURNAME = /(ова|ева|ёва|ина|ына|ская|цкая|ов|ев|ёв|ин|ын|ский|цкий|ской|енко|ко|ук|юк|ич|дзе|швили|ян|янц)$/i;

/* Given names with a surname-like ending, so «Ирина Аудитова» does not greet «Аудитова». */
const NAME_LIKE_SURNAME = new Set([
  "ирина", "марина", "галина", "алина", "полина", "кристина", "карина", "арина", "регина", "валентина", "ангелина",
  "нина", "алевтина", "антонина", "екатерина", "ольга", "вениамин", "валентин", "константин", "веньямин", "мартин",
]);

/** How the cabinet greets the partner. The applications store «Фамилия Имя Отчество», but the admin may type
    «Имя Фамилия»: with a patronymic it is «Имя Отчество», otherwise the word that does not look like a surname. */
export function greetingName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  const p = words.findIndex((w, i) => i > 0 && PATRONYMIC.test(w));
  if (p > 0) return `${words[p - 1]} ${words[p]}`;
  const [a, b] = words;
  if (NAME_LIKE_SURNAME.has(a.toLowerCase())) return a;
  if (NAME_LIKE_SURNAME.has(b.toLowerCase())) return b;
  if (SURNAME.test(b) && !SURNAME.test(a)) return a;
  return b;
}
