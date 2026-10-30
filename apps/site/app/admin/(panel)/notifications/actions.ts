"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { processPending } from "@/lib/admin/notify";

/** Sends what is queued now instead of waiting for the minute timer. */
export async function runNow(): Promise<{ ok: boolean; message?: string }> {
  await assertStaff("notifications");
  const { processed } = await processPending();
  revalidatePath("/admin/notifications");
  return { ok: true, message: processed ? `Обработано событий: ${processed}` : "Очередь пуста" };
}
