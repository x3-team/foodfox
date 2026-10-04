import Link from "next/link";
import { authorBySlug, categoryLabel, type Article } from "@/lib/content";

export function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
  const author = authorBySlug(article.author);
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="card reveal"
      style={{ animationDelay: `${(index % 3) * 80}ms` }}
    >
      <div className="card-cover">
        <img src={article.cover} alt="" />
        <span className="hover-arrow" aria-hidden>
          <img src="/icons/arrow-up-right.svg" alt="" />
        </span>
      </div>
      <div className="card-body">
        <div>
          <div className="tags">
            <span className="tag">~{article.minutes} минут</span>
            <span className="tag">{categoryLabel(article.category)}</span>
          </div>
          <h3>{article.title}</h3>
          <p className="excerpt">{article.excerpt}</p>
        </div>
        {author && (
          <div className="author">
            <img className="avatar" src={author.avatar} alt="" />
            <div>
              <strong>{author.name}</strong>
              <span className="role">{author.role}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div className="card skeleton" key={i}>
          <div className="card-cover bone" />
          <div className="card-body">
            <div className="bone title" />
            <div className="bone text" />
            <div className="bone author" />
          </div>
        </div>
      ))}
    </div>
  );
}
