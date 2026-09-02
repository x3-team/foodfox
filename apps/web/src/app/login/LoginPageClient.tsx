"use client";

import { withBasePath } from "@/lib/base-path";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { FoxLogo } from "@/components/icons";

type Mode = "login" | "register";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/upload";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : { email, password, displayName };

    try {
      const res = await fetch(withBasePath(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-phone flex-col bg-fox-bg px-5 pb-8 pt-16">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <FoxLogo className="h-16 w-16" aria-hidden />
        <h1 className="text-[26px] font-semibold tracking-tight text-fox-text">FoodFox</h1>
        <p className="max-w-[280px] text-[14px] leading-relaxed text-fox-muted">
          Личный кабинет после теста FOX — план питания и бот-нутрициолог
        </p>
      </div>

      <div className="fox-card mb-5 flex p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition ${
            mode === "login" ? "bg-fox-primary text-white" : "text-fox-muted"
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition ${
            mode === "register" ? "bg-fox-primary text-white" : "text-fox-muted"
          }`}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-4">
        {mode === "register" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-fox-muted">Имя</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[15px] outline-none focus:border-fox-primary"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-fox-muted">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[15px] outline-none focus:border-fox-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-fox-muted">Пароль</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Минимум 6 символов"
            className="w-full rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[15px] outline-none focus:border-fox-primary"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-fox-red">{error}</p>
        )}

        <button type="submit" disabled={loading} className="fox-btn-primary mt-2 w-full">
          {loading
            ? "Подождите…"
            : mode === "login"
              ? "Войти"
              : "Создать аккаунт"}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-fox-muted">
        IgG-тест носит информационный характер и не заменяет консультацию врача.
      </p>

      <div className="mt-4 rounded-xl border border-fox-border bg-fox-surface px-4 py-3 text-[12px] leading-relaxed text-fox-muted">
        <span className="font-medium text-fox-text">Демо-презентация:</span>{" "}
        demo@foodfox.local / DemoFox2026!
      </div>
    </div>
  );
}
