"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplit, Field, inputClass } from "@/components/partner/AuthSplit";

export default function PartnerApplyPage() {
  const router = useRouter();
  const [consent, setConsent] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // The application lands in the site admin (/admin/partners) as a lead of kind «partner»; /api/lead belongs to the
  // marketing site on the same domain (nginx routes it there).
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || sending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!String(data.name ?? "").trim() || String(data.phone ?? "").replace(/\D/g, "").length < 10) {
      setError("Укажите имя и телефон — по нему вы будете входить в кабинет");
      return;
    }
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "partner", ...data }),
      });
      if (!response.ok) throw new Error(String(response.status));
      router.push("/partner/pending");
    } catch {
      setError("Не отправилось. Проверьте соединение и попробуйте ещё раз");
      setSending(false);
    }
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
          <input className={inputClass} name="name" autoComplete="name" placeholder="Ковалёва Мария" required />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Email">
            <input className={inputClass} name="email" type="email" autoComplete="email" placeholder="name@clinic.ru" />
          </Field>
          <Field label="Телефон">
            <input className={inputClass} name="phone" type="tel" autoComplete="tel" placeholder="+7 900 000-00-00" required />
          </Field>
        </div>
        <Field label="Специализация">
          <input className={inputClass} name="specialty" placeholder="Нутрициолог" />
        </Field>
        <Field label="Номер сертификата курса FOX — если есть">
          <input className={inputClass} name="certificate" placeholder="FOX-EDU-2026-0000" />
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
          disabled={!consent || sending}
          className="rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-40"
        >
          {sending ? "Отправляем…" : "Отправить заявку"}
        </button>
        {error ? <p role="alert" className="text-center text-[14px] text-[#A03A22]">{error}</p> : null}
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
