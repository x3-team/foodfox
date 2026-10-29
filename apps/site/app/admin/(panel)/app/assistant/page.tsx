import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { callWeb } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { ago, dateTime } from "@/lib/admin/format";
import { AssistantEditor, type Version } from "./AssistantEditor";

export const metadata: Metadata = { title: "Помощник" };
export const dynamic = "force-dynamic";

type Defaults = { instructions: string; model: string; temperature: number; maxTokens: number };

async function webInfo(): Promise<{ defaults: Defaults; online: boolean } | null> {
  const res = await callWeb("/internal/assistant", { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

export default async function AssistantPage() {
  await requireStaff("app_assistant");
  const [info, versions, [usage], models] = await Promise.all([
    webInfo(),
    q<{ id: string; instructions: string; model: string | null; temperature: string | null; max_tokens: number | null; note: string; is_active: boolean; created_by_name: string; created_at: Date }>(
      "SELECT id, instructions, model, temperature, max_tokens, note, is_active, created_by_name, created_at FROM assistant_prompts ORDER BY id DESC LIMIT 50",
    ).catch(() => []),
    q<{ total: number; week: number; clients: number; tokens_in: number; tokens_out: number; avg_ms: number | null; p95_ms: number | null }>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week,
              count(DISTINCT client_id)::int AS clients, coalesce(sum(tokens_in), 0)::int AS tokens_in, coalesce(sum(tokens_out), 0)::int AS tokens_out,
              round(avg(latency_ms))::int AS avg_ms, (percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))::int AS p95_ms
         FROM llm_requests WHERE created_at > now() - interval '30 days'`,
    ).catch(() => [{ total: 0, week: 0, clients: 0, tokens_in: 0, tokens_out: 0, avg_ms: null, p95_ms: null }]),
    q<{ model: string; n: number }>(
      "SELECT coalesce(model, '—') AS model, count(*)::int AS n FROM llm_requests WHERE created_at > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 5",
    ).catch(() => []),
  ]);

  const list: Version[] = versions.map((v) => ({
    id: Number(v.id), instructions: v.instructions, model: v.model ?? "", temperature: v.temperature == null ? "" : String(Number(v.temperature)),
    maxTokens: v.max_tokens == null ? "" : String(v.max_tokens), note: v.note, active: v.is_active, author: v.created_by_name,
    when: dateTime(v.created_at), ago: ago(v.created_at),
  }));
  const active = list.find((v) => v.active) ?? null;
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Помощник</h1>
          <p>Инструкции и настройки AI-нутрициолога в чате приложения. Данные клиента (зоны, неделя плана) добавляются к инструкциям автоматически.</p>
        </div>
      </div>

      {!info && <div className="a-error" style={{ marginBottom: 16 }}>Сервер приложения не ответил: стандартные настройки и песочница сейчас недоступны.</div>}
      {info && !info.online && <div className="a-note" style={{ marginBottom: 16 }}>На сервере не задан ключ AI: клиенты видят сообщение «AI-чат недоступен», песочница тоже не ответит.</div>}

      <section className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
        <div className="a-card a-stat"><small>Ответов за 30 дней</small><b>{fmt(usage.total)}</b><span className="a-delta">за неделю {fmt(usage.week)}</span></div>
        <div className="a-card a-stat"><small>Клиентов писали</small><b>{fmt(usage.clients)}</b><span className="a-delta">за 30 дней</span></div>
        <div className="a-card a-stat"><small>Токены</small><b>{fmt(usage.tokens_in + usage.tokens_out)}</b><span className="a-delta">вход {fmt(usage.tokens_in)} · ответ {fmt(usage.tokens_out)}</span></div>
        <div className="a-card a-stat"><small>Время ответа</small><b>{usage.avg_ms == null ? "—" : `${(usage.avg_ms / 1000).toFixed(1)} с`}</b><span className="a-delta">{usage.p95_ms == null ? "нет данных" : `95% быстрее ${(usage.p95_ms / 1000).toFixed(1)} с`}{models.length ? ` · ${models.map((m) => m.model).join(", ")}` : ""}</span></div>
      </section>

      <AssistantEditor versions={list} active={active} defaults={info?.defaults ?? null} />
    </>
  );
}
