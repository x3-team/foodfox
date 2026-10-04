import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap band" style={{ minHeight: "60vh" }}>
        <p className="crumbs">404</p>
        <h1 className="page-title">Страница не найдена</h1>
        <p className="lead">Такого адреса нет. Вернитесь на главную или в блог.</p>
        <p style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Link className="btn btn-dark" href="/">На главную</Link>
          <Link className="btn btn-ghost" href="/blog">В блог</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
