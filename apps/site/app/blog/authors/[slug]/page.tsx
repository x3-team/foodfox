import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { authors, articles, authorBySlug } from "@/lib/content";

export function generateStaticParams() {
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const author = authorBySlug((await params).slug);
  if (!author) return {};
  return { title: author.name, description: author.bio };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const author = authorBySlug((await params).slug);
  if (!author) notFound();
  const posts = articles.filter((article) => article.author === author.slug);

  return (
    <>
      <Header />
      <main>
        <section className="wrap" style={{ paddingTop: 24 }}>
          <p className="crumbs">
            <Link href="/blog">Главная</Link>
            <span className="sep">/</span>
            <Link href="/blog">Блог</Link>
            <span className="sep">/</span>
            <Link href="/blog/authors">Авторы</Link>
            <span className="sep">/</span>
            <span aria-current="page">{author.name}</span>
          </p>
        </section>
        <section className="wrap profile">
          <div className="profile-photo">
            <img src={author.portrait} alt="" />
          </div>
          <div>
            <h1>{author.name}</h1>
            <p className="role">{author.role}</p>
            <div className="tags" style={{ marginTop: 20 }}>
              <span className="tag">{posts.length} материалов</span>
              {author.lecturer && <span className="tag tag-lime">{author.lecturer}</span>}
              <span className="tag">Эксперт FOX</span>
            </div>
            <div className="columns">
              <div>
                <h2>Опыт работы</h2>
                <ul>
                  {author.experience.map((item) => (
                    <li key={item.years}>
                      <span>{item.years}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Образование и темы</h2>
                {author.education.map((item) => (
                  <p key={item}>{item}</p>
                ))}
                <p>{author.bio}</p>
              </div>
            </div>
          </div>
        </section>
        <section className="wrap related">
          <div className="related-head">
            <h2>{posts.length} публикаций</h2>
          </div>
          <div className="grid">
            {posts.slice(0, 6).map((article, index) => (
              <ArticleCard key={article.slug} article={article} index={index} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
