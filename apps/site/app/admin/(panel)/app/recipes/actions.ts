"use server";

import { revalidatePath } from "next/cache";
import { assertStaff } from "@/lib/admin/auth";
import { audit, diff } from "@/lib/admin/audit";
import { one, tx } from "@/lib/admin/db";

export type RecipeInput = {
  title: string; description: string; lead: string; photoUrl: string;
  prepTime: string; cookTime: string; servings: string;
  tags: string[]; ingredients: { name: string; amount: string }[];
  steps: { title: string; body: string; imageUrl?: string }[]; tips: string[];
  foxProducts: string[]; published: boolean;
};
export type RecipeResult = { ok: boolean; message?: string; id?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
// Photos come from the media library (/media/...) or the app's own assets (/recipes/...); nothing from other hosts.
const photo = (v: unknown) => { const s = str(v, 500); return s === "" || /^\/(media|recipes)\/[\w./-]+$/.test(s) ? s : null; };

function clean(input: RecipeInput) {
  const title = str(input.title, 120);
  if (title.length < 3) return { error: "Название не короче 3 знаков" } as const;
  const photoUrl = photo(input.photoUrl);
  if (photoUrl === null) return { error: "Фото выбирается из медиатеки" } as const;
  const steps = (input.steps ?? []).map((s) => ({ title: str(s.title, 120), body: str(s.body, 3000), imageUrl: photo(s.imageUrl) || undefined })).filter((s) => s.title || s.body);
  if (input.published && !steps.length) return { error: "Чтобы опубликовать, добавьте хотя бы один шаг" } as const;
  if (input.published && !photoUrl) return { error: "Чтобы опубликовать, выберите фото" } as const;
  const servings = input.servings.trim() === "" ? null : Math.round(Number(input.servings));
  if (servings !== null && !(servings >= 1 && servings <= 50)) return { error: "Порций от 1 до 50" } as const;
  return {
    value: {
      title, description: str(input.description, 300), lead: str(input.lead, 2000), photo_url: photoUrl || null,
      prep_time: str(input.prepTime, 30) || null, cook_time: str(input.cookTime, 30) || null, servings,
      tags: Array.from(new Set((input.tags ?? []).map((t) => str(t, 40)).filter(Boolean))).slice(0, 12),
      ingredients_list: (input.ingredients ?? []).map((i) => ({ name: str(i.name, 120), amount: str(i.amount, 60) })).filter((i) => i.name).slice(0, 60),
      steps: steps.slice(0, 40),
      tips: (input.tips ?? []).map((t) => str(t, 500)).filter(Boolean).slice(0, 20),
      published: Boolean(input.published),
      fox: Array.from(new Set((input.foxProducts ?? []).map((t) => str(t, 120)).filter(Boolean))).slice(0, 40),
    },
  } as const;
}

type Row = { id: string; title: string; published: boolean; archived_at: Date | null; [k: string]: unknown };

/** Creates (id "new") or updates a recipe with its FOX products; the app shows the change on the next load. */
export async function saveRecipe(id: string, input: RecipeInput): Promise<RecipeResult> {
  const staff = await assertStaff("app_recipes");
  const c = clean(input);
  if ("error" in c) return { ok: false, message: c.error };
  const v = c.value;
  const isNew = id === "new";
  if (!isNew && !UUID.test(id)) return { ok: false, message: "Рецепт не найден" };
  const clash = await one("SELECT 1 FROM recipes WHERE lower(title) = lower($1) AND id <> coalesce($2::uuid, '00000000-0000-0000-0000-000000000000')", [v.title, isNew ? null : id]);
  if (clash) return { ok: false, message: "Рецепт с таким названием уже есть" };

  const savedId = await tx(async (db) => {
    const before = isNew ? null : (await db.query<Row>(
      `SELECT id, title, description, lead, photo_url, prep_time, cook_time, servings, tags, ingredients_list, steps, tips, published, archived_at
         FROM recipes WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!isNew && !before) return null;
    const params = [v.title, v.description, v.lead, v.photo_url, v.prep_time, v.cook_time, v.servings,
      JSON.stringify(v.tags), JSON.stringify(v.ingredients_list), JSON.stringify(v.steps), JSON.stringify(v.tips), v.published];
    let rid: string;
    if (isNew) {
      rid = (await db.query<{ id: string }>(
        `INSERT INTO recipes (title, description, lead, photo_url, prep_time, cook_time, servings, tags, ingredients_list, steps, tips, published, admin_edited_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, now()) RETURNING id`, params)).rows[0].id;
    } else {
      rid = id;
      await db.query(
        `UPDATE recipes SET title = $1, description = $2, lead = $3, photo_url = $4, prep_time = $5, cook_time = $6, servings = $7,
                tags = $8::jsonb, ingredients_list = $9::jsonb, steps = $10::jsonb, tips = $11::jsonb, published = $12,
                archived_at = CASE WHEN $12 THEN NULL ELSE archived_at END,
                source_title = coalesce(source_title, title), admin_edited_at = now(), updated_at = now()
          WHERE id = $13`, [...params, id]);
    }
    await db.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [rid]);
    if (v.fox.length) {
      await db.query(
        "INSERT INTO recipe_ingredients (recipe_id, food_item_id) SELECT $1, id FROM food_items WHERE fox_name = ANY($2::text[]) ON CONFLICT DO NOTHING",
        [rid, v.fox],
      );
    }
    const { fox, ...fields } = v;
    const d = before ? diff(before as Record<string, unknown>, fields as Record<string, unknown>) : null;
    await audit(staff, {
      action: isNew ? "create" : "update", entity: "recipe", entityId: rid,
      summary: isNew ? `Создан рецепт «${v.title}»${v.published ? " и опубликован" : ""}` : `Изменён рецепт «${v.title}»${before && before.published !== v.published ? (v.published ? ", опубликован" : ", скрыт") : ""}`,
      before: d?.before, after: d ? { ...d.after, fox_products: fox.length } : { fox_products: fox.length },
    }, db);
    return rid;
  });
  if (!savedId) return { ok: false, message: "Рецепт не найден" };
  revalidatePath("/admin/app/recipes");
  return { ok: true, id: savedId, message: isNew ? "Рецепт создан" : "Сохранено" };
}

/** Recipes are not deleted: chats and plans may point at them. Archive hides one from the app and from the list. */
export async function archiveRecipe(id: string, archive: boolean): Promise<RecipeResult> {
  const staff = await assertStaff("app_recipes");
  if (!UUID.test(id)) return { ok: false, message: "Рецепт не найден" };
  const row = await one<{ title: string }>(
    `UPDATE recipes SET archived_at = CASE WHEN $2 THEN now() ELSE NULL END, published = CASE WHEN $2 THEN false ELSE published END,
            source_title = coalesce(source_title, title), admin_edited_at = now(), updated_at = now()
      WHERE id = $1 RETURNING title`, [id, archive]);
  if (!row) return { ok: false, message: "Рецепт не найден" };
  await audit(staff, { action: archive ? "archive" : "restore", entity: "recipe", entityId: id, summary: `${archive ? "В архиве" : "Возвращён из архива"} рецепт «${row.title}»` });
  revalidatePath("/admin/app/recipes");
  return { ok: true, message: archive ? "Рецепт в архиве и скрыт в приложении" : "Рецепт возвращён черновиком" };
}
