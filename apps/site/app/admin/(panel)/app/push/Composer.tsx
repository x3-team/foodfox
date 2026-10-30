"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendCampaign } from "./actions";

type Seg = { id: string; label: string; hint: string; count: number };

const MAX = 1000;

export function Composer({ segments }: { segments: Seg[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState(segments[0]?.id ?? "all");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const seg = segments.find((s) => s.id === segment);
  const ready = title.trim().length >= 3 && body.trim().length >= 5 && body.length <= MAX && Boolean(seg?.count);

  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Новая рассылка</h2></div>
      {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
      <form className="a-form" onSubmit={(e) => {
        e.preventDefault();
        if (!seg || !window.confirm(`Отправить сообщение ${seg.count} клиентам («${seg.label}»)? Отменить отправку будет нельзя.`)) return;
        start(async () => {
          const r = await sendCampaign({ title, body, segment, expected: seg.count });
          setMsg({ text: r.message ?? (r.ok ? "Отправлено" : "Ошибка"), error: !r.ok });
          if (r.ok) { setTitle(""); setBody(""); router.refresh(); }
        });
      }}>
        <fieldset className="a-field a-segments">
          <span>Кому</span>
          {segments.map((s) => (
            <label key={s.id} className={`a-segment${segment === s.id ? " is-on" : ""}`}>
              <input type="radio" name="segment" value={s.id} checked={segment === s.id} onChange={() => setSegment(s.id)} />
              <span><b>{s.label}</b><small className="muted">{s.hint}</small></span>
              <i className="num">{s.count}</i>
            </label>
          ))}
        </fieldset>
        <label className="a-field"><span>Название для истории</span>
          <input className="a-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Напоминание загрузить отчёт, октябрь" />
        </label>
        <label className="a-field"><span>Сообщение клиенту</span>
          <textarea className="a-input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={MAX} placeholder="Здравствуйте! Загрузите PDF-отчёт FOX — помощник составит план питания на 8 недель." />
          <small className={body.length > MAX - 50 ? "" : "muted"} style={body.length > MAX - 50 ? { color: "var(--a-red)" } : undefined}>{body.length} / {MAX}</small>
        </label>
        <div className="a-field">
          <span>Так увидит клиент</span>
          <div className="a-phone-chat"><p className="a-bubble">{body.trim() || "Текст сообщения"}</p></div>
        </div>
        <div className="a-actions">
          <button className="a-btn is-lime" type="submit" disabled={pending || !ready}>{pending ? "Отправляем…" : seg ? `Отправить ${seg.count}` : "Отправить"}</button>
          {seg && !seg.count && <span className="muted">В этом сегменте сейчас никого нет</span>}
        </div>
      </form>
    </section>
  );
}
