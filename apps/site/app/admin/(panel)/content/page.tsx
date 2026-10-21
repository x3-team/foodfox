import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { ago } from "@/lib/admin/format";
import { PAGES } from "@/lib/cms/registry";

export const metadata: Metadata = { title: "Страницы" };

export default async function ContentPages() {
  await requireStaff("content");
  const rows = await q<{ key: string; updated_at: Date; updated_by_name: string }>("SELECT key, updated_at, updated_by_name FROM site_content");
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Страницы</h1>
          <p>Тексты, кнопки, картинки и списки на страницах сайта. Сохранение сразу публикует изменения; у каждого поля есть история и возврат к исходному тексту.</p>
        </div>
      </div>
      <div className="a-grid a-grid-2">
        {PAGES.map((page) => {
          const keys = page.sections.flatMap((s) => s.fields.map((f) => f.key));
          const edited = rows.filter((r) => keys.includes(r.key));
          const last = edited.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
          return (
            <Link key={page.id} href={`/admin/content/${page.id}`} className="a-card a-stat" style={{ gap: 12 }}>
              <div className="a-card-head" style={{ margin: 0 }}>
                <h2>{page.title}</h2>
                <span className="muted" style={{ fontSize: 14 }}>{page.path}</span>
              </div>
              <span className="muted">{page.sections.map((s) => s.title).join(" · ")}</span>
              <span style={{ fontSize: 14 }}>
                {edited.length ? <span className="a-badge s-in_progress">изменено полей: {edited.length}</span> : <span className="a-badge is-plain">как в макете</span>}
                {last && <span className="muted"> · {ago(last.updated_at)}, {last.updated_by_name}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
