import type { Metadata } from "next";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { requireStaff } from "@/lib/admin/auth";
import { appReady, SEGMENTS, segmentClients, type Segment } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { ago, dateTime } from "@/lib/admin/format";
import { Composer } from "./Composer";

export const metadata: Metadata = { title: "Рассылки" };
export const dynamic = "force-dynamic";

type Campaign = { id: string; title: string; body: string; segment: string; recipients: number; read: number; created_by_name: string; sent_at: Date | null; created_at: Date };

export default async function PushPage() {
  await requireStaff("app_push");
  if (!(await appReady())) return <AppNotReady />;
  const keys = Object.keys(SEGMENTS) as Segment[];
  const counts = await Promise.all(keys.map((k) => q<{ n: number }>(`SELECT count(*)::int AS n FROM (${segmentClients(k)}) s`).then((r) => r[0].n)));
  const campaigns = await q<Campaign>(
    `SELECT p.id, p.title, p.body, p.segment, p.recipients, p.created_by_name, p.sent_at, p.created_at,
            (SELECT count(*)::int FROM chat_messages m WHERE m.message_type = 'system' AND m.metadata->>'campaign_id' = p.id::text AND m.read_at IS NOT NULL) AS read
       FROM push_campaigns p ORDER BY p.created_at DESC LIMIT 50`,
  );
  const segments = keys.map((k, i) => ({ id: k, label: SEGMENTS[k].label, hint: SEGMENTS[k].hint, count: counts[i] }));

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Рассылки</h1>
          <p>Сообщение приходит в чат с помощником в приложении, от имени FOX. Заблокированные клиенты и партнёры не получают рассылки.</p>
        </div>
      </div>
      <div className="a-grid a-grid-side">
        <div className="a-stack">
          <Composer segments={segments} />
        </div>
        <div className="a-stack">
          <section className="a-card">
            <div className="a-card-head"><h2>Отправленные</h2></div>
            {campaigns.length ? (
              <ul className="a-feed a-campaigns">
                {campaigns.map((c) => {
                  const pct = c.recipients ? Math.round((c.read / c.recipients) * 100) : 0;
                  return (
                    <li key={c.id}>
                      <div>
                        <b>{c.title}</b>
                        <p className="muted">{c.body.length > 140 ? `${c.body.slice(0, 140)}…` : c.body}</p>
                        <small className="faint" title={c.sent_at ? dateTime(c.sent_at) : undefined}>
                          {SEGMENTS[c.segment as Segment]?.label ?? c.segment} · {c.recipients} получ. · прочитали {c.read} ({pct}%) · {c.created_by_name}, {ago(c.sent_at ?? c.created_at)}
                        </small>
                        <div className="a-meter" aria-label={`Прочитали ${pct}%`}><i style={{ width: `${pct}%` }} /></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="muted">Рассылок ещё не было.</p>}
          </section>
          <section className="a-card">
            <div className="a-card-head"><h2>Push-уведомления</h2></div>
            <p className="muted">Уведомления на экран телефона требуют сборки приложения с Firebase (Android) и APNs (iOS). Сборку запускаем только после согласования с Виталием; до этого рассылки идут в чат приложения, клиент видит их при следующем открытии.</p>
          </section>
        </div>
      </div>
    </>
  );
}
