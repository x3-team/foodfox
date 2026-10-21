import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/auth";
import { one, q } from "@/lib/admin/db";
import { formatPhone, rub, type Partner } from "@/lib/admin/partners";
import { DEFAULTS } from "@/lib/cms/registry";
import { PartnerForm } from "./PartnerForm";
import { PartnerMoney } from "./PartnerMoney";

export const metadata: Metadata = { title: "Партнёр" };

export default async function PartnerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("partners");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const partner = isNew ? null : await one<Partner>("SELECT * FROM partners WHERE id = $1", [id]);
  if (!isNew && !partner) notFound();
  const feeRow = await one<{ value: number }>("SELECT value FROM site_content WHERE key = 'prices.partnerFee'");
  const defaultFee = Number(feeRow?.value ?? DEFAULTS["prices.partnerFee"]);
  const reports = partner ? await q<{ id: string; report_number: string; client_name: string; lab: string; test_date: Date | null; status: "credited" | "review" | "missing"; fee: number; created_at: Date }>(
    "SELECT * FROM partner_reports WHERE partner_id = $1 ORDER BY created_at DESC", [id],
  ) : [];
  const payouts = partner ? await q<{ id: string; period: string; amount: number; reports: number; status: "pending" | "paid"; paid_at: Date | null; created_at: Date }>(
    "SELECT * FROM partner_payouts WHERE partner_id = $1 ORDER BY created_at DESC", [id],
  ) : [];
  const earned = reports.filter((r) => r.status === "credited").reduce((s, r) => s + r.fee, 0);
  const paid = payouts.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="a-crumbs"><Link href="/admin/partners">Партнёры</Link><span>/</span><span>{partner?.full_name ?? "Новый"}</span></div>
      <div className="a-head">
        <div>
          <h1>{partner?.full_name ?? "Новый партнёр"}</h1>
          {partner && <p>{formatPhone(partner.phone)}{partner.promo_code ? ` · промокод ${partner.promo_code}` : ""}</p>}
        </div>
      </div>
      {partner && (
        <div className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
          <div className="a-card a-stat"><small>Отчётов клиентов</small><b>{reports.length}</b><span className="a-delta">на проверке: {reports.filter((r) => r.status === "review").length}</span></div>
          <div className="a-card a-stat"><small>Начислено</small><b>{rub(earned)}</b><span className="a-delta">по {rub(partner.fee ?? defaultFee)} за отчёт</span></div>
          <div className="a-card a-stat"><small>Выплачено и в обработке</small><b>{rub(paid)}</b><span className="a-delta">выплат: {payouts.length}</span></div>
          <div className={`a-card a-stat${earned - paid > 0 ? " is-hot" : ""}`}><small>К выплате</small><b>{rub(Math.max(0, earned - paid))}</b><span className="a-delta">начислено минус выплаты</span></div>
        </div>
      )}
      <div className="a-grid a-grid-side">
        <div className="a-stack">
          {partner ? (
            <PartnerMoney
              partnerId={partner.id}
              available={Math.max(0, earned - paid)}
              unpaidReports={Math.max(0, reports.filter((r) => r.status === "credited").length - payouts.reduce((s, p) => s + p.reports, 0))}
              reports={reports.map((r) => ({ id: r.id, number: r.report_number, client: r.client_name, lab: r.lab, date: r.test_date ? new Date(r.test_date).toISOString().slice(0, 10) : "", status: r.status, fee: r.fee }))}
              payouts={payouts.map((p) => ({ id: p.id, period: p.period, amount: p.amount, reports: p.reports, status: p.status, paidAt: p.paid_at ? new Date(p.paid_at).toISOString() : null }))}
            />
          ) : (
            <div className="a-card"><p className="muted">После сохранения карточки здесь появятся отчёты клиентов, начисления и выплаты.</p></div>
          )}
        </div>
        <PartnerForm
          id={partner?.id ?? null}
          defaultFee={defaultFee}
          initial={{
            full_name: partner?.full_name ?? "", phone: partner ? formatPhone(partner.phone) : "", email: partner?.email ?? "", specialty: partner?.specialty ?? "",
            city: partner?.city ?? "", status: partner?.status ?? "approved", promo_code: partner?.promo_code ?? "", certificate_no: partner?.certificate_no ?? "",
            payout_method: partner?.payout_method ?? "", fee: partner?.fee == null ? "" : String(partner.fee), notes: partner?.notes ?? "",
          }}
        />
      </div>
    </>
  );
}
