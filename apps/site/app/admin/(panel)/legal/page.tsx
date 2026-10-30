import type { Metadata } from "next";
import Link from "next/link";
import { can, requireStaff } from "@/lib/admin/auth";
import { CONSENT_KINDS, listConsents, SOURCES, STOP_DAYS, SUBJECTS, type Consent } from "@/lib/admin/consents";
import { one } from "@/lib/admin/db";
import { dateShort, dateTime } from "@/lib/admin/format";
import { LegalTabs } from "./Tabs";
import { WithdrawButton } from "./WithdrawButton";

export const metadata: Metadata = { title: "Документы и согласия" };
const PER_PAGE = 50;

function subjectHref(c: Consent): string | null {
  if (!c.subject_id) return null;
  if (c.subject_type === "client") return `/admin/app/users/${c.subject_id}`;
  if (c.subject_type === "lead") return `/admin/leads/${c.subject_id}`;
  return `/admin/partners/${c.subject_id}`;
}

export default async function ConsentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("consents");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = { q: sp.q, subject: sp.subject, kind: sp.kind, state: sp.state };
  const [{ rows, total }, stats] = await Promise.all([
    listConsents(filter, PER_PAGE, (page - 1) * PER_PAGE),
    one<{ active: number; people: number; due: number; overdue: number; next: Date | null }>(
      `SELECT count(*) FILTER (WHERE withdrawn_at IS NULL)::int AS active,
              count(DISTINCT (subject_type, subject_id)) FILTER (WHERE withdrawn_at IS NULL)::int AS people,
              count(DISTINCT (subject_type, subject_id)) FILTER (WHERE withdrawn_at IS NOT NULL AND stop_by >= CURRENT_DATE)::int AS due,
              count(DISTINCT (subject_type, subject_id)) FILTER (WHERE withdrawn_at IS NOT NULL AND stop_by >= CURRENT_DATE - 7 AND stop_by < CURRENT_DATE)::int AS overdue,
              min(stop_by) FILTER (WHERE withdrawn_at IS NOT NULL AND stop_by >= CURRENT_DATE) AS next
         FROM consents`,
    ),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Документы и согласия</h1>
          <p>Кто, когда и на какую версию документа дал согласие на обработку персональных данных. После отзыва обработку нужно прекратить в течение {STOP_DAYS} дней (152-ФЗ, ст. 21).</p>
        </div>
        <div className="a-head-actions"><a className="a-btn is-ghost" href={`/admin/legal/export${qs({ page: undefined })}`}>Выгрузить CSV</a></div>
      </div>
      <LegalTabs current="register" docs={can(staff, "legal")} />

      <div className="a-grid a-grid-3" style={{ marginBottom: 24 }}>
        <div className="a-card a-stat"><small>Действующих согласий</small><b>{stats?.active ?? 0}</b><span className="a-delta">у {stats?.people ?? 0} человек</span></div>
        <Link className={`a-card a-stat${stats?.due ? " is-hot" : ""}`} href="/admin/legal?state=due">
          <small>Отозваны, срок идёт</small><b>{stats?.due ?? 0}</b>
          <span className="a-delta">{stats?.next ? `ближайший срок ${dateShort(stats.next)}` : "сроков нет"}</span>
        </Link>
        <div className="a-card a-stat"><small>Срок истёк за неделю</small><b>{stats?.overdue ?? 0}</b><span className="a-delta">проверьте, что данные обезличены</span></div>
      </div>

      <form className="a-filters" method="get">
        <label className="a-field is-search"><span>Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Телефон, e-mail или номер" /></label>
        <label className="a-field"><span>Кто</span>
          <select className="a-input" name="subject" defaultValue={sp.subject ?? ""}>
            <option value="">Все</option>
            {Object.entries(SUBJECTS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="a-field"><span>Документ</span>
          <select className="a-input" name="kind" defaultValue={sp.kind ?? ""}>
            <option value="">Все</option>
            {Object.entries(CONSENT_KINDS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="a-field"><span>Состояние</span>
          <select className="a-input" name="state" defaultValue={sp.state ?? ""}>
            <option value="">Все</option>
            <option value="active">Действует</option>
            <option value="withdrawn">Отозвано</option>
            <option value="due">Отозвано, срок идёт</option>
          </select>
        </label>
        <button className="a-btn" type="submit">Показать</button>
      </form>

      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Кто</th><th>Документ</th><th>Дано</th><th>Откуда</th><th>Состояние</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const href = subjectHref(c);
                  return (
                    <tr key={c.id}>
                      <td className="a-cell-main">
                        {href ? <Link className="a-link" href={href}>{c.contact || "без контакта"}</Link> : c.contact || "—"}
                        <span className="sub">{SUBJECTS[c.subject_type]}</span>
                      </td>
                      <td data-label="Документ">{CONSENT_KINDS[c.kind] ?? c.kind}<span className="sub">версия {c.version}</span></td>
                      <td data-label="Дано" className="nowrap">{dateTime(c.accepted_at)}</td>
                      <td data-label="Откуда">{SOURCES[c.source] ?? c.source}{c.ip && <span className="sub">IP {c.ip}</span>}</td>
                      <td data-label="Состояние">
                        {c.withdrawn_at ? (
                          <>
                            <span className="a-badge is-off">отозвано {dateShort(c.withdrawn_at)}</span>
                            {c.stop_by && <span className="sub">прекратить обработку до {dateShort(c.stop_by)}</span>}
                            {c.withdraw_reason && <span className="sub">{c.withdraw_reason}</span>}
                          </>
                        ) : (
                          <>
                            <span className="a-badge s-done">действует</span>
                            {c.subject_id && <div style={{ marginTop: 8, position: "relative", zIndex: 1 }}><WithdrawButton subject={c.subject_type} subjectId={c.subject_id} /></div>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="a-empty"><b>Ничего не нашлось</b>Согласия появляются, когда клиент входит в приложение, оставляет заявку на сайте или подаёт анкету партнёра.</div>
        )}
      </div>
      {pages > 1 && (
        <div className="a-pager">
          <span>Всего {total} · страница {page} из {pages}</span>
          <nav>
            {page > 1 && <Link className="a-btn is-ghost is-small" href={`/admin/legal${qs({ page: String(page - 1) })}`}>← Новее</Link>}
            {page < pages && <Link className="a-btn is-ghost is-small" href={`/admin/legal${qs({ page: String(page + 1) })}`}>Старше →</Link>}
          </nav>
        </div>
      )}
    </>
  );
}
