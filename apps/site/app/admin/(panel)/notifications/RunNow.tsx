"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runNow } from "./actions";

export function RunNow() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button className="a-btn is-ghost" type="button" disabled={pending} onClick={() => start(async () => { const r = await runNow(); setMsg(r.message ?? null); router.refresh(); })}>
        {pending ? "Отправляем…" : "Отправить сейчас"}
      </button>
      {msg && <span className="muted" role="status" style={{ marginLeft: 12 }}>{msg}</span>}
    </>
  );
}
