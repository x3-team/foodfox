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
                  <li><b>CE-IVDR</b><span>европейская маркировка IVD</span></li>
                  <li><b>ISO 13485</b><span>система качества изделий</span></li>
                  <li><b>РУ РФ</b><span>обращение на территории России</span></li>
                </ul>
              </div>
              <div className="c-stack" aria-hidden="true">
                <p>4 документа · PDF</p>
                <span />
                <span />
                <em>CE · IVDR 2017/746</em>
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
              {DOCS.map(([code, kind, text, size]) => (
                <article className="cert-card" key={code}>
                  <div className="c-paper" aria-hidden="true"><b>{code}</b></div>
                  <p>{kind}</p>
                  <h3>{code}</h3>
                  <p>{text}</p>
                  <span>{size}</span>
                  <button type="button" onClick={() => setOpen(code)}>Открыть PDF</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section data-s="c03">
          <div className="wrap c03">
            <div>
              <p className="fx-kicker">О производителе</p>
              <h2>MacroArray Diagnostics</h2>
              <p>Австрийская компания, с 2016 года разрабатывает лабораторные системы для мультиплексного анализа. В России тест FOX представляет МФК Инмунотех.</p>
              <dl>
                <div><b>2016</b><span>основание в Вене</span></div>
                <div><b>286</b><span>пищевых антигенов</span></div>
                <div><b>1500+</b><span>лабораторий в РФ</span></div>
              </dl>
            </div>
            <img src="/figma/certificates/madx.jpg" alt="" />
          </div>
        </section>

        <section data-s="c04">
          <div className="wrap c04">
            <div>
              <p className="fx-kicker">Технология</p>
              <h2>ELISA — стандартная лабораторная процедура</h2>
              <p>Мультиплексный непрямой ELISA: сотни антигенов смотрят в одном анализе крови. Это процедура лаборатории, а не домашний тест.</p>
              <ol>
                <li><b>01</b><span>Образец крови</span></li>
                <li><b>02</b><span>286 антигенов</span></li>
                <li><b>03</b><span>Отчёт</span></li>
              </ol>
            </div>
            <img src="/figma/certificates/elisa.jpg" alt="" />
          </div>
        </section>

        <section data-s="c05">
          <div className="wrap c05">
            <header>
              <h2>История FOX</h2>
              <p>От лаборатории в Вене до партнёрской сети по всей России.</p>
            </header>
            <ol>
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
