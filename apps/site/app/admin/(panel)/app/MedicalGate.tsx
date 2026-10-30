"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { closeMedical, openMedical } from "./actions";

const REASONS = ["Модерация отчёта", "Обращение клиента в поддержку", "Проверка качества распознавания", "Запрос клиента на выгрузку данных"];

/* The medical part of a client's card or report. Closed by default: the role must allow it, 2FA must be on, and the
   staff member picks a reason, which opens this client's data to them for 30 minutes and goes to the log. */
export function MedicalGate({ userId, allowed, mfa, grantUntil, hasData, children }: {
  userId: string; allowed: boolean; mfa: boolean; grantUntil: string | null; hasData: boolean; children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!grantUntil) { setLeft(null); return; }
    const tick = () => {
      const ms = new Date(grantUntil).getTime() - Date.now();
      setLeft(ms > 0 ? Math.ceil(ms / 60_000) : 0);
      if (ms <= 0) router.refresh();
    };
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => window.clearInterval(t);
  }, [grantUntil, router]);

  return (
    <section className="a-card a-medical">
      <div className="a-card-head">
        <h2>Медданные</h2>
        {grantUntil && left !== null && left > 0 && <span className="a-badge rp-review">открыто ещё {left} мин</span>}
      </div>
      {!hasData ? (
        <p className="muted">Отчёта нет, медданных тоже.</p>
      ) : !allowed ? (
        <p className="muted">Результаты анализа, PDF и зоны видят только модератор отчётов и администратор.</p>
      ) : !mfa ? (
        <p className="muted">Чтобы открыть результаты, включите <Link className="a-link" href="/admin/account?mfa=required#mfa">двухфакторный вход</Link> в профиле.</p>
      ) : grantUntil ? (
        <div className="a-stack" style={{ gap: 16 }}>
          {children}
          <div className="a-actions">
            <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => start(async () => { await closeMedical(userId); router.refresh(); })}>Закрыть доступ</button>
          </div>
        </div>
      ) : (
        <form className="a-form" onSubmit={(e) => {
          e.preventDefault();
          setError("");
          start(async () => {
            const r = await openMedical(userId, reason === "other" ? other : reason);
            if (!r.ok) setError(r.message ?? "Не получилось");
            else router.refresh();
          });
        }}>
          <p className="muted">Результаты закрыты. Откройте их, только если это нужно для работы: доступ на 30 минут, причина и время попадут в журнал.</p>
          {error && <div className="a-error" role="alert">{error}</div>}
          <label className="a-field"><span>Причина</span>
            <select className="a-input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="other">Другая причина…</option>
            </select>
          </label>
          {reason === "other" && <label className="a-field"><span>Опишите причину</span><input className="a-input" value={other} onChange={(e) => setOther(e.target.value)} maxLength={300} /></label>}
          <div><button className="a-btn" type="submit" disabled={pending}>Открыть на 30 минут</button></div>
        </form>
      )}
    </section>
  );
}
