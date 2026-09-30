"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { partner } from "@/lib/partner-demo";

const nav = [
  { href: "/partner/home", label: "Дашборд" },
  { href: "/partner/reports", label: "Отчёты клиентов" },
  { href: "/partner/payouts", label: "Начисления и выплаты" },
  { href: "/partner/materials", label: "Материалы" },
  { href: "/partner/certification", label: "Сертификация" },
  { href: "/partner/settings", label: "Настройки" },
];

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(partner.code);
    } catch {
      // The demo still confirms the copy when the clipboard is blocked.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9F6] text-[#0B0C08]">
      <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col justify-between bg-[#21251D] px-6 pb-7 pt-8">
        <div>
          <Link href="/partner/home" className="block">
            <div className="text-[24px] font-extrabold tracking-[1px] text-[#F8F9F6]">
              FOX
            </div>
            <div className="mt-0.5 text-[12px] text-[#A8AAA3]">
              Кабинет партнёра
            </div>
          </Link>
          <nav className="mt-7 flex flex-col gap-1">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3.5 py-[11px] text-[14px] ${
                    active
                      ? "bg-white/10 font-medium text-[#F8F9F6]"
                      : "text-[#A8AAA3] hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="w-full rounded-2xl bg-white/10 p-4 text-left"
        >
          <div className="text-[12px] text-[#A8AAA3]">Ваш реферальный код</div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[16px] font-medium text-[#E7F551]">
              {copied ? "Скопировано" : partner.code}
            </span>
            <img
              src="/partner/icon-copy.svg"
              alt=""
              width={16}
              height={16}
              className="size-4"
            />
          </div>
        </button>
      </aside>
      <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
