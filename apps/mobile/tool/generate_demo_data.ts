/**
 * Builds the offline demo payload bundled with review builds of the app.
 *
 * The output mirrors the real API responses byte for byte in shape, so the app
 * parses it with the same model constructors it uses against the server. Run
 * from the repo root:
 *
 *   npx tsx apps/mobile/tool/generate_demo_data.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RECIPES_CATALOG } from "../../web/src/lib/recipes-catalog";
import { analyzeRecipe } from "../../web/src/lib/recipe-match";
import { classifyZone } from "../../web/src/lib/fox-parser";

const ROOT = join(import.meta.dirname, "../../..");
const OUT = join(ROOT, "apps/mobile/assets/demo/demo.json");

/** Deterministic 0…1 from a name, so the demo report never shuffles. */
function seed(name: string, salt: string): number {
  const h = createHash("sha256").update(`${salt}:${name}`).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

function buildResults() {
  const catalog = JSON.parse(
    readFileSync(join(ROOT, "packages/database/seeds/fox-catalog-ru.json"), "utf8"),
  ) as { names: string[] };

  return catalog.names.map((foxName, i) => {
    const r = seed(foxName, "zone");
    let valueUgMl: number | null;
    let isFloorValue = false;

    // Roughly the shape of a real report: mostly clear, a band of borderline
    // products, a short tail of strong reactions.
    if (r < 0.62) {
      valueUgMl = null;
      isFloorValue = true;
    } else if (r < 0.78) {
      valueUgMl = round(1 + seed(foxName, "v") * 8.9);
    } else if (r < 0.9) {
      valueUgMl = round(10 + seed(foxName, "v") * 9.9);
    } else {
      valueUgMl = round(20 + seed(foxName, "v") * 62);
    }

    return {
      id: `demo-${i + 1}`,
      foxName,
      valueUgMl,
      isFloorValue,
      zone: classifyZone(valueUgMl ?? 0),
    };
  });
}

const round = (v: number) => Math.round(v * 100) / 100;

function buildPlan(results: ReturnType<typeof buildResults>) {
  const green = results.filter((r) => r.zone === "green").map((r) => r.foxName);
  const red = results.filter((r) => r.zone === "red").map((r) => r.foxName);
  const yellow = results.filter((r) => r.zone === "yellow").map((r) => r.foxName);

  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - 10);

  const phases: Record<number, string> = {
    1: "Элиминация",
    2: "Элиминация",
    3: "Элиминация",
    4: "Элиминация",
    5: "Стабилизация",
    6: "Стабилизация",
    7: "Расширение",
    8: "Расширение",
  };

  const today = new Date();
  const weeks = [];
  for (let w = 1; w <= 8; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startedAt);
      date.setDate(startedAt.getDate() + (w - 1) * 7 + d);
      const iso = date.toISOString().slice(0, 10);
      // Elimination pulls the yellow band too; later phases reintroduce it.
      const forbidden = w <= 4 ? [...red, ...yellow] : red;
      days.push({
        date: iso,
        weekNumber: w,
        allowed: green.slice(d * 6, d * 6 + 12),
        forbidden: forbidden.slice(0, 10),
        isToday: iso === today.toISOString().slice(0, 10),
        botMessage:
          d === 0
            ? `Неделя ${w}: ${phases[w]}. Держим зелёный список и следим за самочувствием.`
            : null,
      });
    }
    weeks.push({ weekNumber: w, phase: phases[w], days });
  }

  const currentWeek = 2;
  return {
    plan: { planId: "demo-plan", startedAt: startedAt.toISOString(), weeks },
    weekTabs: weeks.map((w) => ({ ...w, days: [] })),
    currentWeek,
    startedAtIso: startedAt.toISOString(),
  };
}

/** Same scoring the server runs, so the demo warnings are the real ones. */
function buildRecipes(results: ReturnType<typeof buildResults>) {
  const zones = {
    green: results.filter((r) => r.zone === "green").map((r) => r.foxName),
    yellow: results.filter((r) => r.zone === "yellow").map((r) => r.foxName),
    red: results.filter((r) => r.zone === "red").map((r) => r.foxName),
  };

  const recipes = RECIPES_CATALOG.map((entry, i) => {
    const match = analyzeRecipe(entry.title, zones);
    return {
      id: `demo-recipe-${i + 1}`,
      title: entry.title,
      description: entry.description,
      lead: entry.lead,
      photoUrl: entry.photoUrl,
      prepTime: entry.prepTime,
      cookTime: entry.cookTime,
      servings: entry.servings,
      tags: entry.tags,
      steps: entry.steps,
      tips: entry.tips,
      ingredientsList: entry.ingredients,
      ingredients: match.ingredients.map((i) => ({ name: i.name, zone: i.zone })),
      suitable: match.suitable,
      allGreen: match.allGreen,
      warnings: match.warnings,
    };
  }).sort((a, b) => {
    if (a.suitable !== b.suitable) return a.suitable ? -1 : 1;
    if (a.allGreen !== b.allGreen) return a.allGreen ? -1 : 1;
    return a.title.localeCompare(b.title, "ru");
  });

  return {
    recipes,
    weekNumber: 2,
    suitableCount: recipes.filter((r) => r.suitable).length,
    totalCount: recipes.length,
  };
}

function main() {
  const results = buildResults();
  const counts = results.reduce(
    (acc, r) => ({ ...acc, [r.zone]: acc[r.zone] + 1 }),
    { green: 0, yellow: 0, red: 0 } as Record<string, number>,
  );
  const plan = buildPlan(results);

  const payload = {
    generatedAt: new Date().toISOString(),
    me: {
      user: { email: "demo@foodfox.ru", displayName: "Ирина" },
      profile: {
        hasReport: true,
        parsedCount: results.length,
        currentWeek: plan.currentWeek,
        planStartedAt: plan.startedAtIso,
      },
    },
    results: { results, counts },
    plan: { plan: plan.plan, weekTabs: plan.weekTabs, currentWeek: plan.currentWeek },
    recipes: buildRecipes(results),
    chat: {
      messages: [
        {
          id: "demo-c1",
          role: "assistant",
          messageType: "daily_reminder",
          content:
            `Доброе утро! Идёт неделя 2 — элиминация. Сегодня держим зелёный список: ` +
            `${results.filter((r) => r.zone === "green").slice(0, 4).map((r) => r.foxName.toLowerCase()).join(", ")}.`,
        },
        {
          id: "demo-c2",
          role: "assistant",
          messageType: "chat",
          content:
            "Я разобрал ваш отчёт FOX. Спросите, что можно есть, чем заменить продукт из красной зоны " +
            "или как собрать меню на день.",
        },
      ],
    },
  };

  mkdirSync(join(ROOT, "apps/mobile/assets/demo"), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 1)}\n`);
  console.log(
    `wrote ${OUT}: ${results.length} products ` +
      `(${counts.green} green / ${counts.yellow} yellow / ${counts.red} red), ` +
      `${payload.recipes.recipes.length} recipes`,
  );
}

main();
