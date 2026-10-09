"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
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

// Figma Header / B2B (1120:3114): anchors of /specialists + «Пациентам →» switch on the right.
const B2B = [
  { href: "/specialists#method", label: "О методе" },
  { href: "/specialists#areas", label: "Области применения" },
  { href: "/specialists#route", label: "Маршрут" },
  { href: "/specialists#protocol", label: "Протокол" },
  { href: "/specialists#report", label: "Отчёт" },
  { href: "/specialists#experts", label: "Эксперты" },
  { href: "/specialists#course", label: "Курс" },
  { href: "/specialists#labs", label: "Лаборатории" },
];

// Figma Header / Course (1133:717): badge + section anchors + «Получить доступ».
const COURSE = [
  { href: "/course#audience", label: "Для кого" },
  { href: "/course#program", label: "Программа" },
  { href: "/course#lectors", label: "Лекторы" },
  { href: "/course#includes", label: "Что входит" },
  { href: "/course#faq", label: "Вопросы" },
];

export const PARTNER_LOGIN = "https://foodfox.yuri.guru/partner";
export const PARTNER_APPLY = "https://foodfox.yuri.guru/partner/apply";

export function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [partnerSheet, setPartnerSheet] = useState(false);
  const closePartnerSheet = useCallback(() => setPartnerSheet(false), []);
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
  const [lessonN, setLessonN] = useState(2);
  useEffect(() => {
    const onLesson = (event: Event) => setLessonN(Number((event as CustomEvent<number>).detail) || 1);
    window.addEventListener("fox:lesson", onLesson);
    return () => window.removeEventListener("fox:lesson", onLesson);
  }, []);
  const variant = path.startsWith("/specialists") ? "b2b" : path.startsWith("/course") ? "course" : "site";
  const darkHero = path === "/" || path.startsWith("/specialists");
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
          <img src={onDark || menu ? "/icons/logo-light.svg" : "/icons/logo-dark.svg"} alt="" />
        </Link>
        {variant === "course" && <span className="course-badge">Курс для специалистов</span>}
        <nav className="nav" aria-label="Разделы">
          {items.map((item) => (
            <Link key={item.href} href={item.href} aria-current={path === item.href || (item.href !== "/" && path.startsWith(item.href)) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="header-right">
        {variant === "b2b" && (
          <Link className="b2b-switch" href="/">
            Пациентам
            <img src="/icons/arrow-right.svg" alt="" />
          </Link>
        )}
        {variant === "site" && (
          <Link className="example-link" href="/report">
            Пример результата
            <img src="/icons/download.svg" alt="" />
          </Link>
        )}
        {lessons ? (
          <span className="lesson-progress" aria-label={`Пройдено ${lessonN} из 6 уроков`}>
            {lessonN} из 6 уроков
            <i><b style={{ width: `${(lessonN / 6) * 100}%` }} /></i>
          </span>
        ) : null}
        <a
          className={`partner-dot${lessons ? " is-lessons" : ""}`}
          href={PARTNER_LOGIN}
          aria-label="Кабинет партнёра"
          onClick={(event) => {
            // M08: on phones the icon opens a sheet «Войти» / «Стать партнёром» instead of leaving the page.
            if (!window.matchMedia("(max-width: 1100px)").matches) return;
            event.preventDefault();
            setPartnerSheet(true);
          }}
        >
          <img src={onDark || menu ? "/icons/user-light.svg" : "/icons/user.svg"} alt="" />
        </a>
        {lessons ? (
          <span className="cabinet-pill my-lessons">
            <img src="/figma/course/my-avatar.webp" alt="" width={32} height={32} />
            Мои уроки
          </span>
        ) : variant === "site" ? (
          <>
            {/* Figma Header (1069:409): «Пример результата» + one button; white on the transparent state. */}
            <button className={`btn ${onDark ? "btn-light" : "btn-dark"}`} type="button" onClick={() => window.dispatchEvent(new Event("fox:book"))}>Записаться на тест</button>
          </>
        ) : (
          path === "/course" ? (
            <button className="btn btn-dark" type="button" onClick={() => window.dispatchEvent(new Event("fox:course"))}>Получить доступ</button>
          ) : (
            <Link className="btn btn-dark" href="/course">Получить доступ</Link>
          )
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
      {partnerSheet && (
        <BottomSheet label="Кабинет партнёра" className="partner-bs" onClose={closePartnerSheet} portal>
          <a className="btn btn-dark" href={PARTNER_LOGIN}>Войти</a>
          <a className="btn btn-ghost" href={PARTNER_APPLY}>Стать партнёром</a>
        </BottomSheet>
      )}
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
          {/* Figma 1298:1430 bottom block: white CTA on the full width, two outline pills, phone + Telegram. */}
          <div className="mobile-menu-foot mm-bottom" style={{ animationDelay: `${120 + (NAV.length - 1) * 30 + 80}ms` }}>
            <button className="btn btn-light mm-cta" type="button" onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:book")); }}>Записаться на тест</button>
            <div className="mm-pills">
              <button className="mm-pill" type="button" onClick={() => { setMenu(false); window.dispatchEvent(new Event("fox:contact")); }}>Связаться</button>
              <a className="mm-pill" href={PARTNER_LOGIN}>
                <img src="/icons/user-light.svg" alt="" />
                Кабинет партнёра
              </a>
            </div>
            <div className="mm-contacts">
              <a href="tel:+74953748305">+7 (495) 374-83-05</a>
              <a href="https://t.me/foxfoodxplorer">
                <img src="/icons/share/telegram.svg" alt="" />
                Telegram
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
