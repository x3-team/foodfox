import { cache } from "react";
import { hasDatabase, q } from "@/lib/admin/db";

/** Saved values that differ from the registry defaults. Read once per render: pages are static and the admin's
    revalidatePath("/", "layout") re-renders them. No unstable_cache on purpose: its tag invalidation lives in the
    process memory, so after a restart the entry on disk would bring back content from before the last save. */
export const getContentOverrides = cache(
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
);
