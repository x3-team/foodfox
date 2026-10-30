import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { requireStaff } from "@/lib/admin/auth";
import { appReady } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";

export const metadata: Metadata = { title: "Продукты и зоны" };

// Aggregates over fewer clients than this could point at a person, so they are not shown.
const MIN_CLIENTS = 10;

// Same thresholds as apps/web/src/lib/fox-parser.ts classifyZone, IgG in мкг/мл.
const ZONES = [
  { id: "green", label: "Зелёная", rule: "меньше 10 мкг/мл, и «< 5» ниже порога", meaning: "можно есть, основа рациона" },
  { id: "yellow", label: "Жёлтая", rule: "от 10 до 20 мкг/мл", meaning: "по ротации, один продукт раз в 4 дня" },
  { id: "red", label: "Красная", rule: "20 мкг/мл и выше", meaning: "исключена в недели 1–4, с 5-й часть возвращается постепенно" },
];

function aliases(): Record<string, string[]> {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "../../packages/database/seeds/fox-catalog-aliases.json"), "utf-8")) as { aliases: Record<string, string> };
    const by: Record<string, string[]> = {};
    for (const [alias, name] of Object.entries(data.aliases ?? {})) (by[name] ??= []).push(alias);
    return by;
  } catch {
    return {};
  }
}

type Row = { name: string; molecular: boolean; recipes: number; red: number; yellow: number; tested: number };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("app_catalog");
  if (!(await appReady())) return <AppNotReady />;
  const sp = await searchParams;
  const [{ clients }] = await q<{ clients: number }>(
    "SELECT count(DISTINCT r.client_id)::int AS clients FROM test_results t JOIN reports r ON r.id = t.report_id",
  );
  const stats = clients >= MIN_CLIENTS;
  const params: unknown[] = [];
  let where = "TRUE";
  const text = sp.q?.trim();
  if (text) { params.push(`%${text.replace(/[%_\\]/g, "\\$&")}%`); where = "(f.fox_name ILIKE $1 OR f.aliases::text ILIKE $1)"; }
  const rows = await q<Row>(
    `SELECT f.fox_name AS name, f.is_molecular AS molecular,
            (SELECT count(*)::int FROM recipe_ingredients ri JOIN recipes r ON r.id = ri.recipe_id WHERE ri.food_item_id = f.id AND r.published) AS recipes,
            ${stats ? `count(DISTINCT rp.client_id) FILTER (WHERE t.zone = 'red')::int AS red,
            count(DISTINCT rp.client_id) FILTER (WHERE t.zone = 'yellow')::int AS yellow,
            count(DISTINCT rp.client_id)::int AS tested` : "0 AS red, 0 AS yellow, 0 AS tested"}
       FROM food_items f
       ${stats ? "LEFT JOIN test_results t ON t.food_item_id = f.id LEFT JOIN reports rp ON rp.id = t.report_id" : ""}
      WHERE ${where} GROUP BY f.id ORDER BY ${stats && sp.sort === "red" ? "red DESC," : ""} f.fox_name`,
    params,
  );
  const al = aliases();
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Продукты и зоны</h1>
          <p>Справочник антигенов FOX Food Xplorer, по которому приложение разбирает отчёты, проверяет рецепты и строит планы.</p>
        </div>
      </div>

      <section className="a-card" style={{ marginBottom: 24 }}>
        <div className="a-card-head"><h2>Зоны</h2><span className="muted">границы заданы в парсере</span></div>
        <div className="a-grid a-grid-4" style={{ gap: 12 }}>
          {ZONES.map((z) => (
            <div key={z.id} className={`a-zone-card z-${z.id}`}><b>{z.label}</b><span>{z.rule}</span><small>{z.meaning}</small></div>
          ))}
          <div className="a-zone-card"><b>Как поменять</b><small>Границы зон и синонимы названий живут в коде парсера (apps/web/src/lib/fox-parser.ts, packages/database/seeds/fox-catalog-aliases.json) и проверяются на эталонных отчётах. Поменять их можно через разработку, не отсюда: правка на лету пересчитала бы зоны у всех клиентов.</small></div>
        </div>
      </section>

      <div className="a-chips">
        <Link className="a-chip" aria-current={!sp.sort ? "true" : undefined} href={`/admin/app/catalog${qs({ sort: undefined })}`}>По алфавиту</Link>
        {stats && <Link className="a-chip" aria-current={sp.sort === "red" ? "true" : undefined} href={`/admin/app/catalog${qs({ sort: sp.sort === "red" ? undefined : "red" })}`}>Чаще в красной зоне</Link>}
      </div>
      <form className="a-filters" method="get">
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Продукт или синоним" /></label>
        <button className="a-btn" type="submit">Найти</button>
      </form>
      {!stats && <div className="a-note" style={{ marginBottom: 16 }}>Статистика по зонам появится, когда отчёты загрузят хотя бы {MIN_CLIENTS} клиентов: на меньшем числе её можно связать с конкретным человеком.</div>}
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Продукт</th><th>Синонимы при распознавании</th><th>В рецептах</th>{stats && <><th>В красной зоне</th><th>В жёлтой</th></>}</tr></thead>
              <tbody>
                {rows.map((r) => {
                  const pct = (n: number) => (r.tested ? `${Math.round((n / r.tested) * 100)}%` : "—");
                  return (
                    <tr key={r.name}>
                      <td className="a-cell-main"><span>{r.name}</span>{r.molecular && <span className="sub">молекулярный компонент</span>}</td>
                      <td data-label="Синонимы" className="muted">{al[r.name]?.length ? al[r.name].slice(0, 6).join(", ") : <span className="faint">—</span>}</td>
                      <td data-label="В рецептах" className="num">{r.recipes || <span className="faint">0</span>}</td>
                      {stats && <><td data-label="В красной" className="num">{r.red} <span className="faint">{pct(r.red)}</span></td><td data-label="В жёлтой" className="num">{r.yellow} <span className="faint">{pct(r.yellow)}</span></td></>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Ничего не нашли</b>Попробуйте другое написание.</div>}
      </div>
    </>
  );
}
