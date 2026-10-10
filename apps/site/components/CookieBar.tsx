"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useDialog } from "@/components/useDialog";

type Choice = { necessary: true; analytics: boolean; ads: boolean };

/*
 * Figma 07 · G07–G09: the banner appears 800мс after load (desktop and 390 alike),
 * leaves downwards in 200мс after any choice; «Настроить» opens the settings modal (G08),
 * and only «Сохранить выбор» there shows the toast «Настройки сохранены» for 3 s.
 */
export function CookieBar() {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("fox-cookie")) return;
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  function save(choice: Choice, toast = false) {
    localStorage.setItem("fox-cookie", JSON.stringify(choice));
    setSettings(false);
    if (toast) window.dispatchEvent(new CustomEvent("fox:toast", { detail: { text: "Настройки сохранены", type: "success" } }));
    if (prefersReducedMotion()) {
      setOpen(false);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, 200);
  }

  return (
    <>
      {open && (
        <div className={`cookie fox-cookie${leaving ? " is-leaving" : ""}`} role="region" aria-label="Cookie">
          {/* Figma Cookie / Banner (1299:2174 desktop · 1299:2398 390): Graphic / Cookie, title + text, three buttons. */}
          <img className="ck-graphic" src="/icons/cookie.svg" alt="" width={56} height={56} />
          <div className="ck-copy">
            <strong>Мы используем cookie</strong>
            <p>Для работы сайта, аналитики посещений и измерения рекламы. Можно принять все или только необходимые.</p>
          </div>
          <div className="ck-actions">
            <button className="btn btn-dark" type="button" onClick={() => save({ necessary: true, analytics: true, ads: true })}>
              Принять все
            </button>
            <button className="btn ck-outline" type="button" onClick={() => save({ necessary: true, analytics: false, ads: false })}>
              Только необходимые
            </button>
            <button className="btn ck-text" type="button" onClick={() => setSettings(true)}>
              Настроить
            </button>
          </div>
        </div>
      )}
      {settings && (
        <CookieSettings
          analytics={analytics}
          ads={ads}
          onAnalytics={setAnalytics}
          onAds={setAds}
          onClose={() => setSettings(false)}
          onSave={() => save({ necessary: true, analytics, ads }, true)}
          onAcceptAll={() => save({ necessary: true, analytics: true, ads: true }, true)}
        />
      )}
    </>
  );
}

function CookieSettings({
  analytics,
  ads,
  onAnalytics,
  onAds,
  onClose,
  onSave,
  onAcceptAll,
}: {
  analytics: boolean;
  ads: boolean;
  onAnalytics: (value: boolean) => void;
  onAds: (value: boolean) => void;
  onClose: () => void;
  onSave: () => void;
  onAcceptAll: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, onClose);
  const rows: { title: string; note: string; on: boolean; set?: (value: boolean) => void }[] = [
    { title: "Необходимые", note: "Сессия, город, выбор cookie", on: true },
    { title: "Аналитика", note: "Яндекс Метрика — как пользуются сайтом", on: analytics, set: onAnalytics },
    { title: "Реклама", note: "Измерение эффективности кампаний", on: ads, set: onAds },
  ];
  return (
    <div className="modal-back" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={ref} className="modal cookie-modal ck-modal" role="dialog" aria-modal="true" aria-label="Настройки cookie">
        <span className="sheet-grab" aria-hidden />
        <button className="lead-x" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        {/* Figma 1299:2239 «modal · 568»: Graphic / Cookie + title, rows on grey plates, «Сохранить выбор» + «Принять все». */}
        <div className="ck-head">
          <img src="/icons/cookie.svg" alt="" width={56} height={56} />
          <h2>Настройки cookie</h2>
        </div>
        <p className="lead-note">Выберите, что можно сохранять. Необходимые нужны для работы сайта и всегда включены.</p>
        {rows.map((row) => (
          <div className="switch-row" key={row.title}>
            <span>
              <strong>{row.title}</strong>
              <small>{row.note}</small>
            </span>
            <button
              type="button"
              className={`switch${row.on ? " is-on" : ""}`}
              role="switch"
              aria-checked={row.on}
              aria-label={row.title}
              disabled={!row.set}
              onClick={() => row.set?.(!row.on)}
            />
          </div>
        ))}
        <div className="cookie-modal-actions">
          <button className="btn btn-dark" type="button" onClick={onSave}>Сохранить выбор</button>
          <button className="btn ck-outline" type="button" onClick={onAcceptAll}>Принять все</button>
        </div>
      </div>
    </div>
  );
}
