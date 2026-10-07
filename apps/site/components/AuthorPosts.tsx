"use client";

import { useMemo, useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { CATEGORIES, type Article } from "@/lib/content";

export function AuthorPosts({ posts }: { posts: Article[] }) {
  const [filter, setFilter] = useState("all");
  const shown = useMemo(
    () => posts.filter((item) => filter === "all" || item.category === filter),
    [posts, filter],
  );
  return (
    <section className="wrap related">
      <div className="related-head">
        <h2>{shown.length} публикаций</h2>
        <div className="chips" data-allow-x>
          {CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={`chip${filter === item.id ? " is-active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid">
        {shown.slice(0, 6).map((article, index) => (
          <ArticleCard key={article.slug} article={article} index={index} />
        ))}
      </div>
    </section>
  );
}
