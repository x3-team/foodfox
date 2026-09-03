import type { Zone } from "./fox-parser";

/** FOX product names used in each seeded recipe. */
export const RECIPE_INGREDIENTS: Record<string, string[]> = {
  "Салат с индейкой и брокколи": ["Индейка", "Брокколи"],
  "Гречка с кабачком": ["Гречка", "Цуккини"],
  "Запечённая куриная грудка": ["Курица"],
  "Салат с лососем и шпинатом": ["Лосось", "Шпинат"],
  "Рис с индейкой": ["Рис", "Индейка"],
};

export interface RecipeMatch {
  suitable: boolean;
  allGreen: boolean;
  ingredients: { name: string; zone: Zone | "unknown" }[];
  warnings: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, " ");
}

function matchZone(productName: string, list: string[]): string | null {
  const n = normalize(productName);
  for (const item of list) {
    const t = normalize(item);
    if (n.includes(t) || t.includes(n)) return item;
  }
  return null;
}

export function analyzeRecipe(
  title: string,
  zones: { green: string[]; yellow: string[]; red: string[] },
): RecipeMatch {
  const ingredients = RECIPE_INGREDIENTS[title] ?? [];
  const mapped: RecipeMatch["ingredients"] = [];
  const warnings: string[] = [];
  let hasRed = false;
  let allGreen = ingredients.length > 0;

  for (const ing of ingredients) {
    if (matchZone(ing, zones.red)) {
      mapped.push({ name: ing, zone: "red" });
      warnings.push(`${ing} — в вашей красной зоне`);
      hasRed = true;
      allGreen = false;
    } else if (matchZone(ing, zones.yellow)) {
      mapped.push({ name: ing, zone: "yellow" });
      warnings.push(`${ing} — жёлтая зона, учитывайте ротацию`);
      allGreen = false;
    } else if (matchZone(ing, zones.green)) {
      mapped.push({ name: ing, zone: "green" });
    } else {
      mapped.push({ name: ing, zone: "unknown" });
      allGreen = false;
    }
  }

  return {
    suitable: !hasRed,
    allGreen: allGreen && ingredients.length > 0,
    ingredients: mapped,
    warnings,
  };
}
