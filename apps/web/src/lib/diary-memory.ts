/**
 * Diary rows for runs without DATABASE_URL (local development only; production
 * refuses to start without a database). Rows hold the same ciphertext as the
 * table, so the encryption path is exercised here too. Kept apart from
 * diary-store.ts so db.ts can check it without importing the store.
 */

export interface DiaryRow {
  clientId: string;
  date: string;
  weekNumber: number | null;
  payload: string;
  createdAt: string;
  updatedAt: string;
}

export const memoryDiary = new Map<string, DiaryRow>();

export function memoryDiaryKey(clientId: string, date: string): string {
  return `${clientId}:${date}`;
}
