import { unstable_cache } from "next/cache";
import { hasDatabase, q } from "@/lib/admin/db";

export const CONTENT_TAG = "site-content";

/** Saved values that differ from the registry defaults. Cached until the admin saves (revalidateTag(CONTENT_TAG)). */
export const getContentOverrides = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    if (!hasDatabase()) return {};
    try {
      const rows = await q<{ key: string; value: unknown }>("SELECT key, value FROM site_content");
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    } catch (error) {
      // The site keeps the default texts rather than failing when Postgres is down.
      console.error("[cms] content not loaded", error);
      return {};
    }
  },
  ["site-content-v1"],
  { tags: [CONTENT_TAG] },
);
