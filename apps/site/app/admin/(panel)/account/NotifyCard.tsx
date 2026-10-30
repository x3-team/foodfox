"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectTelegram, disconnectTelegram, saveNotifyPrefs, sendTest } from "./notify-actions";

type Props = {
  kinds: { id: string; label: string }[];
  selected: string[];
  email: { address: string; on: boolean; available: boolean };
  telegram: { on: boolean; connected: boolean; available: boolean };
};

/* Which events reach this staff member, and where: e-mail and/or Telegram. */
export function NotifyCard({ kinds, selected, email, telegram }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ email: email.on, telegram: telegram.on, kinds: selected });
  const [msg, setMsg] = useState<{ text: string; error?: boolean; link?: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; link?: string }>) => start(async () => {
    const r = await fn();
    setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok, link: r.link });
    if (r.ok && !r.link) router.refresh();
  });
  const toggle = (id: string) => setForm((f) => ({ ...f, kinds: f.kinds.includes(id) ? f.kinds.filter((k) => k !== id) : [...f.kinds, id] }));

  if (!kinds.length) return null;
  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Уведомления</h2></div>
      {msg && (
        <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>
          {msg.text}
          {msg.link && <> <a className="a-link" href={msg.link} target="_blank" rel="noreferrer">Открыть Telegram</a></>}
        </div>
      )}
      <form className="a-form" onSubmit={(e) => { e.preventDefault(); run(() => saveNotifyPrefs(form)); }}>
        <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>О чём сообщать</span>
          {kinds.map((k) => (
            <label key={k.id} className="a-check"><input type="checkbox" checked={form.kinds.includes(k.id)} onChange={() => toggle(k.id)} /> {k.label}</label>
          ))}
        </fieldset>
        <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Куда</span>
          <label className="a-check">
            <input type="checkbox" checked={form.email} onChange={(e) => setForm({ ...form, email: e.target.checked })} /> Почта {email.address}
            {!email.available && <small className="muted"> · почта на сервере ещё не настроена</small>}
          </label>
          <label className="a-check">
            <input type="checkbox" checked={form.telegram && telegram.connected} disabled={!telegram.connected} onChange={(e) => setForm({ ...form, telegram: e.target.checked })} /> Telegram
            {telegram.connected ? <small className="muted"> · подключён</small> : <small className="muted"> · не подключён</small>}
          </label>
        </fieldset>
        <div className="a-actions" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="a-btn" type="submit" disabled={pending}>Сохранить</button>
          {telegram.connected
            ? <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => run(disconnectTelegram)}>Отключить Telegram</button>
            : <button className="a-btn is-ghost" type="button" disabled={pending || !telegram.available} onClick={() => run(connectTelegram)}>Подключить Telegram</button>}
          <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => run(sendTest)}>Проверить</button>
        </div>
      </form>
    </section>
  );
}
