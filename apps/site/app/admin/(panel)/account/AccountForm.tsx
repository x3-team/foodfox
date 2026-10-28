"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ago } from "@/lib/admin/format";
import { endMySession, updateMe } from "../users/actions";

type Session = { id: string; ip: string; ua: string; seen: string; current: boolean };

function device(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Браузер";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser}, ${os}` : browser;
}

export function AccountForm({ name, sessions }: { name: string; sessions: Session[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState({ name, current: "", next: "" });
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  return (
    <div className="a-grid a-grid-2">
      <section className="a-card">
        <div className="a-card-head"><h2>Имя и пароль</h2></div>
        <form className="a-form" onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateMe(state);
            setMsg({ text: r.message ?? (r.ok ? "Сохранено" : "Ошибка"), error: !r.ok });
            if (r.ok) { setState((s) => ({ ...s, current: "", next: "" })); router.refresh(); }
          });
        }}>
          {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status">{msg.text}</div>}
          <label className="a-field"><span>Имя</span><input className="a-input" value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} autoComplete="name" /></label>
          <hr className="a-divider" />
          <label className="a-field"><span>Текущий пароль</span><input className="a-input" type="password" value={state.current} onChange={(e) => setState({ ...state, current: e.target.value })} autoComplete="current-password" /></label>
          <label className="a-field"><span>Новый пароль</span><input className="a-input" type="password" value={state.next} onChange={(e) => setState({ ...state, next: e.target.value })} autoComplete="new-password" /><small>Не короче 10 символов, буквы и цифры. Другие сессии закроются.</small></label>
          <button className="a-btn" type="submit" disabled={pending}>Сохранить</button>
        </form>
      </section>
      <section className="a-card">
        <div className="a-card-head"><h2>Где вы вошли</h2></div>
        <ul className="a-feed">
          {sessions.map((s) => (
            <li key={s.id} style={{ alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span>{device(s.ua)}{s.current ? " · это устройство" : ""}</span>
                <small>{s.ip || "IP неизвестен"} · {ago(s.seen)}</small>
              </div>
              {!s.current && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => start(async () => { await endMySession(s.id); router.refresh(); })}>Завершить</button>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
