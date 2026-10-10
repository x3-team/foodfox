"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { atLeast } from "@/components/useDialog";

/*
 * «Связаться» — one form for the modal (Figma 07 · G10–G12, «Модалка «Связаться» · 5 состояний»)
 * and the /contacts block (06 · K03). States: default → filling/error → sending → network error → success.
 */

export const WHO = ["Пациент", "Специалист", "Лаборатория"] as const;
export type Who = (typeof WHO)[number];

const MAX = 1000;
const WARN = 900;

const QUESTION_HINT: Record<Who, string> = {
  Пациент: "Опишите ситуацию",
  Специалист: "Курс, материалы для приёма, интерпретация отчёта",
  Лаборатория: "Город, сколько отделений, что хотите подключить",
};

type Field = "name" | "contact" | "company" | "text";
type Values = Record<Field, string>;
type Status = "idle" | "sending" | "error" | "success";

function checkContact(raw: string) {
  const value = raw.trim();
  if (!value) return "Укажите e-mail или телефон";
  if (value.includes("@")) {
    const [user, domain = ""] = value.split("@");
    if (!user || /\s/.test(value)) return "Проверьте e-mail";
    if (!domain) return "Укажите e-mail целиком, вместе с доменом";
    if (!/\.[^.\s]{2,}$/.test(domain)) return `Укажите e-mail целиком: ${value}.ru`;
    return "";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15 && !/[^\d\s()+-]/.test(value)) return "";
  return digits.length ? "Проверьте номер: нужно 10–11 цифр" : "Укажите e-mail или телефон";
}

function validate(field: Field, values: Values, who: Who) {
  switch (field) {
    case "name":
      return values.name.trim().length < 2 ? "Укажите, как к вам обращаться" : "";
    case "contact":
      return checkContact(values.contact);
    case "company":
      return who === "Лаборатория" && values.company.trim().length < 2 ? "Укажите компанию" : "";
    case "text":
      return values.text.trim().length < 10 ? "Опишите вопрос — пары предложений достаточно" : "";
  }
}

function replyBy() {
  // Office answers within one working day (Mon–Fri, until 19:00 Moscow time).
  const now = new Date(Date.now() + 3 * 3600_000);
  const day = now.getUTCDay();
  if (day === 5 || day === 6) return "до понедельника, 19:00";
  return "до завтра, 19:00";
}

export function LeadForm({
  variant,
  title,
  subtitle,
  whoHint,
  onClose,
  onDirtyChange,
}: {
  variant: "modal" | "page";
  title: string;
  subtitle: string;
  whoHint?: (who: Who) => ReactNode;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [who, setWho] = useState<Who>("Пациент");
  const [values, setValues] = useState<Values>({ name: "", contact: "", company: "", text: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const retryRef = useRef<() => void>(() => {});
  const sending = status === "sending";
  const fields: Field[] = who === "Лаборатория" ? ["name", "contact", "company", "text"] : ["name", "contact", "text"];
  // K04: «Оставить заявку» for labs scrolls to the page form with the «Лаборатория / партнёр» segment preselected.
  useEffect(() => {
    if (variant !== "page") return;
    const pick = (event: Event) => {
      const next = (event as CustomEvent<Who>).detail;
      if (WHO.includes(next)) setWho(next);
    };
    window.addEventListener("fox:lead-who", pick);
    return () => window.removeEventListener("fox:lead-who", pick);
  }, [variant]);

  // Figma «Связаться · Ошибка сети» (1300:2487): the error is the global Toast / Status at the bottom of the screen,
  // «Нет соединения — текст сохранён · Повторить», no auto-close (G11). It goes away on retry, success or close.
  const toastTag = useRef(`lead-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    const tag = toastTag.current;
    if (status === "error") {
      window.dispatchEvent(
        new CustomEvent("fox:toast", {
          detail: { text: "Нет соединения — текст сохранён", type: "error", tag, action: { label: "Повторить", run: () => retryRef.current() } },
        }),
      );
    } else {
      window.dispatchEvent(new CustomEvent("fox:toast-clear", { detail: tag }));
    }
  }, [status]);
  useEffect(() => {
    const tag = toastTag.current;
    return () => {
      window.dispatchEvent(new CustomEvent("fox:toast-clear", { detail: tag }));
    };
  }, []);

  function update(field: Field, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    onDirtyChange?.(Object.values(next).some((item) => item.trim()));
    // After the first error the field re-checks on every input, so the message disappears as soon as it is fixed (G14).
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validate(field, next, who) }));
  }

  function blur(field: Field) {
    if (!values[field].trim() && !errors[field]) return;
    setErrors((current) => ({ ...current, [field]: validate(field, values, who) }));
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (sending || !consent) return;
    const next: Partial<Record<Field, string>> = {};
    fields.forEach((field) => {
      const message = validate(field, values, who);
      if (message) next[field] = message;
    });
    setErrors(next);
    const firstBad = fields.find((field) => next[field]);
    if (firstBad) {
      // Shake only on a submit attempt (G10), not while typing.
      setShake(true);
      window.setTimeout(() => setShake(false), 260);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    setStatus("sending");
    const started = performance.now();
    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await atLeast(
        fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "contact", who, ...values }),
        }),
        600,
      );
      if (!response.ok) throw new Error(String(response.status));
      setStatus("success");
      onDirtyChange?.(false);
    } catch {
      // Spinner stays at least 600мс; data stays in the fields, the button returns to Default
      // and the error toast has no auto-close (G11).
      const rest = 600 - (performance.now() - started);
      if (rest > 0) await new Promise((resolve) => window.setTimeout(resolve, rest));
      setStatus("error");
    }
  }

  retryRef.current = () => void submit();

  function reset() {
    setValues({ name: "", contact: "", company: "", text: "" });
    setErrors({});
    setConsent(false);
    setStatus("idle");
  }

  const head = (
    <div className="lf-head">
      {variant === "modal" ? <h2 id="lead-title">{title}</h2> : <h2>{title}</h2>}
      <p className="lead-note">{subtitle}</p>
    </div>
  );

  if (status === "success") {
    return (
      <div className={`lf lf-${variant}`}>
        {head}
        <div className="lf-done" role="status">
          <span className="lf-done-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" /></svg>
          </span>
          <h3>Вопрос отправлен</h3>
          <p>
            Ответим на {values.contact.trim()} {replyBy()}. Пока ждёте — загляните в FAQ.
          </p>
          <div className="lf-done-actions">
            {variant === "modal" ? (
              <button className="btn btn-dark" type="button" onClick={onClose} data-autofocus>Готово</button>
            ) : (
              <button className="btn btn-dark" type="button" onClick={reset}>Готово</button>
            )}
            <Link className="btn btn-text" href="/faq" onClick={onClose}>Открыть FAQ</Link>
          </div>
        </div>
      </div>
    );
  }

  const count = values.text.length;
  return (
    <form
      ref={formRef}
      id={variant === "page" ? "k-form" : undefined}
      className={`lf lf-${variant}${shake ? " is-shake" : ""}${sending ? " is-sending" : ""}`}
      onSubmit={submit}
      noValidate
      aria-busy={sending}
    >
      {head}
      <div className="seg" role="radiogroup" aria-label="Кто вы" style={{ ["--seg-i" as string]: WHO.indexOf(who), ["--seg-n" as string]: WHO.length }}>
        <i className="seg-ind" aria-hidden />
        {WHO.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={who === item}
            className={who === item ? "is-active" : ""}
            disabled={sending}
            onClick={() => setWho(item)}
          >
            {variant === "page" && item === "Лаборатория" ? <><span className="d-only">Лаборатория / партнёр</span><span className="m-only">Партнёр</span></> : item}
          </button>
        ))}
      </div>
      {whoHint && <p className="k-who">{whoHint(who)}</p>}
      <div className="lf-row">
      <Input field="name" label="Имя" placeholder="Как к вам обращаться" autoComplete="name" values={values} errors={errors} sending={sending} onChange={update} onBlur={blur} />
      <Input field="contact" label="E-mail или телефон" placeholder="Куда ответить" autoComplete="email" values={values} errors={errors} sending={sending} onChange={update} onBlur={blur} />
      </div>
      <div className={`lf-slide${who === "Лаборатория" ? " is-open" : ""}`} aria-hidden={who !== "Лаборатория"}>
        <div>
          {who === "Лаборатория" && (
            <Input field="company" label="Компания" placeholder="Название сети или клиники" autoComplete="organization" values={values} errors={errors} sending={sending} onChange={update} onBlur={blur} />
          )}
        </div>
      </div>
      <label className={`field${errors.text ? " is-error" : ""}${values.text && !errors.text ? " is-filled" : ""}`}>
        Вопрос
        <textarea
          name="text"
          rows={4}
          maxLength={MAX}
          placeholder={variant === "page" && who === "Пациент" ? "Опишите ситуацию — без медицинских данных и сканов отчёта" : QUESTION_HINT[who]}
          value={values.text}
          readOnly={sending}
          aria-invalid={!!errors.text}
          aria-describedby="lf-text-meta"
          onChange={(event) => update("text", event.target.value)}
          onBlur={() => blur("text")}
        />
        <Err text={errors.text} />
        <span className="lf-meta" id="lf-text-meta">
          <span>{variant === "page" ? "Минимум 10 символов" : "Не прикладывайте медицинские данные"}</span>
          <span className={count > WARN ? "is-warn" : ""} aria-live="polite">{count} / {MAX}</span>
        </span>
      </label>
      <label className="lf-consent">
        <input type="checkbox" checked={consent} disabled={sending} onChange={(event) => setConsent(event.target.checked)} />
        <span className="lf-box" aria-hidden />
        <span>{variant === "page" ? "Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности и обработкой персональных данных (152-ФЗ)" : "Согласен на обработку персональных данных (152-ФЗ)"}</span>
      </label>
      <div className={`lf-actions${consent ? " is-ready" : ""}`}>
        <button className={`btn btn-dark${sending ? " is-loading is-labelled" : ""}`} type="submit" disabled={!consent || sending}>
          {sending ? "Отправляем…" : "Отправить"}
        </button>
        {variant === "page" ? <span className="lf-hint">Отвечаем в течение 1 рабочего дня</span> : !consent && <span className="lf-hint">Кнопка активна после согласия</span>}
      </div>
    </form>
  );
}

function Err({ text }: { text?: string }) {
  // The message slides in from the top (height 0→auto, 160мс) instead of popping (G10).
  return (
    <span className={`lf-err${text ? " is-on" : ""}`} aria-live="polite">
      <span className="err">{text}</span>
    </span>
  );
}

function Input({
  field,
  label,
  placeholder,
  autoComplete,
  values,
  errors,
  sending,
  onChange,
  onBlur,
}: {
  field: Field;
  label: string;
  placeholder: string;
  autoComplete: string;
  values: Values;
  errors: Partial<Record<Field, string>>;
  sending: boolean;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}) {
  const error = errors[field];
  const ok = !error && errors[field] === "" && values[field].trim().length > 0;
  return (
    <label className={`field${error ? " is-error" : ""}${ok ? " is-ok" : ""}`}>
      {label}
      <span className="lf-input">
        <input
          name={field}
          value={values[field]}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={sending}
          aria-invalid={!!error}
          onChange={(event) => onChange(field, event.target.value)}
          onBlur={() => onBlur(field)}
        />
        {ok && (
          <svg className="lf-ok" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
          </svg>
        )}
      </span>
      <Err text={error} />
    </label>
  );
}
