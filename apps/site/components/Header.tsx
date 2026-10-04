"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const NAV = [
  { href: "/specialists", label: "Для специалистов" },
  { href: "/labs", label: "Где сдать тест" },
  { href: "/certificates", label: "Сертификаты" },
  { href: "/faq", label: "FAQ" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/contacts", label: "Контакты" },
  { href: "/blog", label: "Блог" },
];

export const PARTNER_LOGIN = "https://foodfox.yuri.guru/partner";

export function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenu(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-left">
        <Link href="/" className="logo" aria-label="FOX Food Xplorer">
          <img src="/icons/logo-dark.svg" alt="" />
        </Link>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={path.startsWith(item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="header-right">
        <Link className="example-link" href="/report">
          Пример результата
          <img src="/icons/download.svg" alt="" />
        </Link>
        <Link className="btn btn-dark" href="/labs#zapis">
          Записаться на тест
        </Link>
        <button className="burger" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu((v) => !v)}>
          {menu ? "Закрыть" : "Меню"}
        </button>
      </div>
      {menu && (
        <div id="mobile-menu" className="mobile-menu" role="dialog" aria-label="Меню">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/course">Курс для специалистов</Link>
          <a href={PARTNER_LOGIN}>Кабинет партнёра</a>
          <Link className="btn btn-dark" href="/labs#zapis">
            Записаться на тест
          </Link>
        </div>
      )}
    </header>
  );
}
