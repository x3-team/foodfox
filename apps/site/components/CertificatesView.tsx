"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDialog } from "@/components/useDialog";
import { ZoomPane } from "@/components/ZoomPane";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const DOCS = [
  ["CE-IVDR", "Сертификат ЕС", "Соответствие требованиям ЕС к медицинским изделиям для лабораторной диагностики: разработка, производство, безопасность, контроль качества", "PDF · 1,2 МБ"],
  ["EN ISO 13485", "Качество", "Система менеджмента качества для медицинских изделий: разработка, производство и контроль лабораторных систем", "PDF · 0,9 МБ"],
  ["ISO 9001", "Качество", "Система менеджмента качества производственных процессов", "PDF · 0,7 МБ"],
  ["Регистрация в РФ", "Россия", "Статус ввоза и обращения на территории России. Самый частый вопрос и пациентов, и врачей", "PDF · данные от клиента"],
];

export function CertificatesView() {
  const [open, setOpen] = useState<{ code: string; index: number; from: DOMRect | null } | null>(null);
  const openDoc = (code: string, index: number, card: Element | null) => setOpen({ code, index, from: card?.querySelector(".c-paper")?.getBoundingClientRect() ?? null });
  // M29: on first appearance the phone carousel nudges 24px left and back (600 мс) to show it scrolls.
  const docsRef = useRef<HTMLDivElement>(null);
  // M30: on phones the ELISA steps appear one by one when the block reaches 70% of the screen (once).
  const elisaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = elisaRef.current;
    if (!node || !window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.classList.add("is-armed");
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      node.classList.add("is-play");
    }, { rootMargin: "0px 0px -30% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  // M31: the history line is drawn as the track scrolls; passed dots are black, the current one is lime and pulses.
  const historyRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = historyRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>("li")];
    const sync = () => {
      const max = list.scrollWidth - list.clientWidth;
      if (max <= 1) {
        list.classList.remove("is-track");
        return;
      }
      list.classList.add("is-track");
      const pos = (list.scrollLeft / max) * (items.length - 1);
      const current = Math.round(pos);
      items.forEach((item, index) => {
        item.style.setProperty("--lp", `${Math.min(1, Math.max(0, pos - index + 0.5)) * 100}%`);
        item.classList.toggle("is-current", index === current);
        item.classList.toggle("is-past", index < current);
      });
    };
    sync();
    // M31: at «Сейчас» the track hits the end and gives up to 24 px of rubber band, then springs back.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startX = 0;
    let band = 0;
    let pulling = false;
    const onStart = (event: TouchEvent) => {
      startX = event.touches[0].clientX;
      pulling = false;
      band = 0;
      list.style.transition = "";
    };
    const onMove = (event: TouchEvent) => {
      if (reduce || event.touches.length > 1) return;
      const max = list.scrollWidth - list.clientWidth;
      const atEnd = max > 1 && list.scrollLeft >= max - 1;
      const dx = event.touches[0].clientX - startX;
      if (!pulling) {
        if (!atEnd || dx >= 0) {
          startX = event.touches[0].clientX;
          return;
        }
        pulling = true;
      }
      band = Math.max(-24, Math.min(0, dx * 0.4));
      list.style.transform = `translateX(${band}px)`;
    };
    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      list.style.transition = "transform 320ms cubic-bezier(.2, 1.4, .4, 1)";
      list.style.transform = "";
      band = 0;
    };
    list.addEventListener("scroll", sync, { passive: true });
    list.addEventListener("touchstart", onStart, { passive: true });
    list.addEventListener("touchmove", onMove, { passive: true });
    list.addEventListener("touchend", onEnd);
    list.addEventListener("touchcancel", onEnd);
    window.addEventListener("resize", sync);
    return () => {
      list.removeEventListener("scroll", sync);
      list.removeEventListener("touchstart", onStart);
      list.removeEventListener("touchmove", onMove);
      list.removeEventListener("touchend", onEnd);
      list.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("resize", sync);
    };
  }, []);
  useEffect(() => {
    const node = docsRef.current;
    if (!node || !window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      node.classList.add("is-nudge");
      window.setTimeout(() => node.classList.remove("is-nudge"), 700);
    }, { threshold: 0.6 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <Header />
      <main>
        <section data-s="c01">
          <div className="wrap c01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Сертификаты</span></p>
            <div className="c01-row">
              <div>
                <p className="fx-eye"><i />MacroArray Diagnostics · Вена, Австрия</p>
                <h1>Сертификаты и документы</h1>
                <p className="fx-lead">FOX Food Xplorer производит австрийская MacroArray Diagnostics. Ниже — документы о качестве и регистрации, без обещаний эффективности для конкретного человека.</p>
                <ul className="c-facts">
                  <li><img className="c-fact-ico" src="/figma/icons/file.svg" alt="" width={18} height={18} /><b>CE-IVDR</b><span>медизделие для IVD в ЕС</span></li>
                  <li><img className="c-fact-ico" src="/figma/icons/file.svg" alt="" width={18} height={18} /><b>ISO 13485</b><span>качество производства</span></li>
                  <li><img className="c-fact-ico" src="/figma/icons/file.svg" alt="" width={18} height={18} /><b>РУ РФ</b><span>обращение в России</span></li>
                </ul>
              </div>
              <div className="c-stack" aria-hidden="true">
                {/* C01 (Figma 1275:590): the stack is rebuilt from its layers so the sheets can fan out on load and on hover. */}
                <div className="c-fan">
                  <img className="c-fan-p c-fan-p1" src="/figma/certificates/fan/p1.png" alt="" />
                  <img className="c-fan-p c-fan-p2" src="/figma/certificates/fan/p2.png" alt="" />
                  <img className="c-fan-p c-fan-p3" src="/figma/certificates/fan/p3.png" alt="" />
                  <img className="c-fan-chip" src="/figma/certificates/fan/chip.png" alt="" />
                  <img className="c-fan-ce" src="/figma/certificates/fan/ce.png" alt="" />
                </div>
                <p>4 документа · PDF</p>
              </div>
            </div>
          </div>
        </section>

        <section data-s="c02">
          <div className="wrap c02">
            <header>
              <h2>Документы</h2>
              <p>Формулировки — о производстве и качестве. Нажмите, чтобы открыть PDF в просмотрщике.</p>
            </header>
            <div className="c-docs" data-certs data-allow-x ref={docsRef}>
              {DOCS.map(([code, kind, text, size], index) => (
                <article className="cert-card" key={code}>
                  <div className="c-paper" aria-hidden="true" style={{ backgroundImage: `url(/figma/certificates/doc-${index + 1}.webp)` }}><b>{code}</b></div>
                  {/* Doc / Card (1275:449): badge, title, text, actions row «Открыть PDF ↗ · PDF · size · download». */}
                  <div className="cert-body">
                    <p className="cert-kind">{kind}</p>
                    <h3>{code}</h3>
                    <p>{text}</p>
                    <div className="cert-actions">
                      <button type="button" className="cert-open" onClick={(event) => openDoc(code, index, event.currentTarget.closest(".cert-card"))}>Открыть PDF <img src="/icons/arrow-up-right.svg" alt="" /></button>
                      <span>{size}</span>
                      {/\d/.test(size) && (
                        <button type="button" className="cert-dl" aria-label={`Скачать ${code}`} onClick={(event) => openDoc(code, index, event.currentTarget.closest(".cert-card"))}><img src="/icons/download.svg" alt="" /></button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section data-s="c03">
          <div className="wrap c03">
            <div>
              <p className="fx-kicker c03-kicker"><img src="/icons/building-light.svg" alt="" />О производителе</p>
              <h2>MacroArray Diagnostics</h2>
              <p>Австрийская компания, с 2016 года создаёт лабораторные тесты, оборудование и программы для обработки результатов. В России и СНГ тест представляет МФК Инмунотех.</p>
              <dl>
                <div><b>2016</b><span>основание в Вене</span></div>
                <div><b>286</b><span>пищевых антигенов</span></div>
                <div><b>1500+</b><span>лабораторий в РФ</span></div>
              </dl>
            </div>
            <div className="c03-visual">
              <img src="/figma/certificates/madx.jpg" alt="" />
              <p className="c03-pin"><img src="/icons/pin-light.svg" alt="" />Вена, Австрия</p>
              <p className="c03-rep"><span><img src="/icons/building-dark.svg" alt="" /></span><span><b>МФК Инмунотех</b><small>официальный представитель в РФ и СНГ</small></span></p>
            </div>
          </div>
        </section>

        <section data-s="c04">
          <div className="wrap c04" ref={elisaRef}>
            <div>
              <p className="fx-kicker c04-kicker">Технология</p>
              <h2>ELISA — стандартная лабораторная процедура</h2>
              <p>FOX основан на иммуноферментном анализе — общепринятой лабораторной процедуре. За одно исследование тест измеряет уровень пищеспецифических IgG к 286 антигенам.</p>
              <ol>
                <li><b>01</b><span>Образец крови</span><small>Из вены, в лаборатории-партнёре</small></li>
                <li><b>02</b><span>286 антигенов</span><small>Уровень IgG — за одно исследование</small></li>
                <li><b>03</b><span>Отчёт</span><small>Три зоны и значения в U/mL</small></li>
              </ol>
            </div>
            <div className="c04-visual">
              <img src="/figma/certificates/elisa.jpg" alt="" />
              <p className="c04-ccd"><b><i />Anti-CCD-контроль</b><span>в каждой пробе — исключает ложные сигналы от углеводных детерминант</span></p>
            </div>
          </div>
        </section>

        <section data-s="c05">
          <div className="wrap c05">
            <header>
              <h2>История FOX</h2>
              <p>От лаборатории в Вене до партнёрской сети по всей России.</p>
            </header>
            <ol data-allow-x aria-label="История FOX" ref={historyRef}>
              <li><b>2016</b><span>Основание MADx, Вена</span></li>
              <li><b>2017</b><span>Первый CE-маркированный IVD-продукт</span></li>
              {/* TODO: год расширения панели до 286 антигенов — уточнить у клиента */}
              <li><b>…</b><span>Расширение панели до 286 антигенов</span></li>
              <li><b>Сегодня</b><span>1500+ лабораторий-партнёров в РФ</span></li>
            </ol>
          </div>
        </section>

        {open && <DocViewer key={open.code} code={open.code} index={open.index} from={open.from} onClose={() => setOpen(null)} />}
      </main>
      <Footer />
    </>
  );
}

/**
 * M29: document viewer. On phones it is fullscreen — the card grows into the screen (320 мс), title and close on top,
 * «Скачать» and «Поделиться» (Web Share API) at the bottom, a page skeleton with shimmer while the preview loads,
 * swipe down to close. The PDF files themselves are not uploaded yet, so the viewer shows the page preview
 * and «Скачать» stays disabled — no fake download.
 */
function DocViewer({ code, index, from, onClose }: { code: string; index: number; from: DOMRect | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [loaded, setLoaded] = useState(false);
  const [dy, setDy] = useState(0);
  const touch = useRef<number | null>(null);
  const zoomed = useRef(false);
  useDialog(ref, () => closeRef.current());

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || !from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = node.getBoundingClientRect();
    if (!to.width || !to.height) return;
    node.animate(
      [
        { transformOrigin: "0 0", transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: "20px", opacity: 0.6 },
        { transformOrigin: "0 0", transform: "none", opacity: 1 },
      ],
      { duration: 320, easing: "cubic-bezier(.2, .8, .2, 1)" },
    );
  }, [from]);

  async function share() {
    const url = `${window.location.origin}/certificates#${encodeURIComponent(code)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${code} — FOX Food Xplorer`, url });
      } catch {
        /* the user closed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent("fox:toast", { detail: "Ссылка скопирована" }));
    } catch {
      /* clipboard is not available */
    }
  }

  return (
    <div className="modal-back doc-back" onClick={() => closeRef.current()} style={dy ? { background: `rgba(11, 12, 8, ${Math.max(0, 0.5 - dy / 800)})` } : undefined}>
      <div
        ref={ref}
        className="modal doc-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={code}
        onClick={(event) => event.stopPropagation()}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        onTouchStart={(event) => {
          touch.current = event.touches.length === 1 && !zoomed.current ? event.touches[0].clientY : null;
        }}
        onTouchMove={(event) => {
          if (event.touches.length !== 1 || zoomed.current) {
            touch.current = null;
            if (dy) setDy(0);
            return;
          }
          if (touch.current === null) return;
          setDy(Math.max(0, event.touches[0].clientY - touch.current));
        }}
        onTouchEnd={() => {
          touch.current = null;
          if (dy > 120) closeRef.current();
          else setDy(0);
        }}
      >
        <header className="doc-top">
          <h2>{code}</h2>
          <button type="button" className="doc-x" onClick={() => closeRef.current()} aria-label="Закрыть">×</button>
        </header>
        <div className="doc-page">
          {!loaded && <span className="doc-skel" aria-hidden><i /><i /><i /><i /><i /></span>}
          {/* M29: pinch-zoom inside the document (1–4×, double tap 2.5×); swipe-to-close pauses while zoomed. */}
          <ZoomPane onZoomChange={(value) => { zoomed.current = value; }}>
            <img src={`/figma/certificates/doc-${index + 1}.webp`} alt={`${code} — превью документа`} onLoad={() => setLoaded(true)} className={loaded ? "is-loaded" : ""} draggable={false} />
          </ZoomPane>
        </div>
        <p className="doc-note">PDF пока не загружен — показано превью документа.</p>
        <footer className="doc-actions">
          <button type="button" className="btn btn-ghost" disabled title="PDF пока не загружен">Скачать</button>
          <button type="button" className="btn btn-dark" onClick={() => void share()}>Поделиться</button>
        </footer>
      </div>
    </div>
  );
}
