"use client";

import { usePathname } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { LeadForm } from "@/components/LeadForm";
import { useDialog } from "@/components/useDialog";
import { PARTNERS, plural, withUtm, type Partner } from "@/lib/labs";

type ToastItem = { id: number; text: string; type: "success" | "error" | "info"; duration: number; out?: boolean };
type ToastDetail = string | { text: string; type?: ToastItem["type"]; duration?: number };

function openBook() {
  window.dispatchEvent(new Event("fox:book"));
}

export function SiteOverlays() {
  const path = usePathname();
  const [bar, setBar] = useState(false);
  const [barEligible, setBarEligible] = useState(false);
  const [book, setBook] = useState<null | { lab?: string }>(null);
  const [contact, setContact] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    const onBook = (event: Event) => setBook({ lab: (event as CustomEvent<{ lab?: string } | null>).detail?.lab });
    const onContact = () => setContact(true);
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      const item = typeof detail === "string" || !detail ? { text: detail || "Готово" } : detail;
      const type = item.type ?? "success";
      const next: ToastItem = {
        id: ++toastId.current,
        text: item.text,
        type,
        // G17: Success/Info hang 3 s, Error stays until closed.
        duration: item.duration ?? (type === "error" ? 0 : 3000),
      };
      // No more than two toasts in the stack.
      setToasts((current) => [...current.filter((toast) => !toast.out).slice(-1), next]);
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
      const onLesson = path.startsWith("/course/lessons");
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // M04: after 30% of the page; leaves when the footer enters the screen and while typing.
      const footer = document.querySelector(".footer");
      const footerIn = !!footer && footer.getBoundingClientRect().top < window.innerHeight;
      // A tap on a form's own button must not land on the bar that pops up as the field loses focus.
      const active = document.activeElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName ?? "") || !!active?.closest("form");
      setBarEligible(mobile && !onLesson);
      setBar(mobile && !onLesson && max > 80 && window.scrollY / max > 0.3 && !footerIn && !typing);
    };
    // focusout fires before focus lands on the next element, so look at it on the next tick.
    const onFocusOut = () => window.setTimeout(onScroll, 0);
    document.addEventListener("focusin", onScroll);
    document.addEventListener("focusout", onFocusOut);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("focusin", onScroll);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [path]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new Set<Element>();
    const mark = () => {
      const limit = window.scrollY + window.innerHeight * 0.92;
      document.querySelectorAll<HTMLElement>("[data-s]:not(.is-in)").forEach((node) => {
        if (reduce || node.getBoundingClientRect().top + window.scrollY <= limit) node.classList.add("is-in");
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
    const observeNew = () => {
      document.querySelectorAll<HTMLElement>("[data-s]").forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        if (reduce) node.classList.add("is-in");
        else io.observe(node);
      });
      mark();
    };
    observeNew();
    const mo = new MutationObserver(observeNew);
    mo.observe(document.body, { childList: true, subtree: true });
    const poll = window.setInterval(observeNew, 200);
    const stop = window.setTimeout(() => window.clearInterval(poll), 2500);
    window.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", mark);
    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(stop);
      window.removeEventListener("scroll", mark);
      window.removeEventListener("resize", mark);
    };
  }, [path]);

  useEffect(() => {
    let lockHref = "";
    let lockUntil = 0;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.(".f-nav a, .pr02 nav a");
      if (!link) return;
      lockHref = link.getAttribute("href") || "";
      lockUntil = performance.now() + 900;
    };
    const marks = () => {
      const header = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72;
      const y = window.scrollY + header + 28;
      const links = [...document.querySelectorAll<HTMLAnchorElement>(".f-nav a, .pr02 nav a")];
      const visible = links.filter((link) => {
        const id = link.getAttribute("href")?.replace("#", "");
        const target = id ? document.getElementById(id) : null;
        return !!target && target.offsetHeight >= 8;
      });
      links.forEach((link) => link.classList.remove("is-on"));
      const progress = document.querySelector<HTMLElement>(".pr-progress");
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max <= 0 ? 0 : Math.min(100, Math.round((window.scrollY / max) * 100));
        progress.textContent = `Прочитано ${pct}%`;
      }
      if (lockHref && performance.now() < lockUntil) {
        links.find((link) => link.getAttribute("href") === lockHref)?.classList.add("is-on");
        return;
      }
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
      if (atEnd && visible.length) {
        visible[visible.length - 1].classList.add("is-on");
        return;
      }
      const active: { link: HTMLAnchorElement | null; top: number } = { link: null, top: -1 };
      visible.forEach((link) => {
        const id = link.getAttribute("href")?.replace("#", "") ?? "";
        const target = document.getElementById(id);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY;
        if (top <= y && top >= active.top) {
          active.link = link;
          active.top = top;
        }
      });
      (active.link ?? visible[0])?.classList.add("is-on");
    };
    marks();
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", marks, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", marks);
    };
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
      {barEligible && (
        <div className={`m04${bar ? " is-on" : ""}`} role="region" aria-label="Записаться на тест" aria-hidden={!bar}>
          <button className="btn btn-dark" type="button" onClick={openBook} tabIndex={bar ? 0 : -1}>Записаться на тест</button>
        </div>
      )}
      {book && <BookModal initialLab={book.lab} onClose={() => setBook(null)} />}
      {contact && <ContactModal onClose={() => setContact(false)} />}
      <div className="fox-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            item={toast}
            onLeave={() => setToasts((current) => current.map((item) => (item.id === toast.id ? { ...item, out: true } : item)))}
            onGone={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          />
        ))}
      </div>
    </>
  );
}

function Toast({ item, onLeave, onGone }: { item: ToastItem; onLeave: () => void; onGone: () => void }) {
  const left = useRef(item.duration);
  const started = useRef(0);
  const timer = useRef(0);

  function arm() {
    if (!item.duration || item.out) return;
    started.current = performance.now();
    timer.current = window.setTimeout(onLeave, left.current);
  }
  function pause() {
    if (!item.duration) return;
    window.clearTimeout(timer.current);
    left.current = Math.max(400, left.current - (performance.now() - started.current));
  }

  useEffect(() => {
    if (item.out) {
      const gone = window.setTimeout(onGone, 200);
      return () => window.clearTimeout(gone);
    }
    arm();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.out]);

  return (
    <p
      className={`fox-toast is-${item.type}${item.out ? " is-out" : ""}`}
      role={item.type === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={arm}
    >
      {item.text}
      {item.type === "error" && (
        <button type="button" aria-label="Закрыть уведомление" onClick={onLeave}>×</button>
      )}
    </p>
  );
}

/**
 * Modal frame from Figma 07: 568 · r20 · scrim 50%; on ≤1100px a bottom sheet with a grabber —
 * a drag down by more than 30% of the sheet height closes it (G12).
 */
function ModalShell({
  label,
  className = "",
  onClose,
  canScrimClose = () => true,
  children,
}: {
  label: string;
  className?: string;
  onClose: () => void;
  canScrimClose?: () => boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);
  const [dy, setDy] = useState(0);
  useDialog(ref, onClose);

  return (
    <div
      className="modal-back"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && canScrimClose()) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
      >
        <span
          className="sheet-grab"
          aria-hidden
          onPointerDown={(event) => {
            drag.current = { y: event.clientY, h: ref.current?.offsetHeight ?? 1 };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current) setDy(Math.max(0, event.clientY - drag.current.y));
          }}
          onPointerUp={() => {
            const state = drag.current;
            drag.current = null;
            if (state && dy > state.h * 0.3) onClose();
            else setDy(0);
          }}
        />
        <button className="lead-x" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        {children}
      </div>
    </div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const dirty = useRef(false);
  return (
    <ModalShell label="Связаться с нами" className="lead-modal" onClose={onClose} canScrimClose={() => !dirty.current}>
      <LeadForm
        variant="modal"
        title="Связаться с нами"
        subtitle="Ответим в течение одного рабочего дня"
        onClose={onClose}
        onDirtyChange={(value) => {
          dirty.current = value;
        }}
      />
    </ModalShell>
  );
}

type BookLab = Pick<Partner, "name" | "logo" | "count" | "href">;
type BookCity = { name: string; labs: BookLab[] };

const MOSCOW_LABS: BookLab[] = PARTNERS.filter((item) => item.here);
const BOOK_CITIES: BookCity[] = [
  { name: "Москва", labs: MOSCOW_LABS },
  {
    name: "Московская область",
    labs: [
      { name: "Ситилаб", logo: "/figma/labs/citilab.svg", count: "40 отделений", href: "https://citilab.ru" },
      { name: "Гемотест", logo: "/figma/labs/gemotest.svg", count: "22 отделения", href: "https://gemotest.ru" },
    ],
  },
  { name: "Моздок", labs: [] },
];

const CITY_CASE: Record<string, string> = {
  Москва: "Москве",
  "Московская область": "Московской области",
  Моздок: "Моздоке",
};

function inCity(name: string) {
  return CITY_CASE[name] || name;
}

function branches(city: BookCity) {
  return city.labs.reduce((sum, lab) => sum + (parseInt(lab.count, 10) || 0), 0);
}

function cityMeta(city: BookCity) {
  if (!city.labs.length) return "пока нет партнёров";
  const n = city.labs.length;
  const b = branches(city);
  return `${n} ${plural(n, "сеть", "сети", "сетей")} · ${b} ${plural(b, "отделение", "отделения", "отделений")}`;
}

function StepMark({ step }: { step: 1 | 2 }) {
  return (
    <p className="book-step">
      <i className="on" />
      <i className={step === 2 ? "on" : ""} />
      Шаг {step} из 2
    </p>
  );
}

/** «Записаться на тест» — 5 states from Figma 05 (1253:789): city → network → redirect · no partners → subscribed. */
function BookModal({ initialLab, onClose }: { initialLab?: string; onClose: () => void }) {
  const preset = initialLab ? MOSCOW_LABS.find((item) => item.name === initialLab) ?? null : null;
  const [step, setStep] = useState<"city" | "labs" | "redirect" | "empty" | "done">(preset ? "labs" : "city");
  const [query, setQuery] = useState(preset ? "Москва" : "");
  const [city, setCity] = useState(preset ? "Москва" : "");
  const [geo, setGeo] = useState<"" | "busy" | "fail">("");
  const [lab, setLab] = useState<BookLab | null>(preset);
  const [all, setAll] = useState(false);
  const [mail, setMail] = useState("");
  const [mailError, setMailError] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const matches = BOOK_CITIES.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = BOOK_CITIES.find((item) => item.name === city);
  const nearby = BOOK_CITIES.filter((item) => item.name !== city && item.labs.length > 0);
  const labs = chosen ? (all ? chosen.labs : chosen.labs.slice(0, 4)) : [];

  function goCity() {
    const hit = BOOK_CITIES.find((item) => item.name.toLowerCase() === (city || query).trim().toLowerCase());
    const name = hit?.name || query.trim();
    if (name.length < 2) return;
    setCity(name);
    setLab(null);
    setAll(false);
    setStep(!hit || hit.labs.length === 0 ? "empty" : "labs");
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeo("fail");
      return;
    }
    setGeo("busy");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const name =
          lat > 55.49 && lat < 55.96 && lng > 37.32 && lng < 37.97
            ? "Москва"
            : lat > 54.25 && lat < 56.96 && lng > 35.14 && lng < 40.21
              ? "Московская область"
              : "";
        if (!name) {
          setGeo("fail");
          return;
        }
        setGeo("");
        setQuery(name);
        setCity(name);
      },
      () => setGeo("fail"),
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  function go(target: BookLab) {
    // Open the lab page in a new tab right from the click; the redirect state keeps a manual link (step 03).
    window.open(withUtm(target.href), "_blank", "noopener");
    setStep("redirect");
  }

  function checkMail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? "" : value.includes("@") ? `Укажите e-mail целиком: ${value.trim()}${value.trim().includes(".") ? "" : ".ru"}` : "Укажите e-mail";
  }

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = checkMail(mail);
    setMailError(error);
    if (error || !consent) return;
    setSending(true);
    const started = performance.now();
    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "book-wait", city, contact: mail }),
      });
      if (!response.ok) throw new Error("fail");
      const rest = 600 - (performance.now() - started);
      if (rest > 0) await new Promise((resolve) => window.setTimeout(resolve, rest));
      setStep("done");
    } catch {
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Нет соединения — почта сохранена, попробуйте ещё раз", type: "error" } }));
    } finally {
      setSending(false);
    }
  }

  return (
    <ModalShell label="Записаться на тест" className="book-sheet" onClose={onClose} canScrimClose={() => !mail.trim()}>
      <div className="book-anim" key={step} data-book-step={step}>
        {step === "city" && (
          <div className="book-steps">
            <StepMark step={1} />
            <h2>Где вам удобно сдать тест?</h2>
            <p className="lead-note">Покажем сети, где есть FOX.</p>
            <div className="book-city">
              <img src="/icons/pin.svg" alt="" width={16} height={16} />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCity("");
                  setGeo("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    goCity();
                  }
                }}
                placeholder="Город"
                aria-label="Город для записи"
                autoComplete="off"
              />
              <button type="button" className="book-geo" onClick={locate} disabled={geo === "busy"}>
                {geo === "busy" ? "Определяем…" : "Определить по гео"}
              </button>
            </div>
            {geo === "fail" && <span className="err">Не получилось определить город — выберите из списка</span>}
            <div className="book-list" role="listbox" aria-label="Город">
              {(query.trim() && !city ? matches : BOOK_CITIES).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={city === item.name}
                  className={city === item.name ? "is-on" : ""}
                  onClick={() => {
                    setCity(item.name);
                    setQuery(item.name);
                  }}
                >
                  <strong>{item.name}</strong>
                  <span>{cityMeta(item)}</span>
                </button>
              ))}
            </div>
            <p className="book-fine">Список сетей на шаге 2 зависит от города</p>
            <button className="btn btn-dark book-cta" type="button" onClick={goCity} disabled={query.trim().length < 2}>Продолжить</button>
          </div>
        )}
        {step === "labs" && chosen && (
          <div className="book-steps">
            <StepMark step={2} />
            <h2>Выберите лабораторию в {inCity(chosen.name)}</h2>
            <div className="book-list" role="radiogroup" aria-label="Сеть лабораторий">
              {labs.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  role="radio"
                  aria-checked={lab?.name === item.name}
                  className={`book-lab${lab?.name === item.name ? " is-on" : ""}`}
                  onClick={() => setLab(item)}
                  onDoubleClick={() => go(item)}
                >
                  <img src={item.logo} alt="" width={88} height={28} />
                  <span><strong>{item.count}</strong><small>{item.name}</small></span>
                  <i className="book-radio" />
                </button>
              ))}
            </div>
            {chosen.labs.length > 4 && !all && (
              <button type="button" className="book-more" onClick={() => setAll(true)}>
                Всего {chosen.labs.length} {plural(chosen.labs.length, "сеть", "сети", "сетей")} · Смотреть ещё {chosen.labs.length - 4}
              </button>
            )}
            <p className="book-fine is-box">Цену и условия устанавливает лаборатория. Сайт сети откроется в новой вкладке.</p>
            <div className="book-row">
              <button className="btn btn-dark" type="button" disabled={!lab} onClick={() => lab && go(lab)}>
                Перейти на сайт {lab?.name || "сети"}
              </button>
              <button className="book-back" type="button" onClick={() => setStep("city")}>← Назад к выбору города</button>
            </div>
          </div>
        )}
        {step === "redirect" && lab && (
          <div className="book-steps book-go">
            <div className="book-logos">
              <img src="/icons/logo-dark.svg" alt="FOX" width={72} height={32} />
              <span className="book-dots" aria-hidden><i /><i /><i /></span>
              <img src={lab.logo} alt="" width={96} height={32} />
            </div>
            <h2>Открываем сайт {lab.name}…</h2>
            <p className="lead-note">Страница теста FOX откроется в новой вкладке. На сайте сети можно выбрать отделение, время и оплатить исследование.</p>
            <p className="book-progress" aria-hidden><i /></p>
            <p className="book-fine">
              Вкладка не открылась?{" "}
              <a href={withUtm(lab.href)} target="_blank" rel="noreferrer">Открыть ссылку вручную</a>
            </p>
            <button className="book-back" type="button" onClick={() => setStep("labs")}>← Вернуться к списку</button>
          </div>
        )}
        {step === "empty" && (
          <form className="book-steps" onSubmit={subscribe} noValidate>
            <h2>В {inCity(city || "этом городе")} пока нет партнёров</h2>
            <p className="lead-note">Можно сдать тест в соседнем городе или оставить почту — сообщим, когда появится.</p>
            <div className="book-list">
              {nearby.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="book-near"
                  onClick={() => {
                    setCity(item.name);
                    setQuery(item.name);
                    setLab(null);
                    setStep("labs");
                  }}
                >
                  <span className="book-pin" aria-hidden />
                  <span><strong>{item.name}</strong><small>{cityMeta(item)}</small></span>
                  <span aria-hidden>→</span>
                </button>
              ))}
            </div>
            <p className="book-or"><span>или</span></p>
            <label className={`field${mailError ? " is-error" : ""}`}>
              <span className="sr-only">Почта</span>
              <input
                type="email"
                value={mail}
                placeholder="Ваш e-mail"
                readOnly={sending}
                onChange={(event) => {
                  setMail(event.target.value);
                  if (mailError) setMailError(checkMail(event.target.value));
                }}
                onBlur={() => mail.trim() && setMailError(checkMail(mail))}
                aria-label="Почта, когда появится тест"
                aria-invalid={!!mailError}
              />
              <span className={`lf-err${mailError ? " is-on" : ""}`}><span className="err">{mailError}</span></span>
            </label>
            <label className="lf-consent">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span className="lf-box" aria-hidden />
              <span>Согласен на обработку персональных данных (152-ФЗ)</span>
            </label>
            <div className="book-row">
              <button className={`btn btn-dark${sending ? " is-loading" : ""}`} type="submit" disabled={sending || !consent}>Сообщить, когда появится</button>
            </div>
          </form>
        )}
        {step === "done" && (
          <div className="book-steps book-go is-center">
            <span className="lf-done-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" /></svg>
            </span>
            <h2>Готово, мы напишем</h2>
            <p className="lead-note">
              Когда тест FOX появится в {inCity(city || "этом городе")}, пришлём одно письмо на {mail}. Пока можно почитать, как устроен отчёт.
            </p>
            <div className="book-row">
              <a className="btn btn-dark" href="/report">Как читать отчёт</a>
              <button className="btn btn-text" type="button" onClick={onClose}>Закрыть</button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
