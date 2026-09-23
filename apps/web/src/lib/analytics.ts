import type { Pool } from "pg";
import { getDbClient } from "./db-context";

export type AnalyticsEventType =
  | "user_registered"
  | "user_logged_in"
  | "report_uploaded"
  | "chat_sent"
  | "recipe_opened"
  | "plan_viewed"
  | "session_start";

export interface AnalyticsPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/** Fire-and-forget analytics — never blocks user flows. */
export function trackEvent(
  pool: Pool | null,
  clientId: string | null,
  eventType: AnalyticsEventType,
  payload: AnalyticsPayload = {},
): void {
  if (!pool) return;
  const client = getDbClient();
  const run = client
    ? client.query(
        `INSERT INTO analytics_events (client_id, event_type, payload)
         VALUES ($1, $2, $3::jsonb)`,
        [clientId, eventType, JSON.stringify(sanitizePayload(payload))],
      )
    : pool.query(
        `INSERT INTO analytics_events (client_id, event_type, payload)
         VALUES ($1, $2, $3::jsonb)`,
        [clientId, eventType, JSON.stringify(sanitizePayload(payload))],
      );

  void run.catch((err) => {
    console.error("analytics track failed:", eventType, err);
  });
}

function sanitizePayload(payload: AnalyticsPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = v.slice(0, 500);
      continue;
    }
    out[k] = v;
  }
  return out;
}

export async function recordLlmRequest(
  pool: Pool | null,
  clientId: string,
  opts: {
    model: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs: number;
    threadId?: string | null;
  },
): Promise<void> {
  if (!pool) return;
  const client = getDbClient();
  const sql = `INSERT INTO llm_requests (client_id, model, tokens_in, tokens_out, latency_ms, thread_id)
               VALUES ($1, $2, $3, $4, $5, $6)`;
  const params = [
    clientId,
    opts.model,
    opts.tokensIn ?? null,
    opts.tokensOut ?? null,
    opts.latencyMs,
    opts.threadId ?? null,
  ];
  try {
    if (client) await client.query(sql, params);
    else await pool.query(sql, params);
  } catch (err) {
    console.error("llm_requests insert failed:", err);
  }
}
