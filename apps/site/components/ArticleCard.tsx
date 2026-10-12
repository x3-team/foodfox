import Link from "next/link";
import { useEffect, type RefObject } from "react";
import { authorBySlug, categoryLabel, type Article } from "@/lib/content";

/**
 * Scroll entrance for blog / service grids (A1 · S04 · C1 · U03 · B4 · L02 · L04 · V02).
 * Elements rendered with the class `rv` stay hidden until they cross the line `line` (0.85 = 85% of the viewport
 * from the top), then get `is-shown`: one CSS entrance, once. Elements entering in the same frame (a row) are
 * staggered by `stagger` ms, left to right / top to bottom. The top root margin is huge on purpose: anything
 * already scrolled past (fast scroll, anchor jump, reload in the middle of the page) counts as entered and is shown
 * at once, so nothing is ever left invisible above the viewport. `key` re-scans the container (new cards after a
 * filter), `fast` = the 400 мс / stagger 60 мс variant of A2/C3.
 */
export function useReveal(
  ref: RefObject<HTMLElement | null>,
  key: unknown,
  { line = 0.85, stagger = 80, fast = false, cascade = false }: { line?: number; stagger?: number; fast?: boolean; cascade?: boolean } = {},
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // `.rv` — one element; `.rv-g` — a group (carousel row) whose children enter together with a CSS stagger.
    const nodes = [...root.querySelectorAll<HTMLElement>(".rv:not(.is-shown), .rv-g:not(.is-shown)")].filter((node) => !node.parentElement?.closest(".rv-g"));
    if (root.matches(".rv:not(.is-shown), .rv-g:not(.is-shown)")) nodes.unshift(root);
    if (!nodes.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-shown"));
      return;
    }
    const step = fast ? 60 : stagger;
    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        let row = Number.NaN;
        let index = 0;
        hits.forEach((entry) => {
          const node = entry.target as HTMLElement;
          io.unobserve(node);
          // already above the viewport — just show it, no animation nobody would see
          if (entry.boundingClientRect.bottom <= 0) {
            node.classList.add("is-shown", "is-instant");
            return;
          }
          // stagger restarts on every new row (a cascade — M07 «Показать ещё» — keeps counting)
          if (!cascade && Math.abs(entry.boundingClientRect.top - row) > 8) {
            row = entry.boundingClientRect.top;
            index = 0;
          }
          node.style.setProperty("--rv-d", `${Math.min(index, 5) * step}ms`);
          node.classList.toggle("is-fast", fast);
          node.classList.add("is-shown");
          index += 1;
        });
      },
      { rootMargin: `100000px 0px -${Math.round((1 - line) * 100)}% 0px`, threshold: 0 },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Without JavaScript nothing would ever add `is-shown` — keep the `.rv` content visible then. */
export function RevealNoScript() {
  return <noscript dangerouslySetInnerHTML={{ __html: "<style>.rv,.rv-g>.rv,.aside-card.is-off{opacity:1!important;transform:none!important;visibility:visible!important}</style>" }} />;
}

export function ArticleCard({ article }: { article: Article; index?: number }) {
  const author = authorBySlug(article.author);
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="card rv"
      data-slug={article.slug}
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
        // Card / Skeleton (1066:230): cover 300 · two meta pills · two title lines · two excerpt lines · avatar + name.
        <div className="card skeleton" key={i}>
          <div className="card-cover bone" />
          <div className="sk-meta"><i className="bone" /><i className="bone" /></div>
          <div className="sk-title"><i className="bone" /><i className="bone" /></div>
          <div className="sk-text"><i className="bone" /><i className="bone" /></div>
          <div className="sk-author"><i className="bone" /><i className="bone" /></div>
        </div>
      ))}
    </div>
  );
}
