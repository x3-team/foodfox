"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { blockAppUser, signOutAppUser, unblockAppUser, type AppResult } from "../../actions";

const TERMS = [{ v: "", l: "Бессрочно" }, { v: "1", l: "1 день" }, { v: "7", l: "7 дней" }, { v: "30", l: "30 дней" }];

export function UserActions({ id, blocked, devices }: { id: string; blocked: boolean; devices: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const run = (fn: () => Promise<AppResult>) => start(async () => {
    const r = await fn();
    setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });
    if (r.ok) { setOpen(false); setReason(""); router.refresh(); }
  });

  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Доступ</h2></div>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
      {open ? (
        <form className="a-form" onSubmit={(e) => { e.preventDefault(); run(() => blockAppUser(id, { reason, days: days ? Number(days) : null })); }}>
          <label className="a-field"><span>Причина</span><textarea className="a-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Например: передал аккаунт третьим лицам" required /></label>
          <label className="a-field"><span>Срок</span>
            <select className="a-input" value={days} onChange={(e) => setDays(e.target.value)}>{TERMS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
          </label>
          <small className="muted">Клиент сразу выйдет на всех устройствах и не сможет войти по SMS, пока блокировка действует.</small>
          <div className="a-actions">
            <button className="a-btn is-danger" type="submit" disabled={pending || reason.trim().length < 3}>Заблокировать</button>
            <button className="a-btn is-ghost" type="button" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="a-actions">
          {blocked
            ? <button className="a-btn" type="button" disabled={pending} onClick={() => window.confirm("Разблокировать клиента?") && run(() => unblockAppUser(id))}>Разблокировать</button>
            : <button className="a-btn is-danger" type="button" disabled={pending} onClick={() => setOpen(true)}>Заблокировать</button>}
          <button className="a-btn is-ghost" type="button" disabled={pending}
            onClick={() => window.confirm(`Завершить все входы клиента${devices ? ` (${devices})` : ""}? Ему придётся войти по SMS заново.`) && run(() => signOutAppUser(id))}>Выйти на всех устройствах</button>
        </div>
      )}
    </section>
  );
}
