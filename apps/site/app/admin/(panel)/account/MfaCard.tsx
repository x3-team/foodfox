"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmMfa, disableMfa, startMfa } from "./mfa-actions";

export function MfaCard({ enabled, required }: { enabled: boolean; required: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const done = (r: { ok: boolean; message?: string }) => {
    setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });
    if (r.ok) { setSetup(null); setCode(""); router.refresh(); }
  };

  return (
    <section className="a-card" id="mfa" style={required && !enabled ? { borderColor: "var(--a-dark)" } : undefined}>
      <div className="a-card-head">
        <h2>Двухфакторный вход</h2>
        {enabled ? <span className="a-badge s-done">Включён</span> : <span className="a-badge is-off">Выключен</span>}
      </div>
      {required && !enabled && <div className="a-note" style={{ marginBottom: 16 }}>Отчёты и медданные клиентов открываются только с двухфакторным входом. Подключите его, это займёт минуту.</div>}
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}

      {enabled ? (
        <form className="a-form" onSubmit={(e) => { e.preventDefault(); start(async () => done(await disableMfa(code))); }}>
          <p className="muted">При входе после пароля спрашиваем код из приложения-аутентификатора. Чтобы выключить, введите текущий код.</p>
          <label className="a-field"><span>Код</span><input className="a-input a-code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000 000" /></label>
          <button className="a-btn is-ghost" type="submit" disabled={pending || code.replace(/\D/g, "").length !== 6}>Выключить</button>
        </form>
      ) : setup ? (
        <form className="a-form" onSubmit={(e) => { e.preventDefault(); start(async () => done(await confirmMfa(code))); }}>
          <ol className="a-steps">
            <li>Откройте Яндекс Ключ, Google Authenticator или другое приложение для кодов.</li>
            <li>Отсканируйте QR-код или введите ключ вручную.</li>
            <li>Введите 6 цифр, которые покажет приложение.</li>
          </ol>
          <div className="a-qr">
            <div className="a-qr-img" dangerouslySetInnerHTML={{ __html: setup.qr }} />
            <div>
              <small className="muted">Ключ для ручного ввода</small>
              <code className="a-secret">{setup.secret}</code>
            </div>
          </div>
          <label className="a-field"><span>Код из приложения</span><input className="a-input a-code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000 000" autoFocus /></label>
          <div className="a-actions">
            <button className="a-btn is-lime" type="submit" disabled={pending || code.replace(/\D/g, "").length !== 6}>Подтвердить и включить</button>
            <button className="a-btn is-ghost" type="button" onClick={() => { setSetup(null); setCode(""); }}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="a-form">
          <p className="muted">После пароля админка будет спрашивать 6-значный код из приложения на телефоне. Нужен, чтобы открывать отчёты и медданные клиентов.</p>
          <button className="a-btn is-lime" type="button" disabled={pending} onClick={() => start(async () => {
            const r = await startMfa();
            if (r.ok && r.qr && r.secret) { setSetup({ qr: r.qr, secret: r.secret }); setMsg(null); } else done(r);
          })}>Подключить</button>
        </div>
      )}
    </section>
  );
}
