"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useDialog } from "@/components/useDialog";

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
  const [menu, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const lastY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);
  // G06: closing plays the opening in reverse for 200мс before the panel unmounts.
  const setMenu = (next: boolean | ((value: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(menu) : next;
    if (value) {
      setClosing(false);
      setMenuOpen(true);
      setHidden(false);
      return;
    }
    if (!menu) return;
    if (prefersReducedMotion()) {
      setMenuOpen(false);
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setMenuOpen(false);
    }, 200);
  };
  useDialog(menuRef, () => setMenu(false), menu && !closing);
  const lessons = path.startsWith("/course/lessons");
  const variant = path.startsWith("/specialists") ? "b2b" : path.startsWith("/course") ? "course" : "site";
  const darkHero = path === "/" || path.startsWith("/specialists") || path === "/course" || path === "/labs" || path === "/faq" || path === "/reviews" || path === "/contacts" || path === "/report" || path === "/certificates";
  const homeMobileStack = path === "/" && mobileNav;
  const onDark = !scrolled && darkHero && !lessons && !homeMobileStack;
  const items = variant === "b2b" ? B2B : variant === "course" ? COURSE : NAV;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const syncMobile = () => setMobileNav(mq.matches);
    syncMobile();
    mq.addEventListener("change", syncMobile);
    return () => mq.removeEventListener("change", syncMobile);
  }, []);

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
    setMenuOpen(false);
    setClosing(false);
  }, [path]);

  useEffect(() => {
    if (menu) setHidden(false);
  }, [menu]);

  return (
    <header
      className={`site-header${scrolled ? " is-scrolled" : ""}${hidden ? " is-hidden" : ""}${onDark ? " on-dark" : ""}${homeMobileStack && !scrolled && !menu ? " is-home-top" : ""} header-${variant}`}
    >
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
            {/* Figma Header (1069:409): «Пример результата» + one button; white on the transparent state. */}
            <button className={`btn ${onDark ? "btn-light" : "btn-dark"}`} type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button>
          </>
        ) : (
          <Link className="btn btn-dark" href="/course">Зарегистрироваться на курс</Link>
        )}
        <button
          className={`menu-capsule burger${menu ? " is-x" : ""}`}
          aria-label="Меню"
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => setMenu(!menu || closing)}
        >
          <span className="menu-capsule-label">{menu && !closing ? "Закрыть" : "Меню"}</span>
          <span className="menu-capsule-burger" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
      {menu && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className={`mobile-menu${closing ? " is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
          onTouchStart={(event) => {
            swipe.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(event) => {
            const start = swipe.current;
            swipe.current = null;
            const end = event.changedTouches[0]?.clientY ?? start;
            // G06: a swipe up closes the menu when the list is not scrolled.
            if (start !== null && end !== null && start - end > 60 && (menuRef.current?.scrollTop ?? 0) <= 0) setMenu(false);
          }}
        >
          {/* G06: items cascade from 120мс with a 30мс step; the bottom block comes last, +80мс. */}
          {NAV.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ animationDelay: `${120 + index * 30}ms` }} aria-current={path.startsWith(item.href) ? "page" : undefined}>
              {item.label} <img src="/icons/arrow-right-light.svg" alt="" />
            </Link>
          ))}
          {[
            <a key="partner" href={PARTNER_LOGIN}>Кабинет партнёра</a>,
            <a key="tel" href="tel:+74953748305">+7 (495) 374-83-05</a>,
            <a key="tg" href="https://t.me/foxfoodxplorer">Telegram</a>,
            <button key="contact" className="btn btn-light" type="button" onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:contact")); }}>Связаться</button>,
            <button key="book" className="btn btn-light" type="button" onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:book")); }}>Записаться на тест</button>,
          ].map((node, index) => (
            <span key={node.key} className="mobile-menu-foot" style={{ animationDelay: `${120 + (NAV.length - 1) * 30 + 80 + index * 30}ms` }}>
              {node}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
