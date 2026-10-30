"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ago } from "@/lib/admin/format";
import { createUser, endSessions, resetMfa, resetPassword, updateUser, type UserResult } from "./actions";

export type UserRow = { id: string; email: string; name: string; role: string; active: boolean; mfa: boolean; sessions: number; lastLogin: string | null; me: boolean };
type RoleOption = { id: string; label: string; hint: string };

export function UsersManager({ users, roles }: { users: UserRow[]; roles: RoleOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "manager" });

  const run = (fn: () => Promise<UserResult>, after?: (r: UserResult) => void) => start(async () => {
    const r = await fn();
    if (!r.ok || r.message) {
      setToast({ text: r.message ?? "Ошибка", error: !r.ok });
      window.setTimeout(() => setToast(null), 3000);
    }
    if (r.ok) { after?.(r); router.refresh(); }
  });

  return (
    <div className="a-stack">
      {secret && (
        <div className="a-card" style={{ borderColor: "var(--a-dark)" }} role="alert">
          <h2 style={{ marginBottom: 8 }}>Пароль для {secret.email}</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Покажем один раз. Передайте его человеку, после входа он сменит пароль в своём профиле.</p>
          <div className="a-actions" style={{ alignItems: "center" }}>
            <code style={{ fontSize: 22, padding: "10px 16px", borderRadius: 8, background: "var(--a-lime-soft)", letterSpacing: 1 }}>{secret.password}</code>
            <button className="a-btn is-ghost is-small" type="button" onClick={() => navigator.clipboard?.writeText(`${location.origin}/admin/login\n${secret.email}\n${secret.password}`)}>Скопировать с адресом входа</button>
            <button className="a-btn is-small" type="button" onClick={() => setSecret(null)}>Готово</button>
          </div>
        </div>
      )}

      <section className="a-card">
        <div className="a-card-head"><h2>Добавить сотрудника</h2></div>
        <form className="a-filters" style={{ margin: 0 }} onSubmit={(e) => { e.preventDefault(); run(() => createUser(form), (r) => { setSecret({ email: form.email.trim().toLowerCase(), password: r.password! }); setForm({ email: "", name: "", role: "manager" }); }); }}>
          <label className="a-field is-search"><span>Почта</span><input className="a-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="a-field"><span>Имя</span><input className="a-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="a-field"><span>Роль</span>
            <select className="a-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <small>{roles.find((r) => r.id === form.role)?.hint}</small>
          </label>
          <button className="a-btn is-lime" type="submit" disabled={pending}>Добавить</button>
        </form>
      </section>

      <div className="a-table-wrap">
        <div className="a-table-scroll">
          <table className="a-table">
            <thead><tr><th>Сотрудник</th><th>Роль</th><th>Статус</th><th>2FA</th><th>Последний вход</th><th>Действия</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="a-cell-main"><b style={{ fontWeight: 500 }}>{u.name || u.email}{u.me ? " (вы)" : ""}</b><span className="sub">{u.email}</span></td>
                  <td data-label="Роль">
                    <select className="a-input" style={{ minHeight: 36, padding: "6px 36px 6px 12px", width: "auto" }} value={u.role} disabled={pending}
                      onChange={(e) => run(() => updateUser(u.id, { role: e.target.value }))} aria-label={`Роль ${u.email}`}>
                      {roles.map((r) => <option key={r.id} value={r.id} title={r.hint}>{r.label}</option>)}
                    </select>
                  </td>
                  <td data-label="Статус">{u.active ? <span className="a-badge s-done">Активен</span> : <span className="a-badge is-off">Заблокирован</span>}</td>
                  <td data-label="2FA">{u.mfa ? <span className="a-badge s-done">Включён</span> : <span className="a-badge s-spam">Нет</span>}</td>
                  <td data-label="Последний вход" className="nowrap">{u.lastLogin ? ago(u.lastLogin) : "не входил"}{u.sessions ? <span className="sub">сессий: {u.sessions}</span> : null}</td>
                  <td data-label="Действия">
                    <div className="a-row-actions">
                      <button className="a-btn is-ghost is-small" type="button" disabled={pending}
                        onClick={() => window.confirm(`Сбросить пароль ${u.email}? Все его сессии закроются.`) && run(() => resetPassword(u.id), (r) => setSecret({ email: u.email, password: r.password! }))}>Новый пароль</button>
                      {u.mfa && !u.me && <button className="a-btn is-ghost is-small" type="button" disabled={pending}
                        onClick={() => window.confirm(`Сбросить двухфакторный вход ${u.email}? Сотрудник подключит его заново из профиля.`) && run(() => resetMfa(u.id))}>Сбросить 2FA</button>}
                      {u.sessions > 0 && !u.me && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => run(() => endSessions(u.id))}>Выйти везде</button>}
                      {!u.me && (u.active
                        ? <button className="a-btn is-danger is-small" type="button" disabled={pending} onClick={() => window.confirm(`Заблокировать ${u.email}?`) && run(() => updateUser(u.id, { is_active: false }))}>Заблокировать</button>
                        : <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => run(() => updateUser(u.id, { is_active: true }))}>Разблокировать</button>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <div className={`a-toast${toast.error ? " is-error" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}
