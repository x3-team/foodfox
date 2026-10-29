import { getDbPool } from "./db";
import { DEFAULT_INSTRUCTIONS } from "./heli";

/**
 * The assistant's instructions and model settings, as the admin saved them
 * (assistant_prompts, migration 011_app_admin.sql). Cached for a minute; with
 * no saved version, or before the migration, the defaults from code apply.
 */

export interface AssistantConfig {
  instructions: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  version: number | null;
}

const TTL_MS = 60_000;
let cached: { at: number; config: AssistantConfig } | null = null;

export async function getAssistantConfig(): Promise<AssistantConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.config;
  let config: AssistantConfig = { instructions: DEFAULT_INSTRUCTIONS, version: null };
  const pool = getDbPool();
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT id, instructions, model, temperature, max_tokens FROM assistant_prompts WHERE is_active LIMIT 1`,
      );
      const row = rows[0];
      if (row?.instructions?.trim()) {
        config = {
          instructions: row.instructions,
          model: row.model || undefined,
          temperature: row.temperature == null ? undefined : Number(row.temperature),
          maxTokens: row.max_tokens ?? undefined,
          version: Number(row.id),
        };
      }
    } catch (e) {
      // 42P01: the table is not there yet; keep the defaults quietly.
      if ((e as { code?: string }).code !== "42P01") console.error("assistant config failed", e);
    }
  }
  cached = { at: Date.now(), config };
  return config;
}
