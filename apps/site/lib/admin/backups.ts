import { readdir, readFile, statfs } from "fs/promises";
import { join, resolve } from "path";

/* deploy/vps/backup.sh writes one folder per run with a manifest.json; this reads them for the admin page.
   The folder is outside the checkout (FOX_BACKUP_DIR on the VPS, set by update.sh). */
export function backupDir(): string {
  return resolve(process.env.FOX_BACKUP_DIR || join(process.cwd(), ".backups"));
}

export type BackupPart = { name: string; bytes: number; files: number; missing?: boolean };
export type BackupRun = {
  name: string;
  status: "ok" | "error" | "running";
  startedAt: string | null;
  finishedAt: string | null;
  db: { bytes: number };
  files: BackupPart[];
  newBytes: number;
  freeBytes: number | null;
  remote: "off" | "ok" | "error";
  error: string;
};

/** A run is late when no good copy is younger than this: the schedule is daily, so a day plus slack. */
export const LATE_HOURS = 26;

export async function listBackups(): Promise<{ runs: BackupRun[]; dir: string; readable: boolean; freeBytes: number | null }> {
  const dir = backupDir();
  let names: string[];
  try {
    names = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory() && /^20\d\d-\d\d-\d\d_\d+$/.test(d.name)).map((d) => d.name);
  } catch {
    return { runs: [], dir, readable: false, freeBytes: null };
  }
  const runs = await Promise.all(names.sort().reverse().map(async (name): Promise<BackupRun> => {
    try {
      const m = JSON.parse(await readFile(join(dir, name, "manifest.json"), "utf-8"));
      return {
        name,
        status: m.status === "ok" ? "ok" : "error",
        startedAt: m.startedAt ?? null,
        finishedAt: m.finishedAt ?? null,
        db: { bytes: Number(m.db?.bytes) || 0 },
        files: Array.isArray(m.files) ? m.files : [],
        newBytes: Number(m.newBytes) || 0,
        freeBytes: Number.isFinite(m.freeBytes) ? m.freeBytes : null,
        remote: m.remote === "ok" || m.remote === "error" ? m.remote : "off",
        error: String(m.error ?? ""),
      };
    } catch {
      // No manifest yet: either the run is going on now or it was killed before the end.
      return { name, status: "running", startedAt: null, finishedAt: null, db: { bytes: 0 }, files: [], newBytes: 0, freeBytes: null, remote: "off", error: "" };
    }
  }));
  const fs = await statfs(dir).catch(() => null);
  return { runs, dir, readable: true, freeBytes: fs ? fs.bavail * fs.bsize : null };
}

export function totalBytes(run: BackupRun): number {
  return run.db.bytes + run.files.reduce((sum, f) => sum + (Number(f.bytes) || 0), 0);
}

export function bytesLabel(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} ГБ`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} МБ`;
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}
