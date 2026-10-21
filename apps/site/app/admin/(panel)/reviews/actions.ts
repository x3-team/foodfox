"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit } from "@/lib/admin/audit";
import { one, q } from "@/lib/admin/db";
import { DEFAULTS } from "@/lib/cms/registry";
import type { Review } from "@/lib/site-data/reviews";
import { saveContent } from "../content/actions";

async function currentList(): Promise<Review[]> {
  const row = await one<{ value: Review[] }>("SELECT value FROM site_content WHERE key = 'reviews.list'");
  return row?.value ?? (DEFAULTS["reviews.list"] as Review[]);
}

/** Publishes a review that came from the site form: it goes to the top of /reviews, the lead is closed. */
export async function publishFromLead(leadId: string, review: Pick<Review, "name" | "who" | "tag" | "text" | "role">) {
  const staff = await assertStaff("reviews");
  const list = await currentList();
  if (list.some((r) => r.leadId === leadId)) return { ok: false, message: "Этот отзыв уже опубликован" };
  const item: Review = { id: `lead-${leadId}`, kind: "Текст", who: review.who, tag: review.tag, photo: "", video: false, title: "", name: review.name, role: review.role, text: review.text, leadId };
  const result = await saveContent({ "reviews.list": [item, ...list] }, "Отзывы");
  if (!result.ok) return result;
  await q("UPDATE leads SET status = 'done', closed_at = now(), updated_at = now() WHERE id = $1", [leadId]);
  await q("INSERT INTO lead_notes (lead_id, author_id, author_name, text) VALUES ($1, $2, $3, 'Отзыв опубликован на /reviews')", [leadId, staff.id, staff.name || staff.email]);
  await audit(staff, { action: "publish", entity: "review", entityId: leadId, summary: `Опубликован отзыв: ${review.name}` });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Опубликовано на /reviews" };
}

export async function rejectLead(leadId: string) {
  const staff = await assertStaff("reviews");
  await q("UPDATE leads SET status = 'done', closed_at = now(), updated_at = now() WHERE id = $1 AND kind = 'review'", [leadId]);
  await q("INSERT INTO lead_notes (lead_id, author_id, author_name, text) VALUES ($1, $2, $3, 'Отзыв отклонён на модерации')", [leadId, staff.id, staff.name || staff.email]);
  await audit(staff, { action: "reject", entity: "review", entityId: leadId, summary: `Отзыв из заявки #${leadId} отклонён` });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Отклонено" };
}
