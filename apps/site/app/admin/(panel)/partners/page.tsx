import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/admin/Icon";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { ago } from "@/lib/admin/format";
import { formatPhone, PARTNER_STATUSES, rub, type Partner } from "@/lib/admin/partners";
import { ApplicationActions } from "./ApplicationActions";

export const metadata: Metadata = { title: "Партнёры" };

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; tab?: string }> }) {
  await requireStaff("partners");
  const sp = await searchParams;
  const tab = sp.tab === "applications" ? "applications" : "partners";
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
        <Link href="/admin/partners?tab=applications" aria-current={tab === "applications" ? "page" : undefined}>Анкеты · {applications.length}</Link>
      </nav>

      {tab === "applications" ? (
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
                    <td data-label=""><ApplicationActions leadId={a.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="a-empty"><b>Новых анкет нет</b>Анкеты приходят со страницы /partner/apply.</div>}
        </div>
      ) : (
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
