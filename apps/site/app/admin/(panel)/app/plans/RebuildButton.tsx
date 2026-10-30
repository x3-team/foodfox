"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rebuildPlan } from "./actions";

export function RebuildButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  return (
    <span className="a-inline-action">
      <button className="a-btn is-ghost is-small" type="button" disabled={pending}
        onClick={() => window.confirm("Пересобрать дни плана из результатов отчёта? Неделя и дата старта сохранятся.") && start(async () => {
          const r = await rebuildPlan(id);
          setMsg({ text: r.message ?? "", error: !r.ok });
          if (r.ok) router.refresh();
        })}>{pending ? "Пересобираем…" : "Пересобрать"}</button>
      {msg && <small className={msg.error ? "is-error" : "muted"}>{msg.text}</small>}
    </span>
  );
}
