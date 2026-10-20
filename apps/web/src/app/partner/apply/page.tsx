"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplit, Field, inputClass } from "@/components/partner/AuthSplit";
import { partner } from "@/lib/partner-demo";

export default function PartnerApplyPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(true);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) return;
    router.push("/partner/pending");
  }

  return (
    <AuthSplit>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-[34px] font-light leading-[38px] tracking-[-0.5px]">
            Стать партнёром
          </h2>
          <p className="mt-1.5 text-[14px] text-[#5C5E57]">
            Заявку рассматриваем до 1 рабочего дня
          </p>
        </div>
        <Field label="Фамилия и имя">
          <input className={inputClass} defaultValue={partner.fullName} />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Email">
            <input className={inputClass} defaultValue={partner.email} />
          </Field>
          <Field label="Телефон">
            <input className={inputClass} defaultValue={partner.phone} />
          </Field>
        </div>
        <Field label="Специализация">
          <input className={inputClass} defaultValue={partner.specialty} />
        </Field>
        <Field label="Номер сертификата курса FOX — если есть">
          <input className={inputClass} defaultValue={partner.certificate} />
        </Field>
        <label className="flex items-start gap-3 text-[14px] leading-[18px] text-[#0B0C08]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-[22px] accent-[#21251D]"
          />
          <span>
            Соглашаюсь с условиями партнёрской программы и обработкой данных
          </span>
        </label>
        <button
          type="submit"
          disabled={!consent}
          className="rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-40"
        >
          Отправить заявку
        </button>
        <p className="text-center text-[14px] text-[#5C5E57]">
          Уже есть аккаунт?{" "}
          <Link href="/partner" className="font-medium text-[#4A6B1F]">
            Войти
          </Link>
        </p>
      </form>
    </AuthSplit>
  );
}
