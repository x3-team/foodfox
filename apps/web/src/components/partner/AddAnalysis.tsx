"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePartnerData } from "@/components/partner/PartnerData";
import { Field, inputClass } from "@/components/partner/AuthSplit";

/* БПИТ10.1.1, first steps: the partner sends a photo (scan) of the client's result and the analysis id code. The code
   is checked against the laboratory base; until then the analysis shows «На проверке». */
export function AddAnalysis() {
  const router = useRouter();
  const { source } = usePartnerData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (source === "demo") {
      setMessage({ text: "В демо-кабинете анализы не отправляются. Войдите своим номером после одобрения договора." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/partner/analyses", { method: "POST", body: new FormData(form) });
      const body = (await response.json().catch(() => ({}))) as { number?: string; error?: string };
      if (!response.ok) {
        setMessage({ text: body.error ?? "Не получилось отправить", error: true });
        return;
      }
      form.reset();
      setMessage({ text: `Анализ ${body.number} отправлен на проверку по базе лаборатории` });
      router.refresh();
    } catch {
      setMessage({ text: "Нет соединения. Попробуйте ещё раз", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] border border-[#E3E4DF] bg-white px-4 py-5 sm:px-6">
      <h2 className="text-[17px] font-medium">Добавить анализ клиента</h2>
      <p className="mt-1 text-[13px] leading-5 text-[#5C5E57]">
        Фото или скан результата и id кода анализа с бланка. Один код засчитывается одному партнёру.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end">
        <Field label="Id кода анализа">
          <input className={inputClass} name="code" placeholder="FOX-2026-004182" required autoComplete="off" />
        </Field>
        <Field label="Клиент (необязательно)">
          <input className={inputClass} name="client" placeholder="А. Соколова" autoComplete="off" />
        </Field>
        <Field label="Фото или скан результата">
          <input className={`${inputClass} py-3 text-[14px]`} name="photo" type="file" accept="image/*,application/pdf" capture="environment" required />
        </Field>
        <button type="submit" disabled={busy} className="rounded-full bg-[#21251D] px-6 py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-40">
          {busy ? "Отправляем…" : "Отправить"}
        </button>
      </div>
      {message ? (
        <p role="status" className={`mt-3 text-[13px] ${message.error ? "text-[#A03A22]" : "text-[#4A6B1F]"}`}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
