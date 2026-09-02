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

        {visible.map((recipe) => {
          const open = openId === recipe.id;
          return (
            <article key={recipe.id} className="fox-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : recipe.id)}
                className="flex w-full flex-col text-left"
              >
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-fox-primary-soft to-fox-primary-muted/40">
                  {recipe.allGreen ? (
                    <span className="rounded-full bg-fox-primary px-3 py-1 text-[12px] font-semibold text-white">
                      100% зелёная зона
                    </span>
                  ) : recipe.suitable ? (
                    <span className="rounded-full bg-fox-yellow/20 px-3 py-1 text-[12px] font-semibold text-fox-yellow">
                      Подходит с учётом ротации
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-[12px] font-semibold text-fox-red">
                      Есть красная зона
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 px-4 py-4">
                  <h2 className="text-[17px] font-semibold leading-snug text-fox-text">
                    {recipe.title}
                  </h2>
                  {recipe.description && (
                    <p className="text-[14px] leading-relaxed text-fox-muted">{recipe.description}</p>
                  )}
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <p className="text-[13px] text-fox-muted">
                      {recipe.ingredients.map((i) => i.name).join(", ")}
                    </p>
                  )}
                  {recipe.warnings && recipe.warnings.length > 0 && (
                    <p className="text-[12px] text-fox-yellow">{recipe.warnings.join(" · ")}</p>
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
