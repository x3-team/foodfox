"use client";

import { useEffect, useState } from "react";

type Choice = { necessary: true; analytics: boolean };

export function CookieBar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    setOpen(!localStorage.getItem("fox-cookie"));
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
  }

  if (!open && !settings) return null;

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
            <label className="check-row"><input type="checkbox" checked readOnly /><span>Необходимые — всегда включены</span></label>
            <label className="check-row"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /><span>Аналитика</span></label>
            <button className="btn btn-dark" type="button" onClick={() => save({ necessary: true, analytics })}>Сохранить</button>
          </div>
        </div>
      )}
    </>
  );
}
