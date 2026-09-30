import { mkdir, writeFile, readFile, access } from "fs/promises";
import { join } from "path";

const DEFAULT_DIR = join(process.cwd(), "../../data/reports");

export function reportsDir(): string {
  return process.env.REPORT_STORAGE_DIR ?? DEFAULT_DIR;
}

export function reportFilePath(clientId: string, reportId: string): string {
  return join(reportsDir(), clientId, `${reportId}.pdf`);
}

export async function saveReportPdf(
  clientId: string,
  reportId: string,
  buffer: Buffer,
): Promise<string> {
  const dir = join(reportsDir(), clientId);
  await mkdir(dir, { recursive: true });
  const path = reportFilePath(clientId, reportId);
  await writeFile(path, buffer);
  return `reports/${clientId}/${reportId}.pdf`;
}

export async function readReportPdf(
  clientId: string,
  reportId: string,
): Promise<Buffer | null> {
  try {
    const path = reportFilePath(clientId, reportId);
    await access(path);
    return readFile(path);
  } catch {
    return null;
  }
}
