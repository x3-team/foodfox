import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { requireStaff } from "@/lib/admin/auth";
import { q } from "@/lib/admin/db";
import { PAGES } from "@/lib/cms/registry";

export const metadata: Metadata = { title: "Редактор страницы" };

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  const page = PAGES.find((p) => p.id === id);
  if (!page) notFound();
  const keys = page.sections.flatMap((s) => s.fields.map((f) => f.key));
  const rows = await q<{ key: string; value: unknown }>("SELECT key, value FROM site_content WHERE key = ANY($1)", [keys]);
  return (
    <>
      <div className="a-crumbs"><Link href="/admin/content">Страницы</Link><span>/</span><span>{page.title}</span></div>
      <div className="a-head">
        <div>
          <h1>{page.title}</h1>
          <p>Изменения появятся на сайте сразу после сохранения.</p>
        </div>
        <div className="a-head-actions">
          <a className="a-btn is-ghost" href={page.path} target="_blank" rel="noreferrer">Открыть страницу ↗</a>
        </div>
      </div>
      <ContentEditor label={page.title} sections={page.sections} saved={Object.fromEntries(rows.map((r) => [r.key, r.value]))} />
    </>
  );
}
