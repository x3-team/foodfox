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

const B2B = [
  { href: "/", label: "Пациентам" },
  { href: "/labs", label: "Куда направить" },
  { href: "/report", label: "Отчёт" },
  { href: "/course", label: "Курс" },
  { href: "/certificates", label: "Сертификаты" },
];

const COURSE = [
  { href: "/course#program", label: "Программа" },
  { href: "/course#lectors", label: "Лекторы" },
  { href: "/specialists", label: "Специалистам" },
  { href: "/report", label: "Отчёт" },
];

export const PARTNER_LOGIN = "https://foodfox.yuri.guru/partner";

export function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const variant = path.startsWith("/specialists") ? "b2b" : path.startsWith("/course") ? "course" : "site";
  const onDark = !scrolled && (path === "/" || path.startsWith("/specialists") || path.startsWith("/course"));
  const items = variant === "b2b" ? B2B : variant === "course" ? COURSE : NAV;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-scrolled", scrolled);
  }, [scrolled]);

  useEffect(() => {
    setMenu(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}${onDark ? " on-dark" : ""} header-${variant}`}>
      <div className="header-left">
        <Link href="/" className="logo" aria-label="FOX Food Xplorer">
          <img src={onDark ? "/icons/logo-light.svg" : "/icons/logo-dark.svg"} alt="" />
        </Link>
        <nav className="nav" aria-label="Разделы">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={path === item.href || (item.href !== "/" && path.startsWith(item.href)) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="header-right">
        {variant === "site" && (
          <Link className="example-link" href="/report">
            Пример результата
            <img src="/icons/download.svg" alt="" />
          </Link>
        )}
        <a className="partner-dot" href={PARTNER_LOGIN} aria-label="Кабинет партнёра">
          <img src="/icons/arrow-up-right.svg" alt="" />
        </a>
        {variant === "site" ? (
          <Link className="btn btn-dark" href="/labs#zapis">Записаться на тест</Link>
        ) : (
          <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
        )}
        <button className="burger" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(true)}>
          Меню ≡
        </button>
      </div>
      {menu && (
        <div id="mobile-menu" className="mobile-menu" role="dialog" aria-label="Меню">
          <button className="menu-close" type="button" onClick={() => setMenu(false)}>Закрыть ×</button>
          {NAV.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ animationDelay: `${80 + index * 45}ms` }} aria-current={path.startsWith(item.href) ? "page" : undefined}>
              {item.label} <img src="/icons/arrow-right-light.svg" alt="" />
            </Link>
          ))}
          <Link href="/course" style={{ animationDelay: "420ms" }}>Для специалистов</Link>
          <a href={PARTNER_LOGIN} style={{ animationDelay: "460ms" }}>Кабинет партнёра</a>
          <a href="tel:+74953748305" style={{ animationDelay: "500ms" }}>+7 (495) 374-83-05</a>
          <a href="https://t.me/foxfoodxplorer" style={{ animationDelay: "540ms" }}>Telegram</a>
          <Link className="btn btn-light" href="/labs#zapis" style={{ animationDelay: "580ms" }}>Записаться на тест</Link>
        </div>
      )}
    </header>
  );
}
