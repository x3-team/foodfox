"use client";

import { withBasePath } from "@/lib/base-path";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { getWeekPhase } from "@/lib/plan-engine";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  steps: string[];
  tags: string[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch(withBasePath("/api/recipes"))
      .then((r) => r.json())
      .then((d) => {
        setRecipes(d.recipes ?? []);
        setWeekNumber(d.weekNumber ?? 1);
      });
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Рецепты"
        subtitle={`Неделя ${weekNumber} · ${getWeekPhase(weekNumber)} — блюда из зелёной зоны`}
      />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
        {recipes.map((recipe) => {
          const open = openId === recipe.id;
          return (
            <article key={recipe.id} className="fox-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : recipe.id)}
                className="flex w-full flex-col text-left"
              >
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-fox-primary-soft to-fox-primary-muted/40">
                  <span className="text-[13px] font-medium uppercase tracking-wider text-fox-primary/70">
                    {recipe.tags[1] ?? "Рецепт"}
                  </span>
                </div>
                <div className="space-y-1.5 px-4 py-4">
                  <h2 className="text-[17px] font-semibold leading-snug text-fox-text">
                    {recipe.title}
                  </h2>
                  {recipe.description && (
                    <p className="text-[14px] leading-relaxed text-fox-muted">{recipe.description}</p>
                  )}
                  <p className="text-[13px] font-medium text-fox-primary">
                    {recipe.tags[0] ?? "—"} · {open ? "Скрыть шаги ▲" : "Показать шаги ▼"}
                  </p>
                </div>
              </button>
              {open && recipe.steps.length > 0 && (
                <ol className="list-decimal space-y-2 border-t border-fox-border px-8 py-4 text-[14px] leading-relaxed text-fox-text">
                  {recipe.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </main>
    </AppShell>
  );
}
