"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const lastY = useRef(0);
  const lessons = path.startsWith("/course/lessons");
  const variant = path.startsWith("/specialists") ? "b2b" : path.startsWith("/course") ? "course" : "site";
  const darkHero = path === "/" || path.startsWith("/specialists") || path === "/course" || path === "/labs" || path === "/faq" || path === "/reviews" || path === "/contacts" || path === "/report" || path === "/certificates";
  const onDark = !scrolled && darkHero && !lessons;
  const items = variant === "b2b" ? B2B : variant === "course" ? COURSE : NAV;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const mobile = window.matchMedia("(max-width: 1100px)").matches;
      const hideAfter = mobile ? 80 : 400;
      setScrolled(y > 80);
      if (menu) {
        setHidden(false);
      } else if (y > hideAfter && y > lastY.current + 6) {
        setHidden(true);
      } else if (y < lastY.current - 6 || y < 40) {
        setHidden(false);
      }
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menu]);

  useEffect(() => {
    document.documentElement.classList.toggle("is-scrolled", scrolled);
  }, [scrolled]);

  useEffect(() => {
    setMenu(false);
  }, [path]);

  useEffect(() => {
    if (menu) setHidden(false);
  }, [menu]);

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
    <header className={`site-header${scrolled ? " is-scrolled" : ""}${hidden ? " is-hidden" : ""}${onDark ? " on-dark" : ""} header-${variant}`}>
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
          <img src={onDark ? "/icons/user-light.svg" : "/icons/user.svg"} alt="" />
        </a>
        {lessons ? (
          <span className="cabinet-pill">Кабинет курса</span>
        ) : variant === "site" ? (
          <>
            <button className="btn btn-ghost header-contact" type="button" onClick={() => window.dispatchEvent(new Event("fox:contact"))}>Связаться</button>
            <button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button>
          </>
        ) : (
          <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
        )}
        <button
          className={`burger${menu ? " is-x" : ""}`}
          aria-label="Меню"
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => {
            setMenu((value) => {
              const next = !value;
              if (next) setHidden(false);
              return next;
            });
          }}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {menu && (
        <div id="mobile-menu" className="mobile-menu" role="dialog" aria-label="Меню">
          {NAV.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ animationDelay: `${80 + index * 45}ms` }} aria-current={path.startsWith(item.href) ? "page" : undefined}>
              {item.label} <img src="/icons/arrow-right-light.svg" alt="" />
            </Link>
          ))}
          <a href={PARTNER_LOGIN} style={{ animationDelay: "460ms" }}>Кабинет партнёра</a>
          <a href="tel:+74953748305" style={{ animationDelay: "500ms" }}>+7 (495) 374-83-05</a>
          <a href="https://t.me/foxfoodxplorer" style={{ animationDelay: "540ms" }}>Telegram</a>
          <button className="btn btn-light" type="button" style={{ animationDelay: "580ms" }} onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:contact")); }}>Связаться</button>
          <button className="btn btn-light" type="button" style={{ animationDelay: "620ms" }} onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:book")); }}>Записаться на тест</button>
        </div>
      )}
    </header>
  );
}
