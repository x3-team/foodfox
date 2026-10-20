"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AuthSplit,
  Field,
  inputClass,
  maskPhone,
  phoneDigits,
} from "@/components/partner/AuthSplit";
import {
  PARTNER_DEMO_AUTOLOGIN,
  PARTNER_DEMO_AUTOLOGIN_CODE,
  PARTNER_DEMO_AUTOLOGIN_PHONE,
} from "@/lib/partner-demo-autologin";

const CLIENT_ROLE_ERROR =
  "Этот номер зарегистрирован как клиент. В кабинет партнёра он не входит.";

export default function PartnerLoginPage() {
  return <PartnerLoginForm />;
}

function PartnerLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "role") {
      setError(CLIENT_ROLE_ERROR);
      return;
    }
    // TEMPORARY demo auto-login, see lib/partner-demo-autologin.ts.
    if (!PARTNER_DEMO_AUTOLOGIN || params.has("manual") || autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    void demoAutoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function demoAutoLogin() {
    const pause = () => new Promise((resolve) => window.setTimeout(resolve, 400));
    setPhone(maskPhone(PARTNER_DEMO_AUTOLOGIN_PHONE));
    await pause();
    // A 429 means an unused demo code is still pending, so verify can go ahead.
    if (!(await sendCode(PARTNER_DEMO_AUTOLOGIN_PHONE, true))) return;
    setCode(PARTNER_DEMO_AUTOLOGIN_CODE);
    await pause();
    await checkCode(PARTNER_DEMO_AUTOLOGIN_PHONE, PARTNER_DEMO_AUTOLOGIN_CODE);
  }

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!phone.trim()) {
      setError("Введите номер телефона");
      return;
    }
    if (!isPhone(phone)) {
      setError("Неверный номер телефона");
      return;
    }
    await sendCode(phoneDigits(phone));
  }

  async function sendCode(phoneNumber: string, pendingIsOk = false): Promise<boolean> {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok && !(pendingIsOk && response.status === 429)) {
        setError(body.error ?? "Не удалось отправить код");
        return false;
      }
      setStep("code");
      return true;
    } catch {
      setError("Не удалось отправить код");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 4) {
      setError("Введите код из СМС");
      return;
    }
    await checkCode(phoneDigits(phone), code);
  }

  async function checkCode(phoneNumber: string, codeValue: string) {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, code: codeValue, intent: "partner" }),
      });
      const body = (await response.json()) as {
        error?: string;
        user?: { role?: string };
      };
      if (!response.ok || body.user?.role !== "partner") {
        setError(body.error ?? CLIENT_ROLE_ERROR);
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
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (999) 000-11-22"
              aria-invalid={error ? true : undefined}
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
              maxLength={4}
              autoComplete="one-time-code"
              placeholder="••••"
              aria-invalid={error ? true : undefined}
            />
          </Field>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <button
            type="submit"
            disabled={busy}
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

function isPhone(raw: string): boolean {
  return phoneDigits(raw).length === 11;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-5 text-[#A03A22]">{children}</p>;
}
