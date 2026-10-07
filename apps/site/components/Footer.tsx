"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const COLS = [
  {
    title: "Пациентам",
    links: [
      ["Как сдать тест", "/#kak-sdat"],
      ["Где сдать тест", "/labs"],
      ["Пример результата", "/report"],
      ["Отзывы", "/reviews"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "Специалистам",
    links: [
      ["Врачам и нутрициологам", "/specialists"],
      ["Курс по тесту FOX", "/course"],
      ["Отчёт: как читать", "/report"],
      ["Сертификаты", "/certificates"],
      ["Кабинет партнёра ↗", "https://foodfox.yuri.guru/partner"],
    ],
  },
  {
    title: "Знания",
    links: [
      ["Блог", "/blog"],
      ["Авторы", "/blog/authors"],
      ["286 продуктов панели", "/#products"],
      ["Симптом-чекер", "/#checker"],
    ],
  },
  {
    title: "Контакты",
    links: [
      ["+7 (495) 374-83-05", "tel:+74953748305"],
      ["info@inmunotech.ru", "mailto:info@inmunotech.ru"],
      ["Москва, ул. Таганская, 3", "/contacts"],
      ["Наш Telegram", "https://t.me/foxfoodxplorer"],
    ],
  },
];

export function Footer() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const img = node.querySelector<HTMLElement>(".bokeh");
    if (!img) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const progress = 1 - rect.top / window.innerHeight;
      const shift = Math.max(-24, Math.min(0, -24 * progress));
      img.style.setProperty("--shift", `${shift}px`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer className="footer" ref={ref}>
      <img className="bokeh" src="/blog/footer-bokeh.png" alt="" />
      <div className="shade" />
      <div className="footer-top">
        <div className="brand">
          <img src="/icons/logo-light.svg" alt="FOX" />
          <p>Лабораторный тест на иммунологическую пищевую непереносимость. 286 продуктов, один забор крови, 7–10 дней.</p>
        </div>
        <div className="cols">
          {COLS.map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              <div className="foot-links is-open">
              {col.links.map(([label, href]) =>
                href.startsWith("http") ? (
                  <a key={label} href={href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                ) : (
                  <Link key={label} href={href}>
                    {label}
                  </Link>
                ),
              )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="disclaimer">
        FOX Food Xplorer — лабораторный тест для поддержки персонализированных диетических вмешательств. Не является тестом на аллергию (IgE), не устанавливает диагноз и не заменяет консультацию специалиста. Имеются противопоказания, необходимо проконсультироваться со специалистом.
      </p>
      <div className="footer-bottom">
        <div className="rule" />
        <div className="legal">
          <div>
            <Link href="/privacy">Политика конфиденциальности</Link>
            <Link href="/certificates">Сертификаты и документы</Link>
          </div>
          <span>© 2026 FOX Food Xplorer · Inmunotech</span>
        </div>
      </div>
    </footer>
  );
}
