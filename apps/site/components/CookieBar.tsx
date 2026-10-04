"use client";

import { useEffect, useState } from "react";

type Choice = { necessary: true; analytics: boolean };

export function CookieBar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("fox-cookie")) return;
    const timer = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettings(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings]);

  function save(choice: Choice) {
    localStorage.setItem("fox-cookie", JSON.stringify(choice));
    setOpen(false);
    setSettings(false);
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  }

  return (
    <>
      {open && (
        <div className="cookie" role="dialog" aria-label="Cookie">
          <img src="/icons/pin.svg" alt="" width={28} height={28} />
          <div>
            <strong>Cookie</strong>
            <p>Нужные cookie держат сайт. Аналитику можно не включать.</p>
          </div>
          <div className="cookie-actions">
            <button className="btn btn-dark" type="button" onClick={() => save({ necessary: true, analytics: true })}>Принять все</button>
            <button className="btn btn-ghost" type="button" onClick={() => save({ necessary: true, analytics: false })}>Только необходимые</button>
            <button className="btn btn-ghost" type="button" onClick={() => setSettings(true)}>Настроить</button>
          </div>
        </div>
      )}
      {settings && (
        <div className="modal-back" onClick={() => setSettings(false)}>
          <div className="modal" role="dialog" aria-label="Настройки cookie" onClick={(event) => event.stopPropagation()}>
            <h2>Настройки cookie</h2>
            <div className="switch-row">
              <span>Необходимые — всегда включены</span>
              <button type="button" className="switch is-on" role="switch" aria-checked="true" aria-label="Необходимые cookie" disabled />
            </div>
            <div className="switch-row">
              <span>Аналитика</span>
              <button type="button" className={`switch${analytics ? " is-on" : ""}`} role="switch" aria-checked={analytics} aria-label="Аналитика" onClick={() => setAnalytics((value) => !value)} />
            </div>
            <button className="btn btn-dark" type="button" onClick={() => save({ necessary: true, analytics })}>Сохранить</button>
          </div>
        </div>
      )}
      {toast && <p className="fox-toast" role="status">Настройки сохранены</p>}
    </>
  );
}
