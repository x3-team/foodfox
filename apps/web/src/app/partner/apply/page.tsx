"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthSplit, Field, inputClass, maskPhone, phoneDigits } from "@/components/partner/AuthSplit";
import { LEGAL_FORMS, type LegalForm } from "@/lib/partner-program/contracts";

/* Joining the partner program as in the customer's process БПИТ12.8: phone by SMS, then
   врач? → гражданство РФ? → ИП / самозанятый / физлицо → договор → личные данные и сканы.
   The answers are kept on the server (/api/partner/onboarding), so the page can be reopened at any step. */

type Step = "doctor" | "citizen" | "form" | "contract" | "data" | "done";
type State = {
  phone: string;
  status: "in_progress" | "doctor" | "not_citizen" | "declined" | "submitted";
  step: Step;
  legalForm: LegalForm | null;
  contract: { version: string; title: string; pdf: string; sections: { heading: string; text: string }[] } | null;
  partnerStatus: string | null;
  documentsEnabled: boolean;
};

const button = "rounded-full bg-[#21251D] py-4 text-[15px] font-medium text-[#F8F9F6] disabled:opacity-40";
const secondary = "rounded-full border border-[#E3E4DF] bg-white py-4 text-[15px] font-medium text-[#0B0C08] disabled:opacity-40";

export default function PartnerApplyPage() {
  const [state, setState] = useState<State | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch("/api/partner/onboarding", { cache: "no-store" }).catch(() => null);
    if (response?.status === 401) return setNeedsPhone(true);
    const body = response ? ((await response.json().catch(() => ({}))) as State & { error?: string }) : null;
    if (!response?.ok || !body) return setError(body?.error ?? "Не удалось открыть анкету. Обновите страницу");
    setNeedsPhone(false);
    setState(body);
  }

  async function send(step: string, value?: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/partner/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step, value }),
      });
      const body = (await response.json()) as State & { error?: string };
      if (!response.ok) setError(body.error ?? "Не получилось");
      else setState(body);
    } catch {
      setError("Нет соединения. Попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  let content: React.ReactNode;
  if (needsPhone) content = <PhoneStep onDone={load} />;
  else if (!state) content = error ? <ErrorText>{error}</ErrorText> : <p className="text-[14px] text-[#5C5E57]">Загружаем анкету…</p>;
  else if (state.partnerStatus === "approved" || state.partnerStatus === "certified")
    content = <Final title="Вы уже партнёр" text="Входите в кабинет по этому номеру телефона." action={<Link href="/partner" className={`${button} block text-center`}>Войти в кабинет</Link>} />;
  else if (state.status === "doctor")
    content = <Final title="Для медицинских работников эта программа недоступна" text="С вами свяжется наш специалист службы работы с клиентами и расскажет о программе для врачей." />;
  else if (state.status === "not_citizen")
    content = <Final title="Только для граждан РФ" text="Регистрация в партнёрской программе доступна только гражданам Российской Федерации." action={<Restart onClick={() => send("restart")} busy={busy} />} />;
  else if (state.status === "declined")
    content = <Final title="Регистрация остановлена" text="Без принятия договора подключиться к программе нельзя. Если передумаете, начните заново." action={<Restart onClick={() => send("restart")} busy={busy} />} />;
  else if (state.status === "submitted")
    content = <Final title="Заявка отправлена" text={`Договор согласуют бухгалтерия и служба работы с клиентами, обычно до 2 рабочих дней. После этого кабинет откроется по номеру ${state.phone}.`} action={<Link href="/partner" className={`${secondary} block text-center`}>Ко входу в кабинет</Link>} />;
  else if (state.step === "doctor")
    content = <Question title="Являетесь ли вы врачом?" hint="Программа для косметологов, нутрициологов, хелс-коучей и фитнес-тренеров." busy={busy} onAnswer={(yes) => send("doctor", yes)} />;
  else if (state.step === "citizen")
    content = <Question title="Ваше гражданство — РФ?" hint="Договор заключаем только с гражданами Российской Федерации." busy={busy} onAnswer={(yes) => send("citizen", yes)} />;
  else if (state.step === "form") content = <FormStep busy={busy} onPick={(form) => send("form", form)} />;
  else if (state.step === "contract" && state.contract)
    content = <ContractStep contract={state.contract} busy={busy} onAnswer={(yes) => send("contract", yes)} onBack={() => send("restart")} />;
  else content = <DataStep state={state} onDone={setState} />;

  return (
    <AuthSplit>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-[38px]">Стать партнёром</h2>
          {state && state.status === "in_progress" ? <Progress step={state.step} /> : null}
        </div>
        {content}
        {error && state ? <ErrorText>{error}</ErrorText> : null}
        <p className="text-center text-[14px] text-[#5C5E57]">
          Уже партнёр?{" "}
          <Link href="/partner" className="font-medium text-[#4A6B1F]">
            Войти
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}

const STEPS: Step[] = ["doctor", "citizen", "form", "contract", "data"];

function Progress({ step }: { step: Step }) {
  const index = Math.max(0, STEPS.indexOf(step));
  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={`Шаг ${index + 1} из ${STEPS.length}`}>
      {STEPS.map((s, i) => (
        <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-[#21251D]" : "bg-[#E3E4DF]"}`} />
      ))}
    </div>
  );
}

function PhoneStep({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: response.ok, body: (await response.json().catch(() => ({}))) as { error?: string } };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (phoneDigits(phone).length !== 11) return setError("Неверный номер телефона");
    setBusy(true);
    try {
      if (!sent) {
        const r = await post("/api/auth/otp/request", { phone: phoneDigits(phone) });
        if (!r.ok) return setError(r.body.error ?? "Не удалось отправить код");
        setSent(true);
      } else {
        if (code.length !== 4) return setError("Введите код из СМС");
        const r = await post("/api/auth/otp/verify", { phone: phoneDigits(phone), code, intent: "apply" });
        if (!r.ok) return setError(r.body.error ?? "Код неверный или истёк");
        onDone();
      }
    } catch {
      setError("Нет соединения. Попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-[14px] text-[#5C5E57]">Подтвердите номер: по нему вы будете входить в кабинет, а мы — связываться по договору.</p>
      <Field label="Телефон">
        <input className={inputClass} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (999) 000-11-22" disabled={sent} />
      </Field>
      {sent ? (
        <Field label="Код из СМС">
          <input className={`${inputClass} tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••" />
        </Field>
      ) : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <button type="submit" disabled={busy} className={button}>
        {busy ? "Подождите…" : sent ? "Подтвердить" : "Получить код"}
      </button>
    </form>
  );
}

function Question({ title, hint, busy, onAnswer }: { title: string; hint: string; busy: boolean; onAnswer: (yes: boolean) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[20px] font-medium leading-7">{title}</p>
        <p className="mt-1 text-[14px] text-[#5C5E57]">{hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy} className={button} onClick={() => onAnswer(true)}>Да</button>
        <button type="button" disabled={busy} className={secondary} onClick={() => onAnswer(false)}>Нет</button>
      </div>
    </div>
  );
}

function FormStep({ busy, onPick }: { busy: boolean; onPick: (form: LegalForm) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[20px] font-medium leading-7">Укажите вашу форму</p>
      {(Object.keys(LEGAL_FORMS) as LegalForm[]).map((form) => (
        <button
          key={form}
          type="button"
          disabled={busy}
          onClick={() => onPick(form)}
          className="rounded-[18px] border border-[#E3E4DF] bg-white px-5 py-4 text-left transition-colors hover:border-[#0B0C08] disabled:opacity-40"
        >
          <span className="block text-[15px] font-medium">{LEGAL_FORMS[form].label} ({LEGAL_FORMS[form].short})</span>
          <span className="mt-1 block text-[13px] leading-5 text-[#5C5E57]">{LEGAL_FORMS[form].hint}</span>
        </button>
      ))}
    </div>
  );
}

function ContractStep({ contract, busy, onAnswer, onBack }: { contract: NonNullable<State["contract"]>; busy: boolean; onAnswer: (yes: boolean) => void; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[20px] font-medium leading-7">{contract.title}</p>
      <div className="max-h-[360px] overflow-y-auto rounded-[18px] border border-[#E3E4DF] bg-white px-5 py-4 text-[14px] leading-6">
        {contract.sections.map((s) => (
          <div key={s.heading} className="mb-3 last:mb-0">
            <p className="font-medium">{s.heading}</p>
            <p className="text-[#3B3D36]">{s.text}</p>
          </div>
        ))}
      </div>
      {contract.pdf ? (
        <a href={contract.pdf} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-[#4A6B1F] underline underline-offset-4">
          Открыть договор (PDF)
        </a>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy} className={button} onClick={() => onAnswer(true)}>Принимаю</button>
        <button type="button" disabled={busy} className={secondary} onClick={() => onAnswer(false)}>Не принимаю</button>
      </div>
      <button type="button" disabled={busy} onClick={onBack} className="text-[14px] font-medium text-[#4A6B1F]">Изменить ответы</button>
    </div>
  );
}

const DOCS: [string, string][] = [
  ["passport_main", "Паспорт: страница с фото"],
  ["passport_reg", "Паспорт: страница с пропиской"],
  ["snils", "СНИЛС"],
  ["inn", "ИНН"],
];

function DataStep({ state, onDone }: { state: State; onDone: (s: State) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/partner/onboarding/submit", { method: "POST", body: new FormData(event.currentTarget) });
      const body = (await response.json().catch(() => ({}))) as State & { error?: string };
      if (!response.ok) setError(body.error ?? "Не получилось отправить");
      else onDone(body);
    } catch {
      setError("Нет соединения. Данные в форме сохранились, попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  if (!state.documentsEnabled) {
    return <Final title="Приём документов временно выключен" text="Ответы сохранены. Мы сообщим, когда можно будет загрузить документы." />;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <p className="text-[14px] leading-5 text-[#5C5E57]">
        Данные нужны для договора и выплат. Они хранятся в зашифрованном виде, полностью их видит только бухгалтерия.
        Форма: {state.legalForm ? LEGAL_FORMS[state.legalForm].label.toLowerCase() : "—"}.
      </p>
      <Field label="Фамилия, имя и отчество">
        <input className={inputClass} name="fullName" autoComplete="name" placeholder="Ковалёва Мария Игоревна" required />
      </Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Email для акта">
          <input className={inputClass} name="email" type="email" autoComplete="email" placeholder="name@mail.ru" required />
        </Field>
        <Field label="Специализация">
          <input className={inputClass} name="specialty" placeholder="Нутрициолог" />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Серия и номер паспорта">
          <input className={inputClass} name="passport" inputMode="numeric" placeholder="1234 567890" required />
        </Field>
        <Field label="ИНН">
          <input className={inputClass} name="inn" inputMode="numeric" placeholder="12 цифр" required />
        </Field>
      </div>
      <Field label="Почтовый адрес с индексом (для оригинала акта)">
        <input className={inputClass} name="postal" autoComplete="street-address" placeholder="123456, Москва, ул. …" required />
      </Field>
      <Field label="Город">
        <input className={inputClass} name="city" autoComplete="address-level2" placeholder="Москва" />
      </Field>
      <p className="pt-1 text-[15px] font-medium">Реквизиты счёта для выплат</p>
      <Field label="Получатель">
        <input className={inputClass} name="recipient" placeholder="Как в банке, обычно ваше ФИО" />
      </Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="БИК банка">
          <input className={inputClass} name="bik" inputMode="numeric" placeholder="04xxxxxxx" required />
        </Field>
        <Field label="Банк">
          <input className={inputClass} name="bankName" placeholder="Название банка" />
        </Field>
      </div>
      <Field label="Номер счёта">
        <input className={inputClass} name="account" inputMode="numeric" placeholder="20 цифр" required />
      </Field>
      <p className="pt-1 text-[15px] font-medium">Сканы или фото документов</p>
      {DOCS.map(([name, label]) => (
        <Field key={name} label={label}>
          <input className={`${inputClass} py-3 text-[14px]`} name={`doc_${name}`} type="file" accept="image/*,application/pdf" required />
        </Field>
      ))}
      <label className="flex items-start gap-3 text-[14px] leading-[18px] text-[#0B0C08]">
        <input type="checkbox" name="consent" required className="mt-0.5 size-[22px] shrink-0 accent-[#21251D]" />
        <span>Даю согласие на обработку персональных данных для заключения и исполнения договора</span>
      </label>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <button type="submit" disabled={busy} className={button}>
        {busy ? "Отправляем…" : "Отправить заявку"}
      </button>
    </form>
  );
}

function Final({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[20px] font-medium leading-7">{title}</p>
        <p className="mt-1.5 text-[14px] leading-5 text-[#5C5E57]">{text}</p>
      </div>
      {action}
    </div>
  );
}

function Restart({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className={secondary}>
      Начать заново
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="text-[13px] leading-5 text-[#A03A22]">{children}</p>;
}
