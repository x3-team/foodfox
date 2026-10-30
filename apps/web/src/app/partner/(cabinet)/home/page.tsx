"use client";

import { useState } from "react";
import { AddAnalysis } from "@/components/partner/AddAnalysis";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { ReportTable } from "@/components/partner/ReportTable";
import { usePartnerData } from "@/components/partner/PartnerData";

export default function PartnerHomePage() {
  const { partner, kpis } = usePartnerData();
  const [uploadOpen, setUploadOpen] = useState(false);

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
          onClick={() => setUploadOpen(true)}
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
        <ReportTable />
      </div>

      {uploadOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Добавить анализ клиента"
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-[#0B0C08]/40 px-4 py-6 sm:px-6 sm:pt-[105px]"
          onKeyDown={(event) => event.key === "Escape" && setUploadOpen(false)}
        >
          {/* The same form as on «Отчёты»: it really sends the analysis (POST /api/partner/analyses). */}
          <AddAnalysis dialog onClose={() => setUploadOpen(false)} />
        </div>
      ) : null}
    </PartnerShell>
  );
}
