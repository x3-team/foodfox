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
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        });
      },
      { threshold: 0.18 },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [path]);

  useEffect(() => {
    const marks = () => {
      const y = window.scrollY + 120;
      document.querySelectorAll<HTMLElement>(".f-nav a, .pr02 nav a").forEach((link) => {
        const id = link.getAttribute("href")?.replace("#", "");
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        const top = target.offsetTop;
        const next = target.parentElement?.nextElementSibling as HTMLElement | null;
        const bottom = next ? next.offsetTop : top + target.offsetHeight + 400;
        link.classList.toggle("is-on", y >= top && y < bottom);
      });
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
      {book && <LeadModal title="Записаться на тест" kind="book" onClose={() => setBook(false)} />}
      {contact && <LeadModal title="Связаться" kind="contact" onClose={() => setContact(false)} />}
      {toast && <p className="fox-toast" role="status">{toast}</p>}
    </>
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
