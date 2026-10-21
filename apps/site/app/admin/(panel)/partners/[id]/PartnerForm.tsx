"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PARTNER_STATUSES } from "@/lib/admin/partners";
import { savePartner, type PartnerInput } from "../actions";

export function PartnerForm({ id, initial, defaultFee }: { id: string | null; initial: PartnerInput; defaultFee: number }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const set = (key: keyof PartnerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <aside className="a-card a-sticky">
      <div className="a-card-head"><h2>Карточка</h2></div>
      <form className="a-form" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePartner(id, form);
          setMsg({ text: r.message ?? "", error: !r.ok });
          if (r.ok && !id && r.id) router.push(`/admin/partners/${r.id}`);
          else if (r.ok) router.refresh();
        });
      }}>
        {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status">{msg.text}</div>}
        <label className="a-field"><span>Фамилия и имя</span><input className="a-input" value={form.full_name} onChange={set("full_name")} required /></label>
        <label className="a-field"><span>Телефон для входа в кабинет</span><input className="a-input" type="tel" value={form.phone} onChange={set("phone")} required placeholder="+7 900 000-00-00" /></label>
        <label className="a-field"><span>Почта</span><input className="a-input" type="email" value={form.email} onChange={set("email")} /></label>
        <div className="a-row">
          <label className="a-field"><span>Специализация</span><input className="a-input" value={form.specialty} onChange={set("specialty")} /></label>
          <label className="a-field"><span>Город</span><input className="a-input" value={form.city} onChange={set("city")} /></label>
        </div>
        <label className="a-field"><span>Статус</span>
          <select className="a-input" value={form.status} onChange={set("status")}>
            {Object.entries(PARTNER_STATUSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <small>В кабинет входят «Одобрен» и «Сертифицирован».</small>
        </label>
        <div className="a-row">
          <label className="a-field"><span>Промокод</span><input className="a-input" value={form.promo_code} onChange={set("promo_code")} placeholder="создастся сам" /></label>
          <label className="a-field"><span>Сертификат курса</span><input className="a-input" value={form.certificate_no} onChange={set("certificate_no")} /></label>
        </div>
        <label className="a-field"><span>Способ выплаты</span><input className="a-input" value={form.payout_method} onChange={set("payout_method")} placeholder="Самозанятый · СБП •••• 4417" /></label>
        <label className="a-field"><span>Вознаграждение за отчёт, ₽</span><input className="a-input" inputMode="numeric" value={form.fee} onChange={set("fee")} placeholder={`общее: ${defaultFee}`} /><small>Пусто — общее из раздела «Цены».</small></label>
        <label className="a-field"><span>Заметки (видны только в админке)</span><textarea className="a-input" rows={3} style={{ minHeight: 0 }} value={form.notes} onChange={set("notes")} /></label>
        <button className="a-btn" type="submit" disabled={pending || (!dirty && Boolean(id))}>{pending ? "Сохраняем…" : id ? "Сохранить" : "Добавить партнёра"}</button>
      </form>
    </aside>
  );
}
