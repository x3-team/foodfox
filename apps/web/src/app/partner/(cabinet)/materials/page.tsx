"use client";

import { useState } from "react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import {
  allowedPhrases,
  forbiddenPhrases,
  materials,
  partner,
} from "@/lib/partner-demo";

export default function PartnerMaterialsPage() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${partner.link}`);
    } catch {
      // Toast still confirms the action in the demo.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function download(title: string) {
    const body = [
      title,
      "",
      "Демо-материал кабинета партнёра FOX.",
      `Реферальная ссылка: https://${partner.link}`,
      "",
      "Можно говорить:",
      ...allowedPhrases,
      "",
      "Нельзя говорить:",
      ...forbiddenPhrases,
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PartnerShell>
      <h1 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">
        Материалы для рекомендации теста
      </h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        Готовые файлы и формулировки, согласованные с compliance FOX
      </p>
      <section className="mt-6 flex flex-col items-start gap-5 rounded-[22px] border border-[#E3E4DF] bg-white px-4 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
        <img
          src="/partner/referral-qr.svg"
          alt="QR реферальной ссылки"
          width={104}
          height={104}
          className="size-[104px] rounded-xl border border-[#E3E4DF] bg-white p-2"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[#5C5E57]">Ваша реферальная ссылка</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 break-all rounded-xl border border-[#E3E4DF] px-4 py-3 text-[16px] font-medium">
              {partner.link}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full bg-[#21251D] px-5 py-3 text-[14px] font-medium text-[#F8F9F6]"
            >
              {copied ? "Скопировано" : "Копировать"}
            </button>
            <a
              href="/partner/referral-qr.svg"
              download="KOVALEVA-24-qr.svg"
              className="rounded-full border border-[#E3E4DF] px-5 py-3 text-[14px] font-medium"
            >
              Скачать QR
            </a>
          </div>
          <p className="mt-3 text-[13px] text-[#5C5E57]">
            Клиент переходит по ссылке → записывается на тест → отчёт
            автоматически привязывается к вам без ручного ввода номера
          </p>
        </div>
      </section>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {materials.map((item) => (
          <article
            key={item.title}
            className="flex h-[164px] flex-col rounded-[20px] border border-[#E3E4DF] bg-white p-5"
          >
            <div className="size-10 rounded-xl bg-[#EDF3D9]" />
            <h2 className="mt-3 text-[15px] font-medium leading-5">{item.title}</h2>
            <p className="mt-1 text-[12px] text-[#5C5E57]">{item.meta}</p>
            <button
              type="button"
              onClick={() => download(item.title)}
              className="mt-auto text-left text-[14px] font-medium text-[#4A6B1F]"
            >
              Скачать
            </button>
          </article>
        ))}
      </div>
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <PhraseCard title="Можно говорить" items={allowedPhrases} tone="green" />
        <PhraseCard title="Нельзя говорить" items={forbiddenPhrases} tone="red" />
      </section>
    </PartnerShell>
  );
}

function PhraseCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "red";
}) {
  const color = tone === "green" ? "bg-[#4A6B1F]" : "bg-[#A03A22]";
  return (
    <article className="rounded-[20px] border border-[#E3E4DF] bg-white p-5">
      <h2 className="text-[16px] font-medium">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[14px] leading-5">
            <span className={`mt-2 size-1.5 shrink-0 rounded-full ${color}`} />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
