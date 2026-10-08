import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorPosts, SubscribeLink } from "@/components/AuthorPosts";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { authors, articles, authorBySlug, materialsWord } from "@/lib/content";

export function generateStaticParams() {
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const author = authorBySlug((await params).slug);
  if (!author) return {};
  return { title: author.name, description: author.bio };
}

const GENITIVE: Record<string, string> = { Ксения: "Ксении", Алёна: "Алёны", Светлана: "Светланы", Дмитрий: "Дмитрия", Анна: "Анны" };
function authorGenitive(name: string) {
  if (name.startsWith("Редакция")) return "редакции FOX";
  const first = name.split(" ")[0];
  return GENITIVE[first] ?? name;
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
              <span className="tag">{posts.length} {materialsWord(posts.length)}</span>
              {author.lecturer && <span className="tag tag-lime">{author.lecturer}</span>}
              <span className="tag">Эксперт FOX</span>
            </div>
            <p className="pf-tg-d" style={{ marginTop: 16 }}>
              <SubscribeLink className="btn btn-dark">Подписаться в Telegram</SubscribeLink>
            </p>
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
            {/* Phone: «подписаться на автора» card (Figma 1457:50156) instead of the hero button. */}
            <div className="pf-tg-m">
              <p>Новые материалы от {authorGenitive(author.name)} — в Telegram</p>
              <SubscribeLink className="btn btn-light">Подписаться</SubscribeLink>
            </div>
          </div>
        </section>
        <AuthorPosts posts={posts} />
      </main>
      <Footer />
    </>
  );
}
