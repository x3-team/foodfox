import { AsyncLocalStorage } from "async_hooks";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const requestDb = new AsyncLocalStorage<PoolClient>();

/** Active transaction client when inside runWithClientContext. */
export function getDbClient(): PoolClient | null {
  return requestDb.getStore() ?? null;
}

export async function runWithClientContext<T>(
  pool: Pool,
  clientId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = requestDb.getStore();
  if (existing) {
    await existing.query(`SELECT set_config('app.client_id', $1, true)`, [clientId]);
    return fn();
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('app.client_id', $1, true)`, [clientId]);
    return await requestDb.run(client, async () => {
      const result = await fn();
      await client.query("COMMIT");
      return result;
    });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function queryAsClient<R extends QueryResultRow>(
  pool: Pool,
  clientId: string,
  text: string,
  params?: unknown[],
): Promise<QueryResult<R>> {
  return runWithClientContext(pool, clientId, () => {
    const client = getDbClient()!;
    return client.query<R>(text, params);
  });
}
