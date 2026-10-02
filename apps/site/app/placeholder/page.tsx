import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = { title: "Раздел в вёрстке" };

export default function Placeholder() {
  return (
    <>
      <Header />
      <main className="wrap" style={{ minHeight: "50vh", padding: "80px 0" }}>
        <p className="crumbs">
          <Link href="/blog">Блог</Link>
        </p>
        <h1 style={{ fontWeight: 300, fontSize: 40, lineHeight: "44px", letterSpacing: "-1px", margin: "24px 0" }}>
          Этот экран ещё не свёрстан
        </h1>
        <p style={{ color: "rgba(11,12,8,.65)", fontSize: 20, lineHeight: "24px", maxWidth: 560 }}>
          Сейчас собран десктопный блог: лента, статья, авторы. Остальные разделы сайта — следующими.
        </p>
        <p style={{ marginTop: 28 }}>
          <Link className="btn btn-dark" href="/blog">
            Вернуться в блог
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
