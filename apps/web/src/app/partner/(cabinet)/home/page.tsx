"use client";

import { useState } from "react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { ReportTable } from "@/components/partner/ReportTable";
import { kpis, partner, reports } from "@/lib/partner-demo";

const sample = reports[0];

export default function PartnerHomePage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [consent, setConsent] = useState(true);
  const [fileName, setFileName] = useState("FOX_отчёт_Соколова.pdf");

  function closeAll() {
    setUploadOpen(false);
    setConfirmed(false);
  }

  return (
    <PartnerShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">
            Добрый день, {partner.name}
          </h1>
          <p className="mt-1 text-[14px] text-[#5C5E57]">
            {partner.period} · статус партнёра: {partner.status}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmed(false);
            setUploadOpen(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#E7F551] py-[15px] pl-[22px] pr-6 text-[15px] font-medium sm:w-auto"
        >
          <img src="/partner/icon-plus.svg" alt="" width={18} height={18} className="size-[18px]" />
          Добавить отчёт клиента
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`rounded-[20px] px-[22px] py-5 ${
              kpi.tone === "dark"
                ? "bg-[#21251D] text-[#A8AAA3]"
                : "border border-[#E3E4DF] bg-white text-[#5C5E57]"
            }`}
          >
            <p className="text-[13px]">{kpi.label}</p>
            <p
              className={`mt-2 text-[32px] font-light leading-9 tracking-[-0.5px] ${
                kpi.tone === "dark" ? "text-[#E7F551]" : "text-[#0B0C08]"
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-2 text-[12px]">{kpi.hint}</p>
          </article>
        ))}
      </div>

      <div className="mt-6">
        <ReportTable highlightNumber={confirmed ? sample.number : undefined} />
      </div>

      {uploadOpen || confirmed ? (
        <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-[#0B0C08]/40 px-4 py-6 sm:px-6 sm:pt-[105px]">
          {confirmed ? (
            <Confirmed
              onMore={() => {
                setConfirmed(false);
                setUploadOpen(true);
              }}
              onDone={closeAll}
            />
          ) : (
            <Upload
              fileName={fileName}
              consent={consent}
              onConsent={setConsent}
              onFile={setFileName}
              onCancel={closeAll}
              onSubmit={() => {
                if (!consent) return;
                setUploadOpen(false);
                setConfirmed(true);
              }}
            />
          )}
        </div>
      ) : null}
    </PartnerShell>
  );
}

function Upload({
  fileName,
  consent,
  onConsent,
  onFile,
  onCancel,
  onSubmit,
}: {
  fileName: string;
  consent: boolean;
  onConsent: (value: boolean) => void;
  onFile: (name: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const fields = [
    ["Номер отчёта", sample.number],
    ["Дата теста", sample.date],
    ["Лаборатория", sample.lab ?? "Инвитро"],
    ["Антигенов в отчёте", "285"],
  ];

  return (
    <div className="w-full max-w-[560px] rounded-[24px] bg-[#F8F9F6] px-5 pb-8 pt-8 shadow-xl sm:px-9">
      <h2 className="text-[28px] font-light leading-8 tracking-[-0.5px]">
        Загрузить отчёт клиента
      </h2>
      <p className="mt-2 text-[14px] leading-5 text-[#5C5E57]">
        Загрузите PDF, который прислал клиент. Мы сверим номер с базой
        лаборатории и начислим вознаграждение.
      </p>
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E3E4DF] bg-white px-[18px] py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all text-[15px] font-medium">{fileName}</p>
          <p className="mt-0.5 text-[12px] text-[#5C5E57]">
            1,2 МБ · 6 страниц · загружен
          </p>
        </div>
        <label className="cursor-pointer text-[14px] font-medium text-[#4A6B1F]">
          Заменить
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file.name);
            }}
          />
        </label>
      </div>
      <div className="mt-4 rounded-[20px] border border-[#E3E4DF] bg-white px-[19px] py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] font-medium">Распознано из отчёта</p>
          <span className="text-[12px] font-medium text-[#4A6B1F]">
            есть в базе лаборатории
          </span>
        </div>
        <dl className="space-y-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 text-[14px] sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-[#5C5E57]">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <label className="mt-4 block text-[13px] font-medium text-[#5C5E57]">
        Email или телефон клиента — для приглашения в приложение
        <input
          className="mt-1.5 w-full rounded-[14px] border border-[#E3E4DF] bg-white px-[18px] py-3.5 text-[15px] text-[#0B0C08]"
          defaultValue="+7 999 123-45-67"
        />
      </label>
      <label className="mt-4 flex items-start gap-3 text-[14px] leading-5">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsent(event.target.checked)}
          className="mt-0.5 size-[22px] accent-[#21251D]"
        />
        Клиент согласен на передачу отчёта партнёру и привязку к коду (152-ФЗ)
      </label>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="px-4 text-[15px] text-[#5C5E57]">
          Отмена
        </button>
        <button
          type="button"
          disabled={!consent}
          onClick={onSubmit}
          className="rounded-full bg-[#21251D] px-6 py-3.5 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-40"
        >
          Отправить на проверку
        </button>
      </div>
    </div>
  );
}

function Confirmed({
  onMore,
  onDone,
}: {
  onMore: () => void;
  onDone: () => void;
}) {
  return (
    <div className="w-full max-w-[560px] rounded-[24px] bg-[#F8F9F6] px-5 pb-8 pt-8 text-center shadow-xl sm:px-9">
      <div className="mx-auto flex size-[72px] items-center justify-center rounded-full bg-[#EDF3D9] text-[32px] text-[#4A6B1F]">
        ✓
      </div>
      <h2 className="mt-5 text-[28px] font-light tracking-[-0.5px]">
        Отчёт подтверждён
      </h2>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        {sample.number} · {sample.client} · {sample.lab}
      </p>
      <div className="mt-5 rounded-[20px] bg-[#21251D] px-6 py-5 text-left text-[#F8F9F6]">
        <p className="text-[13px] text-[#A8AAA3]">Начислено вознаграждение</p>
        <p className="mt-1 text-[32px] font-light text-[#E7F551]">2 400 ₽</p>
        <p className="mt-1 text-[13px] text-[#A8AAA3]">
          Выплата 5 октября · баланс 21 600 ₽
        </p>
      </div>
      <div className="mt-4 rounded-[20px] bg-[#D7D8CD] px-[18px] py-4 text-left">
        <p className="text-[14px] font-medium">Что дальше</p>
        <ul className="mt-3 space-y-2.5 text-[14px]">
          {[
            "Клиенту отправлено приглашение в приложение",
            "После первого входа он появится в вашем списке",
            "Вы увидите прогресс протокола с его согласия",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#4A6B1F]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onMore}
          className="rounded-full border border-[#E3E4DF] bg-white py-3.5 text-[15px] font-medium"
        >
          Добавить ещё
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-[#21251D] py-3.5 text-[15px] font-medium text-[#F8F9F6]"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
