"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAppAccount } from "../../actions";

/* Admin-only and irreversible: the reports, plan, chat and contacts go; see 014_account_deletion.sql. */
export function DeleteAccount({ id, hasPhone }: { id: string; hasPhone: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Удаление аккаунта</h2></div>
      {open ? (
        <form
          className="a-form"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await deleteAppAccount(id, confirm, reason);
              if (!r.ok) { setError(r.message ?? "Ошибка"); return; }
              router.replace("/admin/app/users?deleted=1");
            });
          }}
        >
          <p className="muted" style={{ margin: 0 }}>Удаляются отчёты и PDF, результаты, план, чат и контакты. В реестре согласий остаётся запись со скрытым телефоном. Отменить нельзя.</p>
          <label className="a-field"><span>Основание</span><input className="a-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Письмо клиента от 30.10" required /></label>
          {hasPhone && <label className="a-field"><span>Последние 4 цифры телефона</span><input className="a-input" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>}
          {error && <div className="a-error" role="status">{error}</div>}
          <div className="a-actions">
            <button className="a-btn is-danger" type="submit" disabled={pending}>{pending ? "Удаляем…" : "Удалить навсегда"}</button>
            <button className="a-btn is-ghost" type="button" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>По просьбе клиента или после отзыва согласия. Клиент может удалить аккаунт и сам, в профиле приложения.</p>
          <button className="a-btn is-danger" type="button" onClick={() => { setError(null); setOpen(true); }}>Удалить и обезличить</button>
        </>
      )}
    </section>
  );
}
