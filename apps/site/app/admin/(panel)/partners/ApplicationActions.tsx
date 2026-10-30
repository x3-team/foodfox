"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteLead } from "../leads/actions";
import { partnerFromLead } from "./actions";

export function ApplicationActions({ leadId, canDelete }: { leadId: string; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="a-row-actions" style={{ position: "relative", zIndex: 1 }}>
      <button className="a-btn is-lime is-small" type="button" disabled={pending} onClick={() => start(async () => {
        const r = await partnerFromLead(leadId, "approved");
        if (!r.ok) { window.alert(r.message); return; }
        router.push(`/admin/partners/${r.id}`);
      })}>Одобрить</button>
      <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => window.confirm("Отклонить анкету?") && start(async () => { await partnerFromLead(leadId, "rejected"); router.refresh(); })}>Отклонить</button>
      {canDelete && (
        <button className="a-btn is-danger is-small" type="button" disabled={pending} onClick={() => window.confirm("Удалить анкету насовсем? Это попадёт в журнал.") && start(async () => {
          const r = await deleteLead(leadId);
          if (!r.ok) window.alert(r.message);
          router.refresh();
        })}>Удалить</button>
      )}
    </div>
  );
}
