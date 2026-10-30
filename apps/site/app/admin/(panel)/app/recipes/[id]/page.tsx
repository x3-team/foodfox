import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { Icon } from "@/components/admin/Icon";
import { requireStaff } from "@/lib/admin/auth";
import { appReady } from "@/lib/admin/app";
import { one, q } from "@/lib/admin/db";
import { RecipeEditor } from "./RecipeEditor";
import type { RecipeInput } from "../actions";

export const metadata: Metadata = { title: "Рецепт" };

type Row = {
  id: string; title: string; description: string | null; lead: string | null; photo_url: string | null; prep_time: string | null; cook_time: string | null;
  servings: number | null; tags: string[] | null; ingredients_list: { name: string; amount: string }[] | null;
  steps: { title?: string; body?: string; imageUrl?: string }[] | null; tips: string[] | null; published: boolean; archived_at: Date | null; fox: string[] | null;
};

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("app_recipes");
  if (!(await appReady())) return <AppNotReady />;
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const row = isNew ? null : await one<Row>(
    `SELECT r.id, r.title, r.description, r.lead, r.photo_url, r.prep_time, r.cook_time, r.servings, r.tags, r.ingredients_list, r.steps, r.tips,
            r.published, r.archived_at,
            (SELECT array_agg(f.fox_name ORDER BY f.fox_name) FROM recipe_ingredients ri JOIN food_items f ON f.id = ri.food_item_id WHERE ri.recipe_id = r.id) AS fox
       FROM recipes r WHERE r.id = $1`, [id]);
  if (!isNew && !row) notFound();
  const [products, tags] = await Promise.all([
    q<{ name: string; category: string | null }>(
      "SELECT f.fox_name AS name, c.name_ru AS category FROM food_items f LEFT JOIN food_categories c ON c.id = f.category_id ORDER BY f.fox_name",
    ),
    q<{ tag: string }>("SELECT DISTINCT jsonb_array_elements_text(tags) AS tag FROM recipes ORDER BY 1 LIMIT 60"),
  ]);
  const initial: RecipeInput = {
    title: row?.title ?? "", description: row?.description ?? "", lead: row?.lead ?? "", photoUrl: row?.photo_url ?? "",
    prepTime: row?.prep_time ?? "", cookTime: row?.cook_time ?? "", servings: row?.servings == null ? "" : String(row.servings),
    tags: row?.tags ?? [], ingredients: row?.ingredients_list ?? [],
    steps: (row?.steps ?? []).map((s) => ({ title: s.title ?? "", body: s.body ?? "", imageUrl: s.imageUrl })),
    tips: row?.tips ?? [], foxProducts: row?.fox ?? [], published: row?.published ?? false,
  };
  return (
    <>
      <nav className="a-crumbs"><Link href="/admin/app/recipes"><Icon name="back" size={16} /> Рецепты</Link></nav>
      <RecipeEditor id={isNew ? "new" : id} initial={initial} archived={Boolean(row?.archived_at)} products={products} tags={tags.map((t) => t.tag)} />
    </>
  );
}
