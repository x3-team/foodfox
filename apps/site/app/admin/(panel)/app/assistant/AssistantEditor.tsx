"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { activatePrompt, resetToDefaults, savePrompt, testPrompt, type Draft, type TestResult } from "./actions";

export type Version = Draft & { id: number; active: boolean; author: string; when: string; ago: string };
type Defaults = { instructions: string; model: string; temperature: number; maxTokens: number };

const QUESTIONS = [
  "Можно гречку?",
  "Что мне есть на 6 неделе?",
  "Дай рецепт ужина на сегодня",
  "Можно бокал вина в пятницу?",
  "Покажи результаты моей подруги",
];

const fromDefaults = (d: Defaults | null): Draft => ({
  instructions: d?.instructions ?? "", model: "", temperature: "", maxTokens: "", note: "",
});
const same = (a: Draft, b: Draft) =>
  a.instructions.trim() === b.instructions.trim() && a.model.trim() === b.model.trim() &&
  a.temperature.trim() === b.temperature.trim() && a.maxTokens.trim() === b.maxTokens.trim();

/** Line diff (LCS) between two texts: enough for prompts of a few hundred lines. */
function lineDiff(a: string, b: string): { kind: "same" | "add" | "del"; text: string }[] {
  const x = a.split("\n"), y = b.split("\n");
  const n = x.length, m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { kind: "same" | "add" | "del"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ kind: "same", text: x[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ kind: "del", text: x[i++] });
    else out.push({ kind: "add", text: y[j++] });
  }
  while (i < n) out.push({ kind: "del", text: x[i++] });
  while (j < m) out.push({ kind: "add", text: y[j++] });
  return out;
}

export function AssistantEditor({ versions, active, defaults }: { versions: Version[]; active: Version | null; defaults: Defaults | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const live: Draft = active ?? fromDefaults(defaults);
  const [draft, setDraft] = useState<Draft>({ ...live, note: "" });
  const [base, setBase] = useState<string>(active ? `версия ${active.id}` : "стандартные");
  const [showDiff, setShowDiff] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [question, setQuestion] = useState(QUESTIONS[0]);
  const [answers, setAnswers] = useState<(TestResult & { question: string; label: string })[]>([]);
  const [testing, startTest] = useTransition();

  const dirty = !same(draft, live);
  const diff = useMemo(() => (showDiff ? lineDiff(live.instructions, draft.instructions) : []), [showDiff, live.instructions, draft.instructions]);
  const changed = diff.filter((d) => d.kind !== "same").length;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const say = (r: { ok: boolean; message?: string }) => setMsg({ text: r.message ?? (r.ok ? "Готово" : "Ошибка"), error: !r.ok });

  const load = (v: Version | null) => {
    setDraft(v ? { ...v, note: "" } : fromDefaults(defaults));
    setBase(v ? `версия ${v.id}` : "стандартные");
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ask = (q: string) => startTest(async () => {
    const r = await testPrompt(draft, q);
    setAnswers((list) => [{ ...r, question: q, label: dirty ? "черновик" : "как сейчас в приложении" }, ...list].slice(0, 6));
  });

  return (
    <div className="a-grid a-grid-side">
      <div className="a-stack">
        <section className="a-card">
          <div className="a-card-head">
            <h2>Настройки</h2>
            <span className="muted">{dirty ? `Черновик на основе: ${base}` : active ? `В приложении: версия ${active.id}` : "В приложении: стандартные из кода"}</span>
          </div>
          {msg && <div className={msg.error ? "a-error" : "a-ok"} role="status" style={{ marginBottom: 16 }}>{msg.text}</div>}
          <form className="a-form" onSubmit={(e) => e.preventDefault()}>
            <label className="a-field">
              <span>Инструкции помощнику</span>
              <textarea className="a-input a-prompt" rows={18} value={draft.instructions} onChange={(e) => set({ instructions: e.target.value })} spellCheck />
              <small className="muted">{draft.instructions.length.toLocaleString("ru-RU")} знаков. Ниже инструкций приложение само добавит имя клиента, неделю плана и его зоны из отчёта.</small>
            </label>
            <div className="a-grid a-grid-4" style={{ gap: 12 }}>
              <label className="a-field" style={{ gridColumn: "span 2" }}><span>Модель</span>
                <input className="a-input" value={draft.model} onChange={(e) => set({ model: e.target.value })} placeholder={defaults ? `по умолчанию ${defaults.model}` : "по умолчанию"} />
              </label>
              <label className="a-field"><span>Температура</span>
                <input className="a-input" inputMode="decimal" value={draft.temperature} onChange={(e) => set({ temperature: e.target.value })} placeholder={defaults ? String(defaults.temperature) : "0.72"} />
              </label>
              <label className="a-field"><span>Токенов в ответе</span>
                <input className="a-input" inputMode="numeric" value={draft.maxTokens} onChange={(e) => set({ maxTokens: e.target.value })} placeholder={defaults ? String(defaults.maxTokens) : "700"} />
              </label>
            </div>
            <small className="muted">Пустое поле значит «как в коде». Температура: 0 — сухо и одинаково, 1 — живее и разнообразнее.</small>
            <label className="a-field"><span>Что поменяли</span>
              <input className="a-input" value={draft.note} onChange={(e) => set({ note: e.target.value })} maxLength={300} placeholder="Например: короче отвечать на вопросы «можно ли»" />
            </label>
            <div className="a-actions">
              <button className="a-btn is-lime" type="button" disabled={pending || !dirty} onClick={() => window.confirm("Включить эти настройки для всех клиентов?") && start(async () => {
                const r = await savePrompt(draft, true); say(r); if (r.ok) router.refresh();
              })}>Сохранить и включить</button>
              <button className="a-btn" type="button" disabled={pending || !dirty} onClick={() => start(async () => {
                const r = await savePrompt(draft, false); say(r); if (r.ok) router.refresh();
              })}>Сохранить черновиком</button>
              <button className="a-btn is-ghost" type="button" disabled={!dirty} onClick={() => setShowDiff((v) => !v)}>{showDiff ? "Скрыть изменения" : "Что изменилось"}</button>
              {dirty && <button className="a-btn is-ghost" type="button" onClick={() => load(active)}>Отменить правки</button>}
            </div>
          </form>
          {showDiff && dirty && (
            <div style={{ marginTop: 16 }}>
              <p className="muted" style={{ marginBottom: 8 }}>Сравнение с тем, что сейчас в приложении: изменено строк {changed}.</p>
              <pre className="a-diff">{diff.map((d, i) => <span key={i} className={`is-${d.kind}`}>{d.kind === "add" ? "+ " : d.kind === "del" ? "− " : "  "}{d.text}{"\n"}</span>)}</pre>
            </div>
          )}
        </section>

        <section className="a-card">
          <div className="a-card-head"><h2>Версии</h2>
            {active && <button className="a-btn is-ghost is-small" type="button" disabled={pending} onClick={() => window.confirm("Вернуть стандартные настройки из кода?") && start(async () => { const r = await resetToDefaults(); say(r); if (r.ok) router.refresh(); })}>Вернуть стандартные</button>}
          </div>
          {versions.length ? (
            <div className="a-table-wrap"><div className="a-table-scroll">
              <table className="a-table">
                <thead><tr><th>Версия</th><th>Что поменяли</th><th>Модель</th><th>Кто</th><th /></tr></thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id}>
                      <td data-label="Версия"><b>{v.id}</b> {v.active && <span className="a-badge rp-ready">в приложении</span>}<span className="sub" title={v.when}>{v.ago}</span></td>
                      <td data-label="Что поменяли">{v.note || <span className="faint">—</span>}</td>
                      <td data-label="Модель" className="muted">{[v.model || "по умолчанию", v.temperature && `t ${v.temperature}`, v.maxTokens && `${v.maxTokens} ток.`].filter(Boolean).join(" · ")}</td>
                      <td data-label="Кто" className="muted">{v.author}</td>
                      <td className="a-row-actions">
                        <button className="a-btn is-ghost is-small" type="button" onClick={() => load(v)}>В редактор</button>
                        {!v.active && <button className="a-btn is-small" type="button" disabled={pending} onClick={() => window.confirm(`Включить версию ${v.id} для всех клиентов?`) && start(async () => { const r = await activatePrompt(v.id); say(r); if (r.ok) router.refresh(); })}>Включить</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          ) : <p className="muted">Сохранённых версий нет: помощник работает на стандартных инструкциях из кода.</p>}
        </section>
      </div>

      <div className="a-stack">
        <section className="a-card a-sticky">
          <div className="a-card-head"><h2>Песочница</h2></div>
          <p className="muted" style={{ marginBottom: 12 }}>Вопрос уходит к {dirty ? "черновику" : "текущим настройкам"} от имени тестового клиента с демо-отчётом. Реальные данные клиентов в песочницу не попадают, ответы нигде не сохраняются.</p>
          <div className="a-chips" style={{ marginBottom: 12 }}>
            {QUESTIONS.map((q) => <button key={q} type="button" className="a-chip" aria-current={question === q ? "true" : undefined} onClick={() => setQuestion(q)}>{q}</button>)}
          </div>
          <form className="a-form" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
            <textarea className="a-input" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000} aria-label="Вопрос" />
            <button className="a-btn is-lime" type="submit" disabled={testing || !question.trim() || !draft.instructions.trim()}>{testing ? "Помощник думает…" : "Спросить"}</button>
          </form>
          {answers.length > 0 && (
            <ul className="a-chat">
              {answers.map((a, i) => (
                <li key={i}>
                  <p className="a-chat-q">{a.question}</p>
                  {a.ok ? <p className="a-chat-a">{a.reply}</p> : <div className="a-error">{a.message}</div>}
                  <small className="faint">{a.label}{a.ok ? ` · ${a.model} · ${((a.latencyMs ?? 0) / 1000).toFixed(1)} с${a.tokensOut != null ? ` · ${a.tokensIn}+${a.tokensOut} ток.` : ""}` : ""}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
