"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthSplit, Field, inputClass } from "@/components/partner/AuthSplit";

export default function PartnerLoginPage() {
  return (
    <Suspense
      fallback={
        <AuthSplit>
          <p className="text-[14px] text-[#5C5E57]">Загрузка…</p>
        </AuthSplit>
      }
    >
      <PartnerLoginForm />
    </Suspense>
  );
}

function PartnerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState(
    params.get("error") === "role"
      ? "Этот номер зарегистрирован как клиент. В кабинет партнёра он не входит."
      : "",
  );
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Не удалось отправить код");
        return;
      }
      setStep("code");
    } catch {
      setError("Не удалось отправить код");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, intent: "partner" }),
      });
      const body = (await response.json()) as {
        error?: string;
        user?: { role?: string };
      };
      if (!response.ok || body.user?.role !== "partner") {
        setError(
          body.error ??
            "Этот номер зарегистрирован как клиент. В кабинет партнёра он не входит.",
        );
        return;
      }
      router.push("/partner/home");
      router.refresh();
    } catch {
      setError("Не удалось проверить код");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      {step === "phone" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-5">
          <Heading />
          <Field label="Телефон">
            <input
              className={`${inputClass} ${error ? "border-[#A03A22]" : ""}`}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 999 000-11-22"
              required
            />
          </Field>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-60"
          >
            {busy ? "Отправляем…" : "Получить код"}
          </button>
          <ApplyLink />
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-5">
          <Heading />
          <p className="text-[14px] text-[#5C5E57]">
            Код отправлен на {phone}
          </p>
          <Field label="Код из СМС">
            <input
              className={`${inputClass} tracking-[0.3em] ${error ? "border-[#A03A22]" : ""}`}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
              required
            />
          </Field>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <button
            type="submit"
            disabled={busy || code.length !== 4}
            className="rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-60"
          >
            {busy ? "Проверяем…" : "Войти"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
            className="text-[14px] font-medium text-[#4A6B1F]"
          >
            Изменить номер
          </button>
          <ApplyLink />
        </form>
      )}
    </AuthSplit>
  );
}

function Heading() {
  return (
    <div>
      <h2 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">
        Вход в кабинет
      </h2>
      <p className="mt-1.5 text-[14px] text-[#5C5E57]">
        Код из СМС, как в приложении. Для сертифицированных нутрициологов и врачей.
      </p>
    </div>
  );
}

function ApplyLink() {
  return (
    <p className="text-center text-[14px] text-[#5C5E57]">
      Ещё не партнёр?{" "}
      <Link href="/partner/apply" className="font-medium text-[#4A6B1F]">
        Оставить заявку
      </Link>
    </p>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-5 text-[#A03A22]">{children}</p>;
}
