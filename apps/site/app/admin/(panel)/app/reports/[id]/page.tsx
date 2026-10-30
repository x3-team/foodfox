import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { Icon } from "@/components/admin/Icon";
import { can, requireStaff } from "@/lib/admin/auth";
import { appReady, clientTitle, isReportStatus, LOW_CONFIDENCE, maskPhone, medicalGrant, REPORT_STATUSES } from "@/lib/admin/app";
import { one, q } from "@/lib/admin/db";
import { ago, dateTime } from "@/lib/admin/format";
import { MedicalGate } from "../../MedicalGate";
import { ReportDecision } from "./ReportDecision";
import { ResultsEditor, type ResultRow } from "./ResultsEditor";

export const metadata: Metadata = { title: "Отчёт" };

type Report = {
  id: string; status: string; parse_confidence: string | null; created_at: Date; updated_at: Date; reviewed_at: Date | null;
  review_note: string | null; storage_key: string | null; metadata: Record<string, unknown>;
  client_id: string; user_id: string; phone: string | null; display_name: string | null; reviewer: string | null;
};

const ACTION_LABEL: Record<string, string> = { approve: "Одобрил", reject: "Отклонил", edit: "Исправил", reprocess: "Обработал заново", note: "Заметка" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("app_reports");
  if (!(await appReady())) return <AppNotReady />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = await one<Report>(
    `SELECT r.id, r.status, r.parse_confidence, r.created_at, r.updated_at, r.reviewed_at, r.review_note, r.storage_key, r.metadata,
            r.client_id, c.user_id, u.phone, c.display_name, a.name AS reviewer
       FROM reports r JOIN clients c ON c.id = r.client_id LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN admin_users a ON a.id = r.reviewed_by
      WHERE r.id = $1`,
    [id],
  );
  if (!r) notFound();
  const [stats] = await q<{ total: number; red: number; yellow: number; green: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE zone = 'red')::int AS red,
            count(*) FILTER (WHERE zone = 'yellow')::int AS yellow, count(*) FILTER (WHERE zone = 'green')::int AS green
       FROM test_results WHERE report_id = $1`,
    [id],
  );
  const history = await q<{ id: string; staff_name: string; action: string; note: string; created_at: Date }>(
    "SELECT id, staff_name, action, note, created_at FROM report_reviews WHERE report_id = $1 ORDER BY created_at DESC LIMIT 30",
    [id],
  );
  const grant = can(staff, "medical") ? await medicalGrant(staff, r.client_id) : null;
  const results: ResultRow[] = grant
    ? (await q<{ id: string; fox_name: string; value_ug_ml: string | null; is_floor_value: boolean; zone: "red" | "yellow" | "green" }>(
        `SELECT t.id, f.fox_name, t.value_ug_ml, t.is_floor_value, t.zone
           FROM test_results t JOIN food_items f ON f.id = t.food_item_id WHERE t.report_id = $1
          ORDER BY CASE t.zone WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END, t.value_ug_ml DESC NULLS LAST, f.fox_name`,
        [id],
      )).map((x) => ({ id: x.id, name: x.fox_name, value: x.value_ug_ml == null ? null : Number(x.value_ug_ml), floor: x.is_floor_value, zone: x.zone }))
    : [];

  const conf = r.parse_confidence == null ? null : Number(r.parse_confidence);
  const meta = r.metadata ?? {};
  const warnings = Array.isArray(meta.warnings) ? (meta.warnings as unknown[]).map(String) : [];
  const verified = typeof meta.verified_in_pdf === "number" ? meta.verified_in_pdf : null;

  return (
    <>
      <nav className="a-crumbs"><Link href="/admin/app/reports"><Icon name="back" size={16} /> Отчёты</Link></nav>
      <div className="a-head">
        <div>
          <h1>Отчёт от {dateTime(r.created_at)}</h1>
          <p>
            {isReportStatus(r.status) ? <span className={`a-badge rp-${r.status}`}>{REPORT_STATUSES[r.status]}</span> : r.status}
            <span className="muted"> · <Link className="a-link" href={`/admin/app/users/${r.user_id}`}>{clientTitle(r.display_name, r.phone)}</Link> {maskPhone(r.phone)}</span>
          </p>
        </div>
      </div>

      <div className="a-grid a-grid-side" style={{ marginBottom: 24 }}>
        <div className="a-stack">
          <section className="a-card">
            <div className="a-card-head"><h2>Распознавание</h2></div>
            <div className="a-grid a-grid-4" style={{ gap: 12 }}>
              <div className="a-mini-stat"><small>Антигенов</small><b className="num">{stats.total}{verified ? <span className="faint"> / {verified}</span> : null}</b></div>
              <div className="a-mini-stat"><small>Уверенность</small><b className="num" style={conf !== null && conf < LOW_CONFIDENCE ? { color: "var(--a-red)" } : undefined}>{conf === null ? "—" : `${Math.round(conf * 100)}%`}</b></div>
              <div className="a-mini-stat"><small>PDF</small><b>{r.storage_key ? "сохранён" : "нет"}</b></div>
              <div className="a-mini-stat"><small>Обновлён</small><b>{ago(r.updated_at)}</b></div>
            </div>
            {typeof meta.last_error === "string" && <div className="a-error" style={{ marginTop: 16 }}>{meta.last_error}</div>}
            {warnings.length > 0 && <ul className="a-warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            {r.reviewed_at && <p className="muted" style={{ marginTop: 16 }}>Проверен {dateTime(r.reviewed_at)}{r.reviewer ? `, ${r.reviewer}` : ""}{r.review_note ? `: ${r.review_note}` : ""}</p>}
          </section>
        </div>
        <div className="a-stack">
          <ReportDecision id={r.id} status={r.status} hasPdf={Boolean(r.storage_key)} />
        </div>
      </div>
      <div className="a-stack">
        <MedicalGate userId={r.user_id} allowed={can(staff, "medical")} mfa={staff.mfa} grantUntil={grant ? grant.toISOString() : null} hasData={stats.total > 0 || Boolean(r.storage_key)}>
          <div className="a-zones">
            <div className="a-zone z-red"><b>{stats.red}</b><small>красная</small></div>
            <div className="a-zone z-yellow"><b>{stats.yellow}</b><small>жёлтая</small></div>
            <div className="a-zone z-green"><b>{stats.green}</b><small>зелёная</small></div>
          </div>
          <ResultsEditor reportId={r.id} rows={results} pdfUrl={r.storage_key ? `/admin/api/app/reports/${r.id}/pdf` : null} />
        </MedicalGate>
        <section className="a-card">
          <div className="a-card-head"><h2>История проверки</h2></div>
          {history.length ? (
            <ul className="a-timeline">
              {history.map((h) => (
                <li key={h.id} className={h.action === "note" ? "is-note" : undefined}>
                  <div><small>{h.staff_name} · {ACTION_LABEL[h.action] ?? h.action} · {ago(h.created_at)}</small>{h.note && <p>{h.note}</p>}</div>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Отчёт ещё никто не проверял.</p>}
        </section>
      </div>
    </>
  );
}
