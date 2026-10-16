"use client";

import { useState } from "react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { payouts } from "@/lib/partner-demo";

export default function PartnerPayoutsPage() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  function requestPayout() {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setNote("Запрос на сентябрь уже отправлен — 19 200 ₽ в обработке.");
    }, 700);
  }

  return (
    <PartnerShell>
      <h1 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">
        Начисления и выплаты
      </h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        Выплаты 5-го числа каждого месяца · минимальная сумма вывода 3 000 ₽
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <article className="rounded-[22px] bg-[#21251D] px-[26px] py-6 text-[#F8F9F6]">
          <p className="text-[13px] text-[#A8AAA3]">Доступно к выплате</p>
          <p className="mt-3 text-[40px] font-light leading-none text-[#E7F551]">
            19 200 ₽
          </p>
          <p className="mt-3 max-w-[280px] text-[13px] leading-5 text-[#A8AAA3]">
            8 подтверждённых отчётов · ближайшая выплата 5 октября
          </p>
          <button
            type="button"
            onClick={requestPayout}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-[#E7F551] py-3.5 text-[15px] font-medium text-[#0B0C08] disabled:opacity-70"
          >
            {busy ? "Отправляем…" : "Запросить вывод"}
          </button>
          {note ? <p className="mt-3 text-[12px] text-[#E7F551]">{note}</p> : null}
        </article>
        {[
          ["На проверке", "7 200 ₽", "3 отчёта ждут подтверждения лаборатории"],
          ["Выплачено за 2026", "142 800 ₽", "за 9 месяцев · 59 отчётов"],
          ["Ставка", "2 400 ₽", "за подтверждённый отчёт"],
        ].map(([label, value, hint]) => (
          <article
            key={label}
            className="rounded-[22px] border border-[#E3E4DF] bg-white px-[23px] py-6"
          >
            <p className="text-[13px] text-[#5C5E57]">{label}</p>
            <p className="mt-3 text-[28px] font-light leading-none">{value}</p>
            <p className="mt-3 text-[13px] leading-5 text-[#5C5E57]">{hint}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-[22px] border border-[#E3E4DF] bg-white px-4 pb-4 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[17px] font-medium">История выплат</h2>
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            <span className="rounded-full bg-[#21251D] px-3.5 py-2 text-[#F8F9F6]">
              2026
            </span>
            <span className="rounded-full border border-[#E3E4DF] px-4 py-2">
              Все годы
            </span>
            <button
              type="button"
              className="font-medium text-[#4A6B1F]"
              onClick={() => downloadCsv()}
            >
              Скачать акт · CSV
            </button>
          </div>
        </div>
        <ul className="space-y-3 xl:hidden">
          {payouts.map((row) => (
            <li key={row.period} className="rounded-2xl border border-[#E3E4DF] px-4 py-3 text-[14px]">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{row.period}</span>
                <span className="shrink-0 font-medium">{row.amount}</span>
              </div>
              <p className="mt-1 text-[#5C5E57]">
                {row.date} · {row.count} отчётов
              </p>
              <p className="mt-1 break-words text-[#5C5E57]">{row.method}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  row.status === "Выплачено"
                    ? "bg-[#EDF3D9] text-[#4A6B1F]"
                    : "bg-[#FBF0D8] text-[#8A6416]"
                }`}
              >
                {row.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="hidden xl:grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] xl:border-b xl:border-[#E3E4DF] xl:pb-2.5 xl:text-[12px] xl:font-medium xl:text-[#5C5E57]">
          {["Дата", "Период", "Отчётов", "Способ", "Сумма", "Статус"].map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {payouts.map((row) => (
          <div
            key={`${row.period}-desktop`}
            className="hidden grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] items-center border-b border-[#E3E4DF] py-[15px] text-[14px] xl:grid"
          >
            <span className="text-[#5C5E57]">{row.date}</span>
            <span>{row.period}</span>
            <span>{row.count}</span>
            <span className="min-w-0 break-words pr-3 text-[#5C5E57]">{row.method}</span>
            <span className="font-medium">{row.amount}</span>
            <span>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  row.status === "Выплачено"
                    ? "bg-[#EDF3D9] text-[#4A6B1F]"
                    : "bg-[#FBF0D8] text-[#8A6416]"
                }`}
              >
                {row.status}
              </span>
            </span>
          </div>
        ))}
        <p className="pt-4 text-[13px] leading-5 text-[#5C5E57]">
          Выплата проводится после подтверждения отчёта лабораторией. Статус
          самозанятого или ИП обязателен — акт формируется автоматически и
          доступен к скачиванию.
        </p>
      </div>
    </PartnerShell>
  );
}

function downloadCsv() {
  const header = "Дата,Период,Отчётов,Способ,Сумма,Статус";
  const body = payouts
    .map((row) =>
      [row.date, row.period, row.count, row.method, row.amount, row.status].join(","),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foodfox-payouts-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
}
