import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap" style={{ minHeight: "60vh", padding: "80px 0" }}>
        <p className="crumbs">
          <Link href="/">Главная</Link>
          <span className="sep">/</span>
          <span aria-current="page">404</span>
        </p>
        <h1 style={{ fontWeight: 300, fontSize: 56, lineHeight: "60px", letterSpacing: "-1px", margin: "24px 0" }}>
          Страница не найдена
        </h1>
        <p style={{ color: "rgba(11,12,8,.65)", fontSize: 20, lineHeight: "24px", maxWidth: 560 }}>
          Такой страницы нет. Блог открывается с главной.
        </p>
        <p style={{ marginTop: 28 }}>
          <Link className="btn btn-dark" href="/">
            Открыть блог
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
