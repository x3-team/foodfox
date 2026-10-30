import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff, ROLE_LABEL, type Role } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { dateTime } from "@/lib/admin/format";
import { channels, isNotifyKind, kindsFor, NOTIFY_KINDS, render } from "@/lib/admin/notify";
import { RunNow } from "./RunNow";

export const metadata: Metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  await requireStaff("notifications");
  const ch = channels();
  const [events, errors, people] = await Promise.all([
    q<{ id: string; kind: string; ref_id: string | null; payload: Record<string, unknown>; created_at: Date; processed_at: Date | null; result: Record<string, unknown> | null }>(
      "SELECT * FROM staff_notifications ORDER BY id DESC LIMIT 50",
    ),
    q<{ created_at: Date; channel: string; error: string | null; who: string | null }>(
      `SELECT l.created_at, l.channel, l.error, coalesce(nullif(u.name, ''), u.email) AS who FROM staff_notification_log l
         LEFT JOIN admin_users u ON u.id = l.staff_id WHERE NOT l.ok AND l.created_at > now() - interval '7 days' ORDER BY l.id DESC LIMIT 10`,
    ),
    q<{ name: string; role: Role; notify_email: boolean; notify_telegram: boolean; telegram: boolean; notify_kinds: string[] | null }>(
      `SELECT coalesce(nullif(name, ''), email) AS name, role, notify_email, notify_telegram, telegram_chat_id IS NOT NULL AS telegram, notify_kinds
         FROM admin_users WHERE is_active ORDER BY role, name`,
    ),
  ]);
  const resultText = (r: Record<string, unknown> | null, processed: Date | null) => {
    if (!processed) return "в очереди";
    if (!r) return "—";
    if (r.skipped) return `не отправлено: ${r.skipped}`;
    return `отправлено ${r.sent ?? 0}${r.failed ? `, ошибок ${r.failed}` : ""}`;
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Уведомления</h1>
          <p>Сотрудникам приходят письма и сообщения в Telegram о новых заявках, анкетах партнёров, нераспознанных отчётах, сканах актов и обращениях. Каждый выбирает события и каналы в своём <Link className="a-link" href="/admin/account">профиле</Link>. Отправка раз в минуту.</p>
        </div>
        <div className="a-head-actions"><RunNow /></div>
      </div>

      <div className="a-grid a-grid-2" style={{ marginBottom: 24 }}>
        <section className="a-card">
          <div className="a-card-head"><h2>Почта</h2>{ch.email ? <span className="a-badge s-done">настроена</span> : <span className="a-badge is-off">не настроена</span>}</div>
          <p className="muted" style={{ margin: 0 }}>SMTP-ящик в apps/web/.env: FOX_SMTP_HOST, FOX_SMTP_PORT, FOX_SMTP_USER, FOX_SMTP_PASS, FOX_SMTP_FROM.</p>
        </section>
        <section className="a-card">
          <div className="a-card-head"><h2>Telegram</h2>{ch.telegram ? <span className="a-badge s-done">бот подключён</span> : <span className="a-badge is-off">бот не подключён</span>}</div>
          <p className="muted" style={{ margin: 0 }}>Бот от @BotFather: FOX_TELEGRAM_BOT_TOKEN и FOX_TELEGRAM_BOT_NAME{ch.botName ? ` (@${ch.botName})` : ""}. Сотрудник привязывает свой чат кнопкой в профиле.</p>
        </section>
      </div>

      {errors.length > 0 && (
        <section className="a-card" style={{ marginBottom: 24 }}>
          <div className="a-card-head"><h2>Ошибки доставки за неделю</h2></div>
          <ul className="a-stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 8 }}>
            {errors.map((e, i) => <li key={i}><b style={{ fontWeight: 500 }}>{e.who ?? "—"}</b> · {e.channel} · {dateTime(e.created_at)}<div className="muted">{e.error}</div></li>)}
          </ul>
        </section>
      )}

      <section className="a-card" style={{ marginBottom: 24 }}>
        <div className="a-card-head"><h2>Кто что получает</h2></div>
        <div className="a-table-scroll">
          <table className="a-table">
            <thead><tr><th>Сотрудник</th><th>События</th><th>Каналы</th></tr></thead>
            <tbody>
              {people.map((p, i) => {
                const kinds = kindsFor(p.role).filter((k) => !p.notify_kinds || p.notify_kinds.includes(k));
                const ways = [p.notify_email && ch.email ? "почта" : "", p.notify_telegram && p.telegram && ch.telegram ? "Telegram" : ""].filter(Boolean);
                return (
                  <tr key={i}>
                    <td className="a-cell-main">{p.name}<span className="sub">{ROLE_LABEL[p.role]}</span></td>
                    <td data-label="События">{kinds.length ? kinds.map((k) => NOTIFY_KINDS[k].label).join(", ") : "—"}</td>
                    <td data-label="Каналы">{!kinds.length ? "—" : ways.length ? ways.join(", ") : "никуда"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="a-table-wrap">
        {events.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Событие</th><th>Когда</th><th>Результат</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="a-cell-main a-clip">
                      {isNotifyKind(e.kind) ? NOTIFY_KINDS[e.kind].label : e.kind}
                      <span className="sub">{isNotifyKind(e.kind) ? render(e.kind, e.ref_id ?? "", e.payload).subject.replace(/^FoodFox: /, "") : ""}</span>
                    </td>
                    <td data-label="Когда" className="nowrap">{dateTime(e.created_at)}</td>
                    <td data-label="Результат">{resultText(e.result, e.processed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Событий пока нет</b>Они появятся с первой заявкой, анкетой или обращением.</div>}
      </div>
    </>
  );
}
