import type { Metadata } from "next";
import Link from "next/link";
import { AppNotReady } from "@/components/admin/AppNotReady";
import { Icon } from "@/components/admin/Icon";
import { requireStaff } from "@/lib/admin/auth";
import { appReady } from "@/lib/admin/app";
import { q } from "@/lib/admin/db";
import { ago } from "@/lib/admin/format";

export const metadata: Metadata = { title: "Рецепты" };

const TABS = [
  { id: "", label: "Все", where: "r.archived_at IS NULL" },
  { id: "live", label: "В приложении", where: "r.archived_at IS NULL AND r.published" },
  { id: "draft", label: "Черновики", where: "r.archived_at IS NULL AND NOT r.published" },
  { id: "archive", label: "Архив", where: "r.archived_at IS NOT NULL" },
];

type Row = { id: string; title: string; description: string | null; photo_url: string | null; tags: string[]; published: boolean; archived_at: Date | null; updated_at: Date; steps: number; fox: number; edited: boolean };

export default async function RecipesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("app_recipes");
  if (!(await appReady())) return <AppNotReady />;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === (sp.tab ?? "")) ?? TABS[0];
  const params: unknown[] = [];
  let where = tab.where;
  const text = sp.q?.trim();
  if (text) { params.push(`%${text.replace(/[%_\\]/g, "\\$&")}%`); where += " AND (r.title ILIKE $1 OR r.description ILIKE $1 OR r.tags::text ILIKE $1)"; }
  const rows = await q<Row>(
    `SELECT r.id, r.title, r.description, r.photo_url, r.tags, r.published, r.archived_at, r.updated_at,
            jsonb_array_length(coalesce(r.steps, '[]'))::int AS steps, (r.admin_edited_at IS NOT NULL) AS edited,
            (SELECT count(*)::int FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS fox
       FROM recipes r WHERE ${where} ORDER BY r.published DESC, r.updated_at DESC LIMIT 300`,
    params,
  );
  const counts = await q<{ id: string; n: number }>(
    `SELECT 'live' AS id, count(*) FILTER (WHERE archived_at IS NULL AND published)::int AS n FROM recipes
     UNION ALL SELECT 'draft', count(*) FILTER (WHERE archived_at IS NULL AND NOT published)::int FROM recipes
     UNION ALL SELECT 'archive', count(*) FILTER (WHERE archived_at IS NOT NULL)::int FROM recipes
     UNION ALL SELECT '', count(*) FILTER (WHERE archived_at IS NULL)::int FROM recipes`,
  );
  const n = (id: string) => counts.find((c) => c.id === id)?.n ?? 0;

  return (
    <>
      <div className="a-head">
        <div>
          <h1>Рецепты</h1>
          <p>Рецепты в разделе «Рецепты» приложения. Продукты FOX у рецепта сравниваются с зонами клиента: с красными приложение предупредит и опустит рецепт вниз.</p>
        </div>
        <div className="a-head-actions"><Link className="a-btn is-lime" href="/admin/app/recipes/new"><Icon name="plus" size={16} /> Новый рецепт</Link></div>
      </div>
      <div className="a-chips">
        {TABS.map((t) => <Link key={t.id} className="a-chip" aria-current={t.id === tab.id ? "true" : undefined} href={`/admin/app/recipes${t.id ? `?tab=${t.id}` : ""}`}>{t.label} <i>{n(t.id)}</i></Link>)}
      </div>
      <form className="a-filters" method="get">
        {tab.id && <input type="hidden" name="tab" value={tab.id} />}
        <label className="a-field is-search"><span className="sr">Поиск</span><input className="a-input" name="q" defaultValue={sp.q} placeholder="Название, описание или тег" /></label>
        <button className="a-btn" type="submit">Найти</button>
      </form>
      <div className="a-table-wrap">
        {rows.length ? (
          <div className="a-table-scroll">
            <table className="a-table">
              <thead><tr><th>Рецепт</th><th>Теги</th><th>Шаги</th><th>Продукты FOX</th><th>Изменён</th><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="a-cell-main">
                      <div className="a-article-cell">
                        {r.photo_url ? <img className="a-recipe-thumb" src={r.photo_url} alt="" loading="lazy" /> : <span className="a-recipe-thumb is-empty" aria-hidden="true" />}
                        <div><Link href={`/admin/app/recipes/${r.id}`}>{r.title}</Link>{r.description && <span className="sub">{r.description}</span>}</div>
                      </div>
                    </td>
                    <td data-label="Теги">{r.tags?.length ? <span className="a-badges">{r.tags.slice(0, 3).map((t) => <span key={t} className="a-tag">{t}</span>)}</span> : <span className="faint">—</span>}</td>
                    <td data-label="Шаги" className="num">{r.steps}</td>
                    <td data-label="Продукты FOX">{r.fox ? <span className="num">{r.fox}</span> : <span className="a-badge is-off" title="Без продуктов приложение не проверит рецепт по зонам клиента">не указаны</span>}</td>
                    <td data-label="Изменён" className="nowrap">{ago(r.updated_at)}<span className="sub">{r.edited ? "в админке" : "из кода"}</span></td>
                    <td data-label="Статус">{r.archived_at ? <span className="a-badge is-off">Архив</span> : r.published ? <span className="a-badge s-done">В приложении</span> : <span className="a-badge">Черновик</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="a-empty"><b>Пусто</b>{text ? "Ничего не нашли." : tab.id === "archive" ? "В архиве ничего нет." : "Создайте первый рецепт."}</div>}
      </div>
    </>
  );
}
