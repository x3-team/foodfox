"use client";

import { useEffect, useState } from "react";
import { AppShell, Header } from "@/components/AppShell";
import { getWeekPhase } from "@/lib/plan-engine";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((d) => {
        setRecipes(d.recipes ?? []);
        setWeekNumber(d.weekNumber ?? 1);
      });
  }, []);

  return (
    <AppShell>
      <Header title="Зелёные рецепты" />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-5 pb-4">
        <p className="text-sm font-semibold text-fox-primary">
          Неделя {weekNumber} · {getWeekPhase(weekNumber)}
        </p>
        {recipes.map((recipe) => (
          <article
            key={recipe.id}
            className="flex flex-col gap-2 rounded-2xl bg-white p-4"
          >
            <div className="flex h-[120px] items-start rounded-xl bg-fox-primary-light/30 p-3">
              <span className="text-4xl">🥗</span>
            </div>
            <h2 className="text-base font-semibold text-fox-text">{recipe.title}</h2>
            <p className="text-[13px] text-fox-muted">
              ⏱ {recipe.tags[0] ?? "—"} · только зелёные продукты
            </p>
          </article>
        ))}
      </main>
    </AppShell>
  );
}
