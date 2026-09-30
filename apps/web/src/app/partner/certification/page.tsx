import { PartnerShell } from "@/components/partner/PartnerShell";
import { partner } from "@/lib/partner-demo";

const opened = [
  "Получите реферальный код и QR",
  "Сможете загружать отчёты клиентов",
  "Откроется раздел начислений и выплат",
];

export default function PartnerCertificationPage() {
  return (
    <PartnerShell>
      <h1 className="text-[34px] font-light leading-[38px] tracking-[-0.5px]">
        Сертификация
      </h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        {partner.period} · статус партнёра: {partner.status}
      </p>
      <div className="mt-6 grid max-w-3xl gap-4">
        <article className="rounded-[22px] bg-[#21251D] px-6 py-5 text-[#F8F9F6]">
          <p className="text-[13px] text-[#A8AAA3]">Номер сертификата курса FOX</p>
          <p className="mt-2 text-[28px] font-light text-[#E7F551]">
            {partner.certificate}
          </p>
          <p className="mt-2 text-[14px] text-[#A8AAA3]">
            {partner.specialty} · {partner.fullName}
          </p>
        </article>
        <article className="rounded-[22px] border border-[#E3E4DF] bg-white px-6 py-5">
          <h2 className="text-[16px] font-medium">Что открыто после одобрения</h2>
          <ul className="mt-3 space-y-3">
            {opened.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14px]">
                <span className="size-1.5 rounded-full bg-[#4A6B1F]" />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </PartnerShell>
  );
}
