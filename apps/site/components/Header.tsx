"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/specialists", label: "Для специалистов" },
  { href: "/labs", label: "Где сдать тест" },
  { href: "/certificates", label: "Сертификаты" },
  { href: "/faq", label: "FAQ" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/contacts", label: "Контакты" },
  { href: "/blog", label: "Блог" },
];

export function Header({ current = "/blog" }: { current?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-left">
        <Link href="/blog" className="logo" aria-label="FOX Food Xplorer">
          <img src="/icons/logo-dark.svg" alt="" />
        </Link>
        <nav className="nav" aria-label="Разделы">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current.startsWith(item.href) && item.href === "/blog" ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="header-right">
        <a className="example-link" href="/report">
          Пример результата
          <img src="/icons/download.svg" alt="" />
        </a>
        <Link className="btn btn-dark" href="/labs">
          Записаться на тест
        </Link>
      </div>
    </header>
  );
}
