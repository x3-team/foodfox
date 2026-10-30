import type { Metadata } from "next";
import { ROLE_LABEL, requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { AccountForm } from "./AccountForm";
import { MfaCard } from "./MfaCard";

export const metadata: Metadata = { title: "Профиль" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const staff = await requireStaff();
  const { mfa } = await searchParams;
  const sessions = await q<{ id: string; ip: string | null; user_agent: string | null; last_seen_at: Date; created_at: Date }>(
    "SELECT id, ip, user_agent, last_seen_at, created_at FROM admin_sessions WHERE user_id = $1 AND expires_at > now() AND NOT mfa_pending ORDER BY last_seen_at DESC",
    [staff.id],
  );
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
        <AccountForm
          name={staff.name}
          sessions={sessions.map((s) => ({ id: s.id, ip: s.ip ?? "", ua: s.user_agent ?? "", seen: new Date(s.last_seen_at).toISOString(), current: s.id === staff.sessionId }))}
        />
      </div>
    </>
  );
}
