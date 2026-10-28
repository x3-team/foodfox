"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveContent } from "@/app/admin/(panel)/content/actions";
import { PRICE_LABS_KEY } from "@/lib/cms/registry";

/** Test price per lab network, shown in the network cards when prices are on. */
export function LabPrices({ networks, saved }: { networks: string[]; saved: Record<string, string> }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(saved);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  return (
    <section className="a-card">
      <div className="a-card-head"><h2>Цена теста по сетям</h2></div>
      <div className="a-form">
        {msg && <div className={msg.error ? "a-error" : "a-ok"}>{msg.text}</div>}
        <div className="a-row">
          {networks.map((name) => (
            <label key={name} className="a-field">
              <span>{name}</span>
              <input className="a-input" placeholder="например, от 9 900 ₽" value={values[name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))} />
            </label>
          ))}
        </div>
        <button className="a-btn" type="button" style={{ alignSelf: "flex-start" }} disabled={!dirty || pending} onClick={() => start(async () => {
          const r = await saveContent({ [PRICE_LABS_KEY]: values }, "Цены");
          setMsg({ text: r.message ?? "", error: !r.ok });
          if (r.ok) router.refresh();
        })}>{pending ? "Сохраняем…" : "Сохранить цены сетей"}</button>
      </div>
    </section>
  );
}
