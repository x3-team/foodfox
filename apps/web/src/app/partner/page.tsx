"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplit, Field, inputClass } from "@/components/partner/AuthSplit";
import { partner } from "@/lib/partner-demo";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(partner.email);
  const [password, setPassword] = useState("demo-password");
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@") || password.length < 4) {
      setError(true);
      return;
    }
    router.push("/partner/home");
  }

  return (
    <AuthSplit>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <h2 className="text-[34px] font-light leading-[38px] tracking-[-0.5px]">
            Вход в кабинет
          </h2>
          <p className="mt-1.5 text-[14px] text-[#5C5E57]">
            Для сертифицированных нутрициологов и врачей
          </p>
        </div>
        <Field label="Email">
          <input
            className={`${inputClass} ${error ? "border-[#A03A22]" : ""}`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
          />
        </Field>
        <Field label="Пароль">
          <input
            className={`${inputClass} ${error ? "animate-[partner-shake_240ms_ease-out] border-[#A03A22]" : ""}`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="text-[14px] font-medium text-[#4A6B1F]"
          >
            Забыли пароль?
          </button>
        </div>
        {forgot ? (
          <p className="text-[13px] leading-5 text-[#5C5E57]">
            В демо-кабинете пароль уже подставлен. Нажмите «Войти» — откроется
            кабинет Марии.
          </p>
        ) : null}
        {error ? (
          <p className="text-[13px] text-[#A03A22]">
            Проверьте email и пароль.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6]"
        >
          Войти
        </button>
        <p className="text-center text-[14px] text-[#5C5E57]">
          Ещё не партнёр?{" "}
          <Link href="/partner/apply" className="font-medium text-[#4A6B1F]">
            Оставить заявку
          </Link>
        </p>
      </form>
      <style>{`
        @keyframes partner-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </AuthSplit>
  );
}
