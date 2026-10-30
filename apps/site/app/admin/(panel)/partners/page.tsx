import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { can, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { ago } from "@/lib/admin/format";
import { formatPhone, LEGAL_FORMS, monthOf, PARTNER_STATUSES, rub, STATEMENT_STATUSES, type LegalForm, type Partner, type StatementStatus } from "@/lib/admin/partners";
import { ApplicationActions } from "./ApplicationActions";

export const metadata: Metadata = { title: "Партнёры" };

const TABS = ["partners", "applications", "codes", "acts", "doctors"] as const;
type Tab = (typeof TABS)[number];

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; tab?: string }> }) {
  const staff = await requireStaff("partners");
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "partners";
  // Finished months turn into monthly reports here too, not only when a partner opens the cabinet.
  await q("SELECT partner_close_months()");
  const where: string[] = [];
  const params: unknown[] = [];
  if (sp.status && sp.status in PARTNER_STATUSES) { params.push(sp.status); where.push(`p.status = $${params.length}`); }
  if (sp.q?.trim()) { params.push(`%${sp.q.trim()}%`); where.push(`(p.full_name ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.email ILIKE $${params.length} OR p.promo_code ILIKE $${params.length})`); }
  const partners = await q<Partner & { reports: number; earned: number; paid: number }>(
    `SELECT p.*, (SELECT count(*)::int FROM partner_reports r WHERE r.partner_id = p.id) AS reports,
            (SELECT coalesce(sum(fee), 0)::int FROM partner_reports r WHERE r.partner_id = p.id AND r.status = 'credited') AS earned,
            (SELECT coalesce(sum(amount), 0)::int FROM partner_payouts o WHERE o.partner_id = p.id) AS paid
       FROM partners p ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY p.created_at DESC`,
    params,
  );
  const counts = await q<{ status: string; n: number }>("SELECT status, count(*)::int AS n FROM partners GROUP BY status");
  const applications = await q<{ id: string; name: string; phone: string; email: string; city: string; payload: Record<string, unknown>; created_at: Date }>(
    "SELECT id, name, phone, email, city, payload, created_at FROM leads WHERE kind = 'partner' AND status IN ('new', 'in_progress') ORDER BY created_at DESC",
  );
  const total = counts.reduce((s, c) => s + c.n, 0);
  // БПИТ12.8: applications with documents wait for the contract steps; БПИТ10.1.1: codes to check, acts to process.
  const applied = await q<Partner & { legal_form: LegalForm | null; contract_agreed_at: Date | null; erp_registered_at: Date | null }>(
    "SELECT * FROM partners WHERE status = 'applied' ORDER BY updated_at DESC",
  );
  const codes = await q<{ id: string; report_number: string; client_name: string; created_at: Date; photo_doc_id: string | null; partner_id: string; full_name: string }>(
    `SELECT r.id, r.report_number, r.client_name, r.created_at, r.photo_doc_id, r.partner_id, p.full_name
       FROM partner_reports r JOIN partners p ON p.id = r.partner_id WHERE r.status = 'review' ORDER BY r.created_at`,
  );
  const acts = await q<{ id: string; period: string; amount: number; reports: number; status: StatementStatus; partner_id: string; full_name: string; scan_received_at: Date | null; original_received_at: Date | null; act_returned_at: Date | null }>(
    `SELECT s.id, s.period::text AS period, s.amount, s.reports, s.status, s.partner_id, p.full_name, s.scan_received_at, s.original_received_at, s.act_returned_at
       FROM partner_statements s JOIN partners p ON p.id = s.partner_id
      WHERE s.status IN ('disputed', 'confirmed') OR (s.status = 'paid' AND s.act_returned_at IS NULL) OR s.status = 'sent'
      ORDER BY CASE s.status WHEN 'disputed' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END, s.period`,
  );
  const doctors = await q<{ id: string; phone: string; status: string; created_at: Date }>(
    "SELECT id, phone, status, created_at FROM leads WHERE kind = 'partner_doctor' AND status IN ('new', 'in_progress') ORDER BY created_at DESC",
  );
  const actsToDo = acts.filter((a) => a.status !== "sent").length;

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Партнёры</h1>
          <p>Специалисты, которые приводят клиентов: анкеты, промокоды, привязанные отчёты, начисления и выплаты. Одобренный партнёр входит в <a className="a-link" href="/partner" target="_blank" rel="noreferrer">кабинет</a> по своему телефону.</p>
        </div>
        <div className="a-head-actions"><Link className="a-btn is-lime" href="/admin/partners/new"><Icon name="plus" /> Добавить партнёра</Link></div>
      </div>
      <nav className="a-tabs-inline">
        <Link href="/admin/partners" aria-current={tab === "partners" ? "page" : undefined}>Партнёры · {total}</Link>
        <Link href="/admin/partners?tab=applications" aria-current={tab === "applications" ? "page" : undefined}>Анкеты · {applied.length + applications.length}</Link>
        <Link href="/admin/partners?tab=codes" aria-current={tab === "codes" ? "page" : undefined}>Проверка кодов · {codes.length}</Link>
        <Link href="/admin/partners?tab=acts" aria-current={tab === "acts" ? "page" : undefined}>Отчёты и акты · {actsToDo}</Link>
        <Link href="/admin/partners?tab=doctors" aria-current={tab === "doctors" ? "page" : undefined}>Врачи · {doctors.length}</Link>
      </nav>

      {tab === "codes" && (
        <div className="a-table-wrap">
          {codes.length ? (
            <table className="a-table">
              <thead><tr><th>Id кода</th><th>Партнёр</th><th>Фото</th><th>Прислан</th></tr></thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="a-cell-main"><b style={{ fontWeight: 500 }}>{c.report_number}</b><span className="sub">{c.client_name}</span></td>
                    <td data-label="Партнёр"><Link className="a-link" href={`/admin/partners/${c.partner_id}`}>{c.full_name}</Link></td>
                    <td data-label="Фото">{c.photo_doc_id ? <a className="a-link" href={`/admin/api/partner-doc/${c.photo_doc_id}`} target="_blank" rel="noreferrer">открыть</a> : "—"}</td>
                    <td data-label="Прислан" className="nowrap">{ago(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="a-empty"><b>Все коды проверены</b>Здесь появляются анализы, которые прислали партнёры. Пока нет доступа к Raptor, код сверяют вручную и ставят статус в карточке партнёра.</div>}
        </div>
      )}

      {tab === "acts" && (
        <div className="a-table-wrap">
          {acts.length ? (
            <table className="a-table">
              <thead><tr><th>Партнёр</th><th>Месяц</th><th>Сумма</th><th>Статус</th><th>Что дальше</th></tr></thead>
              <tbody>
                {acts.map((a) => (
                  <tr key={a.id}>
                    <td className="a-cell-main"><Link href={`/admin/partners/${a.partner_id}`}>{a.full_name}</Link></td>
                    <td data-label="Месяц" style={{ textTransform: "capitalize" }}>{monthOf(a.period)}</td>
                    <td data-label="Сумма" className="num nowrap">{rub(a.amount)}<span className="sub">{a.reports} анализ.</span></td>
                    <td data-label="Статус">{STATEMENT_STATUSES[a.status]}</td>
                    <td data-label="Что дальше">{
                      a.status === "sent" ? "ждём ответ партнёра"
                      : a.status === "disputed" ? "согласовать с партнёром"
                      : a.status === "confirmed" ? (a.scan_received_at || a.original_received_at ? "оплатить" : "ждём скан или оригинал акта")
                      : "отправить партнёру его экземпляр"
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="a-empty"><b>Отчётов нет</b>Отчёт за месяц появляется после его окончания, если у партнёра есть подтверждённые анализы.</div>}
        </div>
      )}

      {tab === "doctors" && (
        <div className="a-table-wrap">
          {doctors.length ? (
            <table className="a-table">
              <thead><tr><th>Телефон</th><th>Пришёл</th><th></th></tr></thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td className="a-cell-main"><Link href={`/admin/leads/${d.id}`}>{d.phone}</Link><span className="sub">#{d.id}</span></td>
                    <td data-label="Пришёл" className="nowrap">{ago(d.created_at)}</td>
                    <td data-label="">связаться и подключить к программе для врачей</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="a-empty"><b>Новых обращений нет</b>Врачи, ответившие «Да» на первый вопрос анкеты, попадают сюда и в заявки.</div>}
        </div>
      )}

      {tab === "applications" && applied.length ? (
        <div className="a-table-wrap" style={{ marginBottom: 16 }}>
          <table className="a-table">
            <thead><tr><th>Кандидат</th><th>Форма</th><th>Договор</th><th>Обновлена</th></tr></thead>
            <tbody>
              {applied.map((p) => (
                <tr key={p.id}>
                  <td className="a-cell-main"><Link href={`/admin/partners/${p.id}`}>{p.full_name}</Link><span className="sub">{formatPhone(p.phone)}</span></td>
                  <td data-label="Форма">{p.legal_form ? LEGAL_FORMS[p.legal_form] : "—"}</td>
                  <td data-label="Договор">{p.erp_registered_at ? "заведён в 1С:ERP" : p.contract_agreed_at ? "согласован в 1С:ДО" : "на согласовании"}</td>
                  <td data-label="Обновлена" className="nowrap">{ago(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab !== "applications" ? null : (
        <div className="a-table-wrap">
          {applications.length ? (
            <table className="a-table">
              <thead><tr><th>Кандидат</th><th>Контакты</th><th>Специализация</th><th>Пришла</th><th></th></tr></thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td className="a-cell-main"><Link href={`/admin/leads/${a.id}`}>{a.name || "Без имени"}</Link><span className="sub">#{a.id}</span></td>
                    <td data-label="Контакты">{a.phone}<span className="sub">{a.email}</span></td>
                    <td data-label="Специализация">{String(a.payload.specialty ?? "") || "—"}<span className="sub">{String(a.payload.certificate ?? "")}</span></td>
                    <td data-label="Пришла" className="nowrap">{ago(a.created_at)}</td>
                    <td data-label=""><ApplicationActions leadId={a.id} canDelete={can(staff, "users")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : applied.length ? null : <div className="a-empty"><b>Новых анкет нет</b>Анкеты приходят со страницы /partner/apply.</div>}
        </div>
      )}

      {tab === "partners" && (
        <>
          <div className="a-chips">
            <Link className="a-chip" aria-current={!sp.status ? "true" : undefined} href="/admin/partners">Все <i>{total}</i></Link>
            {Object.entries(PARTNER_STATUSES).map(([id, label]) => (
              <Link key={id} className="a-chip" aria-current={sp.status === id ? "true" : undefined} href={`/admin/partners?status=${id}`}>{label} <i>{counts.find((c) => c.status === id)?.n ?? 0}</i></Link>
            ))}
          </div>
          <form className="a-filters" method="get">
            {sp.status && <input type="hidden" name="status" value={sp.status} />}
            <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Имя, телефон, почта или промокод" /></label>
            <button className="a-btn" type="submit">Найти</button>
          </form>
          <div className="a-table-wrap">
            {partners.length ? (
              <table className="a-table">
                <thead><tr><th>Партнёр</th><th>Телефон</th><th>Статус</th><th>Промокод</th><th>Отчётов</th><th>Начислено / выплачено</th></tr></thead>
                <tbody>
                  {partners.map((p) => (
                    <tr key={p.id}>
                      <td className="a-cell-main"><Link href={`/admin/partners/${p.id}`}>{p.full_name}</Link><span className="sub">{[p.specialty, p.city].filter(Boolean).join(" · ")}</span></td>
                      <td data-label="Телефон" className="nowrap">{formatPhone(p.phone)}</td>
                      <td data-label="Статус"><span className={`a-badge p-${p.status}`}>{PARTNER_STATUSES[p.status]}</span></td>
                      <td data-label="Промокод">{p.promo_code ?? "—"}</td>
                      <td data-label="Отчётов" className="num">{p.reports}</td>
                      <td data-label="Начислено / выплачено" className="num nowrap">{rub(p.earned)} / {rub(p.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="a-empty"><b>Партнёров пока нет</b>Добавьте партнёра вручную или одобрите анкету.</div>}
          </div>
        </>
      )}
    </>
  );
}
