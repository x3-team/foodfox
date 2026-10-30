import type { Metadata } from "next";
import { ReviewsManager } from "@/components/admin/ReviewsManager";
import { requireStaff } from "@/lib/admin/auth";
import { one, q } from "@/lib/admin/db";
import type { Lead } from "@/lib/admin/leads";
import { DEFAULTS } from "@/lib/cms/registry";
import type { Review } from "@/lib/site-data/reviews";

export const metadata: Metadata = { title: "Отзывы" };

export default async function ReviewsAdmin() {
  await requireStaff("reviews");
  const inbox = await q<Lead>("SELECT * FROM leads WHERE kind = 'review' AND status IN ('new', 'in_progress') ORDER BY created_at DESC LIMIT 100");
  const row = await one<{ value: Review[] }>("SELECT value FROM site_content WHERE key = 'reviews.list'");
  const list = row?.value ?? (DEFAULTS["reviews.list"] as Review[]);
  return (
    <>
      <div className="a-head">
        <div>
          <h1>Отзывы</h1>
          <p>Отзывы с формы на /reviews приходят сюда на модерацию. Опубликованные показываются на странице «Отзывы» в этом порядке.</p>
        </div>
        <div className="a-head-actions"><a className="a-btn is-ghost" href="/reviews" target="_blank" rel="noreferrer">Открыть /reviews ↗</a></div>
      </div>
      <ReviewsManager
        inbox={inbox.map((l) => ({ id: String(l.id), name: l.name, city: l.city, who: String(l.payload.who ?? ""), text: l.message, createdAt: new Date(l.created_at).toISOString() }))}
        list={list}
      />
    </>
  );
}
