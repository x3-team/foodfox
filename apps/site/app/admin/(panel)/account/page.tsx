import type { Metadata } from "next";
import { ROLE_LABEL, requireStaff } from "@/lib/admin/auth";
import { one, q } from "@/lib/admin/db";
import { channels, kindsFor, NOTIFY_KINDS } from "@/lib/admin/notify";
import { AccountForm } from "./AccountForm";
import { MfaCard } from "./MfaCard";
import { NotifyCard } from "./NotifyCard";

export const metadata: Metadata = { title: "Профиль" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const staff = await requireStaff();
  const { mfa } = await searchParams;
  const sessions = await q<{ id: string; ip: string | null; user_agent: string | null; last_seen_at: Date; created_at: Date }>(
    "SELECT id, ip, user_agent, last_seen_at, created_at FROM admin_sessions WHERE user_id = $1 AND expires_at > now() AND NOT mfa_pending ORDER BY last_seen_at DESC",
    [staff.id],
  );
  const prefs = await one<{ notify_email: boolean; notify_telegram: boolean; notify_kinds: string[] | null; telegram_chat_id: string | null }>(
    "SELECT notify_email, notify_telegram, notify_kinds, telegram_chat_id FROM admin_users WHERE id = $1",
    [staff.id],
  );
  const kinds = kindsFor(staff.role);
  const ch = channels();
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Профиль</h1>
          <p>{staff.email} · {ROLE_LABEL[staff.role]}</p>
        </div>
      </div>
      <div className="a-stack">
        <MfaCard enabled={staff.mfa} required={mfa === "required"} />
        {prefs && (
          <NotifyCard
            kinds={kinds.map((id) => ({ id, label: NOTIFY_KINDS[id].label }))}
            selected={prefs.notify_kinds ?? kinds}
            email={{ address: staff.email, on: prefs.notify_email, available: ch.email }}
            telegram={{ on: prefs.notify_telegram, connected: Boolean(prefs.telegram_chat_id), available: ch.telegram && Boolean(ch.botName) }}
          />
        )}
        <AccountForm
          name={staff.name}
          sessions={sessions.map((s) => ({ id: s.id, ip: s.ip ?? "", ua: s.user_agent ?? "", seen: new Date(s.last_seen_at).toISOString(), current: s.id === staff.sessionId }))}
        />
      </div>
    </>
  );
}
