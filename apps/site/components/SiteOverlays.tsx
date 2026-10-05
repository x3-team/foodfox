"use client";

import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Screen = "form" | "loading" | "success" | "network";

function openBook() {
  window.dispatchEvent(new Event("fox:book"));
}

export function SiteOverlays() {
  const path = usePathname();
  const [bar, setBar] = useState(false);
  const [book, setBook] = useState(false);
  const [contact, setContact] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onBook = () => setBook(true);
    const onContact = () => setContact(true);
    const onToast = (event: Event) => {
      const text = (event as CustomEvent<string>).detail || "Готово";
      setToast(text);
      window.setTimeout(() => setToast(""), 2200);
    };
    window.addEventListener("fox:book", onBook);
    window.addEventListener("fox:contact", onContact);
    window.addEventListener("fox:toast", onToast);
    return () => {
      window.removeEventListener("fox:book", onBook);
      window.removeEventListener("fox:contact", onContact);
      window.removeEventListener("fox:toast", onToast);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const mobile = window.matchMedia("(max-width: 1100px)").matches;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setBar(mobile && max > 80 && window.scrollY / max > 0.3);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [path]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = [...document.querySelectorAll<HTMLElement>("[data-s]")];
    if (reduce) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }
    const mark = () => {
      const limit = window.scrollY + window.innerHeight * 0.92;
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top + window.scrollY <= limit) node.classList.add("is-in");
      });
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        });
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    nodes.forEach((node) => io.observe(node));
    mark();
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", mark);
    };
  }, [path]);

  useEffect(() => {
    const marks = () => {
      const y = window.scrollY + 120;
      const links = [...document.querySelectorAll<HTMLElement>(".f-nav a, .pr02 nav a")];
      const active: { link: HTMLElement | null; top: number } = { link: null, top: -1 };
      links.forEach((link) => link.classList.remove("is-on"));
      links.forEach((link) => {
        const id = link.getAttribute("href")?.replace("#", "");
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY;
        if (top <= y && top >= active.top) {
          active.link = link;
          active.top = top;
        }
      });
      active.link?.classList.add("is-on");
      const progress = document.querySelector<HTMLElement>(".pr-progress");
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max <= 0 ? 0 : Math.min(100, Math.round((window.scrollY / max) * 100));
        progress.textContent = `Прочитано ${pct}%`;
      }
    };
    marks();
    window.addEventListener("scroll", marks, { passive: true });
    return () => window.removeEventListener("scroll", marks);
  }, [path]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (event.target as HTMLElement | null)?.isContentEditable) return;
      const field = document.querySelector<HTMLInputElement>("[data-hotkey], [aria-label='Поиск продукта'], [aria-label='Поиск по вопросам']");
      if (!field) return;
      event.preventDefault();
      field.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path]);

  return (
    <>
      {bar && (
        <div className="m04" role="region" aria-label="Записаться на тест">
          <button className="btn btn-dark" type="button" onClick={openBook}>Записаться на тест</button>
        </div>
      )}
      {book && <BookModal onClose={() => setBook(false)} />}
      {contact && <LeadModal title="Связаться" kind="contact" onClose={() => setContact(false)} />}
      {toast && <p className="fox-toast" role="status">{toast}</p>}
    </>
  );
}

const BOOK_CITIES = [
  {
    name: "Москва",
    labs: [
      { id: "citilab", name: "Ситилаб", count: "126 отделений", href: "https://www.citilab.ru" },
      { id: "gemotest", name: "Гемотест", count: "86 отделений", href: "https://gemotest.ru" },
      { id: "kdl", name: "KDL", count: "54 отделения", href: "https://kdl.ru" },
    ],
  },
  {
    name: "Московская область",
    labs: [
      { id: "citilab", name: "Ситилаб", count: "40 отделений", href: "https://www.citilab.ru" },
      { id: "gemotest", name: "Гемотест", count: "22 отделения", href: "https://gemotest.ru" },
    ],
  },
  { name: "Моздок", labs: [] as { id: string; name: string; count: string; href: string }[] },
];

const CITY_CASE: Record<string, string> = {
  Москва: "Москве",
  "Московская область": "Московской области",
  Моздок: "Моздоке",
};

function inCity(name: string) {
  return CITY_CASE[name] || name;
}

function BookModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"city" | "labs" | "redirect" | "empty" | "done">("city");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [lab, setLab] = useState<(typeof BOOK_CITIES)[number]["labs"][number] | null>(null);
  const [mail, setMail] = useState("");
  const [mailError, setMailError] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const matches = BOOK_CITIES.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = BOOK_CITIES.find((item) => item.name === city);
  const nearby = BOOK_CITIES.filter((item) => item.name !== city && item.labs.length > 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function goCity() {
    const hit = BOOK_CITIES.find((item) => item.name.toLowerCase() === (city || query).trim().toLowerCase());
    const name = hit?.name || query.trim();
    if (name.length < 2) return;
    setCity(name);
    if (!hit || hit.labs.length === 0) setStep("empty");
    else setStep("labs");
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal book-sheet" role="dialog" aria-label="Записаться на тест" data-book-step={step} onClick={(event) => event.stopPropagation()}>
        <button className="lead-x" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        {step === "city" && (
          <div className="book-steps">
            <p className="meta-line">Шаг 1 — город</p>
            <h2>Где вам удобно сдать тест?</h2>
            <p className="lead-note">Подскажем сети, где сдать FOX.</p>
            <label className="field">
              Город
              <input value={query} onChange={(event) => { setQuery(event.target.value); setCity(""); }} placeholder="Москва" aria-label="Город для записи" autoComplete="off" />
            </label>
            <div className="book-list">
              {(query.trim() ? matches : BOOK_CITIES).map((item) => (
                <button key={item.name} type="button" className={city === item.name ? "is-on" : ""} onClick={() => { setCity(item.name); setQuery(item.name); }}>
                  <strong>{item.name}</strong>
                  <span>{item.labs.length ? `${item.labs.reduce((sum, labItem) => sum + parseInt(labItem.count, 10), 0)} отделений` : "пока нет партнёров"}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-dark" type="button" onClick={goCity}>Продолжить</button>
          </div>
        )}
        {step === "labs" && chosen && (
          <div className="book-steps">
            <p className="book-progress" aria-hidden><i style={{ width: "40%" }} /></p>
            <p className="meta-line">Шаг 2 — сеть</p>
            <h2>Выберите лабораторию в {inCity(chosen.name)}</h2>
            <div className="book-list" role="radiogroup" aria-label="Сеть лабораторий">
              {chosen.labs.map((item) => (
                <button key={item.id} type="button" role="radio" aria-checked={lab?.id === item.id} className={`book-lab${lab?.id === item.id ? " is-on" : ""}`} onClick={() => { setLab(item); setStep("redirect"); }}>
                  <img src={`/figma/labs/${item.id}.svg`} alt="" width={88} height={28} />
                  <span><strong>{item.name}</strong><small>{item.count}</small></span>
                  <i className="book-radio" />
                </button>
              ))}
            </div>
            <button className="btn btn-dark" type="button" disabled={!lab} onClick={() => lab && setStep("redirect")}>Перейти на сайт {lab?.name || "сети"}</button>
            <button className="btn btn-ghost" type="button" onClick={() => setStep("city")}>Другой город</button>
          </div>
        )}
        {step === "redirect" && lab && (
          <div className="book-steps book-go">
            <p className="book-progress" aria-hidden><i style={{ width: "60%" }} /></p>
            <p className="meta-line">Шаг 3 — переход на сайт сети</p>
            <div className="book-logos">
              <img src="/icons/logo-dark.svg" alt="FOX" width={72} height={32} />
              <span />
              <img src={`/figma/labs/${lab.id}.svg`} alt="" width={96} height={32} />
            </div>
            <h2>Открываем сайт {lab.name}…</h2>
            <p className="lead-note">Страница теста FOX откроется в новой вкладке. На сайте сети можно выбрать отделение, время и оплатить исследование.</p>
            <a className="btn btn-dark" href={lab.href} target="_blank" rel="noreferrer">Перейти на сайт {lab.name}</a>
            <button className="btn btn-ghost" type="button" onClick={() => setStep("labs")}>Вернуться к списку</button>
          </div>
        )}
        {step === "empty" && (
          <form className="book-steps" onSubmit={async (event) => {
            event.preventDefault();
            if (!mail.includes("@")) {
              setMailError("Укажите почту");
              return;
            }
            if (!consent) {
              setMailError("Нужно согласие на обработку данных");
              return;
            }
            setMailError("");
            if (!navigator.onLine) {
              setMailError("Не удалось отправить");
              return;
            }
            setSending(true);
            try {
              const response = await fetch("/api/lead", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ kind: "book-wait", city, contact: mail }),
              });
              if (!response.ok) throw new Error("fail");
              setStep("done");
            } catch {
              setMailError("Не удалось отправить");
            } finally {
              setSending(false);
            }
          }}>
            <p className="book-progress" aria-hidden><i style={{ width: "80%" }} /></p>
            <p className="meta-line">Шаг 4 — в городе нет партнёров</p>
            <h2>В {inCity(city || "этом городе")} пока нет партнёров</h2>
            <p className="lead-note">Можно сдать тест в соседнем городе или оставить почту — напишем, когда появится сеть.</p>
            <div className="book-list">
              {nearby.map((item) => (
                <button key={item.name} type="button" onClick={() => { setCity(item.name); setQuery(item.name); setStep("labs"); }}>
                  <strong>{item.name}</strong>
                  <span>{item.labs.reduce((sum, labItem) => sum + parseInt(labItem.count, 10), 0)} отделений</span>
                </button>
              ))}
            </div>
            <label className={`field${mailError && !mail.includes("@") ? " is-error" : ""}`}>
              Почта
              <input type="email" value={mail} onChange={(event) => setMail(event.target.value)} aria-label="Почта, когда появится тест" aria-invalid={!!mailError} />
            </label>
            <label className="book-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              Согласен на обработку персональных данных
            </label>
            {mailError && <span className="err">{mailError}</span>}
            <button className={`btn btn-dark${sending ? " is-loading" : ""}`} type="submit" disabled={sending}>Сообщить, когда появится</button>
          </form>
        )}
        {step === "done" && (
          <div className="book-steps book-go">
            <p className="book-progress" aria-hidden><i style={{ width: "100%" }} /></p>
            <span className="book-done" aria-hidden>✓</span>
            <h2>Готово, мы напишем</h2>
            <p className="lead-note">Когда тест FOX появится в {inCity(city || "этом городе")}, пришлём одно письмо на {mail}.</p>
            <a className="btn btn-dark" href="/report">Как читать отчёт</a>
            <button className="btn btn-ghost" type="button" onClick={onClose}>Закрыть</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadModal({ title, kind, onClose }: { title: string; kind: "book" | "contact"; onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>("form");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Record<string, string> = {};
    const name = String(data.get("name") || "").trim();
    const contactValue = String(data.get("contact") || "").trim();
    if (name.length < 2) next.name = "Укажите имя";
    if (kind === "book") {
      const digits = contactValue.replace(/\D/g, "");
      if (digits.length < 10) next.contact = "Укажите телефон";
      if (String(data.get("city") || "").trim().length < 2) next.city = "Укажите город";
    } else if (!contactValue.includes("@")) {
      next.contact = "Проверьте email";
    }
    if (kind === "contact" && String(data.get("text") || "").trim().length < 4) next.text = "Напишите вопрос";
    setErrors(next);
    if (Object.keys(next).length) {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }
    if (!navigator.onLine || name.toLowerCase() === "сеть") {
      setScreen("network");
      return;
    }
    setScreen("loading");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, name, contact: contactValue }),
      });
      if (!response.ok) throw new Error("network");
      setScreen("success");
    } catch {
      setScreen("network");
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal lead-modal${shake ? " is-shake" : ""}`} role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <button className="lead-x" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        {screen === "success" ? (
          <div className="lead-done">
            <p className="fx-eye"><i />Готово</p>
            <h2>{kind === "book" ? "Заявка принята" : "Сообщение отправлено"}</h2>
            <p>{kind === "book" ? "Лаборатория свяжется с вами, чтобы подтвердить запись. Цену и подготовку называет сеть." : "Ответим в ближайший рабочий день. Интерпретацию отчёта по переписке не делаем."}</p>
            <button className="btn btn-dark" type="button" onClick={onClose}>Закрыть</button>
          </div>
        ) : screen === "network" ? (
          <div className="lead-done">
            <h2>Не удалось отправить</h2>
            <p>Проверьте соединение и попробуйте ещё раз. Заявка не ушла.</p>
            <button className="btn btn-dark" type="button" onClick={() => setScreen("form")}>Повторить</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2>{title}</h2>
            <p className="lead-note">{kind === "book" ? "Запись идёт через лабораторию-партнёра. Мы передадим контакты выбранной сети." : "Вопрос о сайте, документах или партнёрстве. Медицинскую расшифровку по почте не делаем."}</p>
            <label className={`field${errors.name ? " is-error" : ""}`}>
              Имя
              <input name="name" aria-invalid={!!errors.name} autoComplete="name" />
              {errors.name && <span className="err">{errors.name}</span>}
            </label>
            <label className={`field${errors.contact ? " is-error" : ""}`}>
              {kind === "book" ? "Телефон" : "Email"}
              <input name="contact" aria-invalid={!!errors.contact} autoComplete={kind === "book" ? "tel" : "email"} />
              {errors.contact && <span className="err">{errors.contact}</span>}
            </label>
            {kind === "book" && (
              <label className={`field${errors.city ? " is-error" : ""}`}>
                Город
                <input name="city" defaultValue="Москва" aria-invalid={!!errors.city} />
                {errors.city && <span className="err">{errors.city}</span>}
              </label>
            )}
            {kind === "contact" && (
              <label className={`field${errors.text ? " is-error" : ""}`}>
                Сообщение
                <textarea name="text" rows={4} aria-invalid={!!errors.text} />
                {errors.text && <span className="err">{errors.text}</span>}
              </label>
            )}
            <button className={`btn btn-dark${screen === "loading" ? " is-loading" : ""}`} type="submit" disabled={screen === "loading"}>
              {screen === "loading" ? "Отправляем" : "Отправить"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
