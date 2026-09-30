import { PartnerShell } from "@/components/partner/PartnerShell";
import { partner } from "@/lib/partner-demo";

const rows = [
  ["Фамилия и имя", partner.fullName],
  ["Email", partner.email],
  ["Телефон", partner.phone],
  ["Специализация", partner.specialty],
  ["Налоговый статус и выплата", partner.payoutMethod],
  ["Реферальный код", partner.code],
];

export default function PartnerSettingsPage() {
  return (
    <PartnerShell>
      <h1 className="text-[34px] font-light leading-[38px] tracking-[-0.5px]">
        Настройки
      </h1>
      <p className="mt-1 text-[14px] text-[#5C5E57]">
        Контакты и способ выплаты из заявки партнёра
      </p>
      <div className="mt-6 max-w-3xl overflow-hidden rounded-[22px] border border-[#E3E4DF] bg-white">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-[#E3E4DF] px-6 py-4 last:border-b-0"
          >
            <span className="text-[14px] text-[#5C5E57]">{label}</span>
            <span className="text-[15px] font-medium">{value}</span>
          </div>
        ))}
      </div>
    </PartnerShell>
  );
}
