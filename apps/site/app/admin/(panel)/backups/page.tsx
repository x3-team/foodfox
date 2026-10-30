import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/auth";
import { bytesLabel, LATE_HOURS, listBackups, totalBytes, type BackupRun } from "@/lib/admin/backups";
import { ago, dateShort, dateTime } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Резервные копии" };
export const dynamic = "force-dynamic";

const PART: Record<string, string> = { media: "Медиатека", "partner-pd": "Сканы партнёров", reports: "PDF отчётов клиентов" };
const STATUS: Record<BackupRun["status"], { label: string; cls: string }> = {
  ok: { label: "Готово", cls: "s-done" },
  error: { label: "Ошибка", cls: "is-off" },
  running: { label: "Идёт или прервана", cls: "s-in_progress" },
};

export default async function BackupsPage() {
  await requireStaff("backups");
  const { runs, readable, freeBytes } = await listBackups();
  const lastGood = runs.find((r) => r.status === "ok");
  const last = runs[0];
  const goodAt = lastGood?.finishedAt ? new Date(lastGood.finishedAt).getTime() : 0;
  const late = !goodAt || Date.now() - goodAt > LATE_HOURS * 3_600_000;

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Резервные копии</h1>
          <p>Каждую ночь в 03:30 МСК: база данных, медиатека, сканы партнёров и PDF отчётов. Хранятся 14 дней.</p>
        </div>
      </div>

      {!readable ? (
        <p className="a-note" style={{ marginBottom: 24 }}>Папка копий не найдена. Копии ещё не настроены на сервере: расписание ставится при следующем обновлении.</p>
      ) : late ? (
        <p className="a-note" style={{ marginBottom: 24 }}>
          {lastGood ? `Нет свежей копии: последняя удачная ${ago(lastGood.finishedAt)}.` : "Пока нет ни одной удачной копии."}
          {last?.status === "error" && last.error ? ` Последняя ошибка: ${last.error}` : ""}
        </p>
      ) : null}

      <div className="a-grid a-grid-4" style={{ marginBottom: 24 }}>
        <div className="a-card a-stat"><small>Последняя удачная</small><b>{lastGood ? dateShort(lastGood.finishedAt) : "—"}</b><span className="a-delta">{lastGood ? ago(lastGood.finishedAt) : "ещё не было"}</span></div>
        <div className="a-card a-stat"><small>Размер копии</small><b>{lastGood ? bytesLabel(totalBytes(lastGood)) : "—"}</b><span className="a-delta">{lastGood ? `база ${bytesLabel(lastGood.db.bytes)}` : ""}</span></div>
        <div className="a-card a-stat"><small>Копий за 14 дней</small><b>{runs.filter((r) => r.status === "ok").length}</b><span className="a-delta">{runs.some((r) => r.status === "error") ? `с ошибкой: ${runs.filter((r) => r.status === "error").length}` : "без ошибок"}</span></div>
        <div className="a-card a-stat"><small>Свободно на диске</small><b>{freeBytes === null ? "—" : bytesLabel(freeBytes)}</b><span className="a-delta">{lastGood?.remote === "ok" ? "есть копия на другом сервере" : "копия только на этом сервере"}</span></div>
      </div>

      <div className="a-table-wrap">
        {runs.length === 0 ? (
          <div className="a-empty"><b>Копий пока нет</b>Первая появится после ночного запуска.</div>
        ) : (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Дата</th><th>Статус</th><th>База</th><th>Файлы</th><th>Новых данных</th><th>Ошибка</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.name}>
                    <td data-label="Дата">{run.finishedAt ? dateTime(run.finishedAt) : run.name.replace("_", " ")}</td>
                    <td data-label="Статус"><span className={`a-badge ${STATUS[run.status].cls}`}>{STATUS[run.status].label}</span>{run.remote !== "off" && <span className="sub">другой сервер: {run.remote === "ok" ? "да" : "ошибка"}</span>}</td>
                    <td data-label="База">{run.db.bytes ? bytesLabel(run.db.bytes) : "—"}</td>
                    <td data-label="Файлы">
                      <div>
                        {run.files.map((f) => (
                          <span key={f.name} className="sub">{PART[f.name] ?? f.name}: {f.missing ? "папки нет" : `${f.files} · ${bytesLabel(f.bytes)}`}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Новых данных">{run.newBytes ? bytesLabel(run.newBytes) : "—"}</td>
                    <td data-label="Ошибка" className="a-clip">{run.error ? <span className="sub" style={{ whiteSpace: "normal" }}>{run.error}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>Неизменившиеся файлы не копируются заново, поэтому «новых данных» обычно меньше полного размера. Восстановление описано в docs/backups.md.</p>
    </>
  );
}
