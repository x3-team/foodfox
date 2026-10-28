import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LEGAL_FORMS, type LegalForm } from "@/lib/partner-program/contracts";
import { activePartnerId, partnerPool } from "@/lib/partner-program/db";
import { loadAct, type ActData } from "@/lib/partner-program/rewards";
import { PrintButton } from "./PrintButton";

/* «Акт выполненных работ» for a confirmed monthly report, to print, sign and send (БПИТ10.1.1). The customer's legal
   service will send the final form; until then the layout below carries the fields every act needs. */

export const dynamic = "force-dynamic";

const DEMO: ActData = {
  actNo: "FOX-202608-2", periodLabel: "август 2026", periodFrom: "01.08.2026", periodTo: "31.08.2026", status: "paid", amount: 16800,
  rows: Array.from({ length: 7 }, (_, i) => ({ number: `FOX-2026-0040${10 + i}`, date: `${String(4 + i * 3).padStart(2, "0")}.08.2026`, fee: 2400 })),
  partner: { fullName: "Ковалёва Мария Игоревна", legalForm: "sz", inn: "500100732259", passport: "4510 123456", postal: "123456, Москва, ул. Примерная, 1", bank: { recipient: "Ковалёва Мария Игоревна", bik: "044525225", account: "40817810000000000000", name: "Демо-банк" } },
};

const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

export default async function ActPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) notFound();
  const pool = await partnerPool().catch(() => null);
  const partnerId = pool ? await activePartnerId(pool, session.userId) : null;
  const act = partnerId ? await loadAct(partnerId, params.id) : DEMO;
  if (!act) notFound();
  const form = LEGAL_FORMS[act.partner.legalForm as LegalForm];

  return (
    <div className="min-h-screen bg-[#F8F9F6] px-4 py-8 text-[#0B0C08] print:bg-white print:p-0">
      <div className="mx-auto max-w-[794px] rounded-[22px] bg-white px-6 py-8 shadow-sm sm:px-12 print:rounded-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <p className="text-[13px] text-[#5C5E57]">Распечатайте, подпишите и отправьте скан в кабинете, а оригинал — Почтой России.</p>
          <PrintButton />
        </div>
        <h1 className="mt-6 text-center text-[20px] font-medium">Акт выполненных работ № {act.actNo}</h1>
        <p className="mt-1 text-center text-[14px]">за период с {act.periodFrom} по {act.periodTo}</p>
        <p className="mt-6 text-[14px] leading-6">
          Исполнитель: {act.partner.fullName}
          {form ? `, ${form.label.toLowerCase()}` : ""}, ИНН {act.partner.inn || "—"}
          {act.partner.legalForm === "fl" ? `, паспорт ${act.partner.passport || "—"}` : ""}.
          <br />
          Заказчик: ООО «АлексЛаб» (реквизиты по договору).
          <br />
          Основание: договор партнёра программы FOX Food Xplorer.
        </p>
        <p className="mt-4 text-[14px] leading-6">
          Исполнитель передал Заказчику сведения об анализах клиентов, подтверждённых по базе лаборатории, в количестве {act.rows.length} шт. Услуги оказаны в полном объёме, стороны претензий не имеют.
        </p>
        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#0B0C08] text-left">
              <th className="py-2 pr-2 font-medium">№</th>
              <th className="py-2 pr-2 font-medium">Id кода анализа</th>
              <th className="py-2 pr-2 font-medium">Дата</th>
              <th className="py-2 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {act.rows.map((r, i) => (
              <tr key={r.number} className="border-b border-[#E3E4DF]">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2">{r.number}</td>
                <td className="py-1.5 pr-2">{r.date}</td>
                <td className="py-1.5 text-right">{rub(r.fee)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-2 font-medium">Итого</td>
              <td className="py-2 text-right font-medium">{rub(act.amount)}</td>
            </tr>
          </tfoot>
        </table>
        {act.partner.legalForm === "fl" ? <p className="mt-2 text-[13px] text-[#5C5E57]">Из суммы вознаграждения Заказчик удерживает НДФЛ как налоговый агент.</p> : null}
        {act.partner.legalForm === "sz" ? <p className="mt-2 text-[13px] text-[#5C5E57]">НДС не облагается. Исполнитель применяет налог на профессиональный доход.</p> : null}
        {act.partner.bank ? (
          <p className="mt-4 text-[13px] leading-5">
            Реквизиты Исполнителя для оплаты: получатель {act.partner.bank.recipient}, счёт {act.partner.bank.account}, БИК {act.partner.bank.bik}
            {act.partner.bank.name ? `, ${act.partner.bank.name}` : ""}.
          </p>
        ) : null}
        <div className="mt-12 grid grid-cols-2 gap-10 text-[14px]">
          <div>
            <p className="font-medium">Исполнитель</p>
            <p className="mt-10 border-t border-[#0B0C08] pt-1 text-[12px] text-[#5C5E57]">подпись / {act.partner.fullName}</p>
          </div>
          <div>
            <p className="font-medium">Заказчик</p>
            <p className="mt-10 border-t border-[#0B0C08] pt-1 text-[12px] text-[#5C5E57]">подпись / М.П.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
