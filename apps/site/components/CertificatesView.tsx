"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const DOCS = [
  ["CE-IVDR", "Сертификат ЕС", "Соответствие требованиям ЕС к медицинским изделиям для лабораторной диагностики: разработка, производство, безопасность, контроль качества", "PDF · 1,2 МБ"],
  ["EN ISO 13485", "Качество", "Система менеджмента качества для медицинских изделий: разработка, производство и контроль лабораторных систем", "PDF · 0,9 МБ"],
  ["ISO 9001", "Качество", "Система менеджмента качества производственных процессов", "PDF · 0,7 МБ"],
  ["Регистрация в РФ", "Россия", "Статус ввоза и обращения на территории России. Самый частый вопрос и пациентов, и врачей", "PDF · данные от клиента"],
];

export function CertificatesView() {
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
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
            <div className="c-docs" data-certs data-allow-x>
              {DOCS.map(([code, kind, text, size], index) => (
                <article className="cert-card" key={code}>
                  <div className="c-paper" aria-hidden="true" style={{ backgroundImage: `url(/figma/certificates/doc-${index + 1}.png)` }}><b>{code}</b></div>
                  {/* Doc / Card (1275:449): badge, title, text, actions row «Открыть PDF ↗ · PDF · size · download». */}
                  <div className="cert-body">
                    <p className="cert-kind">{kind}</p>
                    <h3>{code}</h3>
                    <p>{text}</p>
                    <div className="cert-actions">
                      <button type="button" className="cert-open" onClick={() => setOpen(code)}>Открыть PDF <img src="/icons/arrow-up-right.svg" alt="" /></button>
                      <span>{size}</span>
                      {/\d/.test(size) && (
                        <button type="button" className="cert-dl" aria-label={`Скачать ${code}`} onClick={() => setOpen(code)}><img src="/icons/download.svg" alt="" /></button>
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
          <div className="wrap c04">
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
            <ol data-allow-x aria-label="История FOX">
              <li><b>2016</b><span>Основание MADx, Вена</span></li>
              <li><b>2017</b><span>Первый CE-маркированный IVD-продукт</span></li>
              {/* TODO: год расширения панели до 286 антигенов — уточнить у клиента */}
              <li><b>…</b><span>Расширение панели до 286 антигенов</span></li>
              <li><b>Сегодня</b><span>1500+ лабораторий-партнёров в РФ</span></li>
            </ol>
          </div>
        </section>

        {open && (
          <div className="modal-back" onClick={() => setOpen(null)}>
            <div className="modal" role="dialog" aria-label={open} onClick={(event) => event.stopPropagation()}>
              <h2>{open}</h2>
              <p>Просмотрщик PDF. Файл описывает соответствие производства, а не эффективность для конкретного человека.</p>
              <button type="button" className="btn btn-dark" onClick={() => setOpen(null)}>Закрыть</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
