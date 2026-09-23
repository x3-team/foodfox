"use client";

import { withBasePath } from "@/lib/base-path";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  RecipeCardMedia,
  recipeZoneBadge,
  recipeZoneBadgeMeta,
} from "@/components/recipes/RecipeCardMedia";
import { RecipeArticle } from "@/components/recipes/RecipeArticle";
import type { RecipeStep } from "@/lib/recipes-catalog";
import { getWeekPhase } from "@/lib/plan-engine";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  lead?: string | null;
  steps: RecipeStep[];
  tags: string[];
  photoUrl?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  tips?: string[];
  ingredientsList?: { name: string; amount: string }[];
  suitable?: boolean;
  allGreen?: boolean;
  warnings?: string[];
  ingredients?: { name: string; zone: string }[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [suitableCount, setSuitableCount] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlySuitable, setOnlySuitable] = useState(true);

  useEffect(() => {
    fetch(withBasePath("/api/recipes"))
      .then((r) => r.json())
      .then((d) => {
        setRecipes(d.recipes ?? []);
        setWeekNumber(d.weekNumber ?? 1);
        setSuitableCount(d.suitableCount ?? 0);
      });
  }, []);

  const visible = onlySuitable ? recipes.filter((r) => r.suitable !== false) : recipes;
  const openRecipe = openId ? recipes.find((r) => r.id === openId) : null;

  return (
    <AppShell>
      <PageHeader
        title="Рецепты"
        subtitle={`Неделя ${weekNumber} · ${getWeekPhase(weekNumber)} · подобрано под вашу зелёную зону`}
      />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
        <div className="fox-card flex items-center justify-between px-4 py-3">
          <p className="text-[14px] text-fox-text">
            <span className="font-semibold text-fox-primary">{suitableCount}</span> из{" "}
            {recipes.length} блюд подходят вам
          </p>
          <button
            type="button"
            onClick={() => setOnlySuitable((v) => !v)}
            className="text-[13px] font-semibold text-fox-primary"
          >
            {onlySuitable ? "Все рецепты" : "Только подходящие"}
          </button>
        </div>

        {visible.map((recipe) => (
          <article key={recipe.id} className="fox-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(recipe.id)}
              className="flex w-full flex-col text-left"
            >
              <RecipeCardMedia
                badge={recipeZoneBadge(recipe)}
                photoUrl={recipe.photoUrl}
                title={recipe.title}
              />
              <div className="space-y-1.5 px-4 py-4">
                <h2 className="text-[17px] font-semibold leading-snug text-fox-text">
                  {recipe.title}
                </h2>
                {(recipe.lead ?? recipe.description) && (
                  <p className="line-clamp-2 text-[14px] leading-relaxed text-fox-muted">
                    {recipe.lead ?? recipe.description}
                  </p>
                )}
                {recipe.warnings && recipe.warnings.length > 0 && (
                  <p className="text-[12px] text-fox-yellow">{recipe.warnings.join(" · ")}</p>
                )}
                <p className="text-[13px] font-medium text-fox-primary">
                  {recipe.tags.slice(0, 2).join(" · ") || "—"} · Читать рецепт →
                </p>
              </div>
            </button>
          </article>
        ))}
      </main>

      {openRecipe && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={openRecipe.title}
        >
          <div className="mx-auto flex h-full w-full max-w-lg flex-col bg-fox-bg shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RecipeArticle
                title={openRecipe.title}
                lead={openRecipe.lead}
                description={openRecipe.description}
                photoUrl={openRecipe.photoUrl}
                prepTime={openRecipe.prepTime}
                cookTime={openRecipe.cookTime}
                servings={openRecipe.servings}
                tags={openRecipe.tags}
                ingredients={
                  openRecipe.ingredientsList?.length
                    ? openRecipe.ingredientsList
                    : openRecipe.ingredients?.map((i) => ({
                        name: i.name,
                        amount: i.zone === "green" ? "зелёная зона" : i.zone,
                      }))
                }
                steps={openRecipe.steps}
                tips={openRecipe.tips}
                warnings={openRecipe.warnings}
                badgeLabel={recipeZoneBadgeMeta(openRecipe).label}
                badgeClassName={recipeZoneBadgeMeta(openRecipe).className}
                onClose={() => setOpenId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
