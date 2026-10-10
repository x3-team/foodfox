import Link from "next/link";
import { AuthSplit } from "@/components/partner/AuthSplit";
import { partner } from "@/lib/partner-demo";

const next = [
  "Получите реферальный код и QR",
  "Сможете загружать отчёты клиентов",
  "Откроется раздел начислений и выплат",
];

export default function PartnerPendingPage() {
  return (
    <AuthSplit>
      <div className="flex flex-col items-center text-center">
        <div className="flex size-[76px] items-center justify-center rounded-full bg-[#FBF0D8]">
          <span className="inline-block size-8 animate-[partner-clock_2s_linear_infinite] rounded-full border-2 border-[#8A6416] border-t-transparent" />
        </div>
        <h2 className="mt-6 text-[32px] font-light leading-9 tracking-[-0.5px]">
          Заявка на рассмотрении
        </h2>
        <p className="mt-2 text-[14px] leading-[22px] text-[#5C5E57]">
          Проверяем сертификацию и контакты. Обычно занимает до 1 рабочего дня
          — пришлём решение на {partner.email}
        </p>
        <div className="mt-5 w-full rounded-[20px] bg-[#D7D8CD] px-5 py-[18px] text-left">
          <p className="text-[14px] font-medium">Что будет после одобрения</p>
          <ul className="mt-3 space-y-3">
            {next.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14px]">
                <span className="size-1.5 rounded-full bg-[#4A6B1F]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/partner/materials"
          className="mt-5 flex w-full items-center justify-center rounded-full border border-[#E3E4DF] bg-white py-4 text-[15px] font-medium"
        >
          Скачать материалы о тесте
        </Link>
        <Link href="/partner" className="mt-4 text-[14px] font-medium text-[#4A6B1F]">
          Войти
        </Link>
      </div>
      <style>{`
        @keyframes partner-clock { to { transform: rotate(360deg); } }
      `}</style>
    </AuthSplit>
  );
}
