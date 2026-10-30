import { rm } from "fs/promises";
import { join } from "path";
import type { Pool } from "pg";
import { forgetGuard } from "./account-guard";
import { reportsDir } from "./report-storage";

/* The client deletes their account from the app. The database part is one function shared with the admin
   (packages/database/migrations/014_account_deletion.sql); here the report PDFs go too. */
export async function deleteClientAccount(pool: Pool, userId: string, reason: string | null): Promise<boolean> {
  const { rows } = await pool.query<{ client_id: string }>(
    "SELECT client_id FROM fox_delete_client_account($1, 'app', $2, NULL)",
    [userId, reason],
  );
  forgetGuard(userId);
  for (const { client_id } of rows) {
    // Only a uuid becomes a path, so nothing outside the reports folder can be removed.
    if (/^[0-9a-f-]{36}$/i.test(client_id)) await rm(join(reportsDir(), client_id), { recursive: true, force: true });
  }
  return rows.length > 0;
}
