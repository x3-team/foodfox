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
  const [leaving, setLeaving] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(partner.code);
    } catch {
      // The demo still confirms the copy when the clipboard is blocked.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/partner?manual=1";
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9F6] text-[#0B0C08] xl:flex">
      <header className="bg-[#21251D] px-4 py-4 text-[#F8F9F6] xl:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/partner/home" className="min-w-0">
            <div className="text-[22px] font-extrabold tracking-[1px]">FOX</div>
            <div className="text-[12px] text-[#A8AAA3]">Кабинет партнёра</div>
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-[13px] text-[#F8F9F6]"
          >
            {leaving ? "Выход…" : "Выйти"}
          </button>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} pathname={pathname} compact />
          ))}
        </nav>
        <button
          type="button"
          onClick={copyCode}
          className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-left"
        >
          <div className="text-[12px] text-[#A8AAA3]">Ваш реферальный код</div>
          <div className="mt-1 text-[16px] font-medium text-[#E7F551]">
            {copied ? "Скопировано" : partner.code}
          </div>
        </button>
      </header>

      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col justify-between bg-[#21251D] px-6 pb-7 pt-8 xl:flex">
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
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} pathname={pathname} />
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={copyCode}
            className="w-full rounded-2xl bg-white/10 p-4 text-left"
          >
            <div className="text-[12px] text-[#A8AAA3]">Ваш реферальный код</div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
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
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="w-full rounded-xl px-3.5 py-[11px] text-left text-[14px] text-[#A8AAA3] hover:bg-white/5"
          >
            {leaving ? "Выход…" : "Выйти"}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 xl:px-10 xl:py-8">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  pathname,
  compact = false,
}: {
  href: string;
  pathname: string;
  compact?: boolean;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  if (compact) {
    return (
      <Link
        href={href}
        className={`rounded-full px-3 py-1.5 text-[13px] ${
          active ? "bg-white/15 font-medium text-[#F8F9F6]" : "text-[#A8AAA3]"
        }`}
      >
        {nav.find((item) => item.href === href)?.label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`rounded-xl px-3.5 py-[11px] text-[14px] ${
        active
          ? "bg-white/10 font-medium text-[#F8F9F6]"
          : "text-[#A8AAA3] hover:bg-white/5"
      }`}
    >
      {nav.find((item) => item.href === href)?.label}
    </Link>
  );
}
