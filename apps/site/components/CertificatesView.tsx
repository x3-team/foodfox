"use client";

import { useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const DOCS = [
  ["CE-IVDR", "Сертификат ЕС", "Соответствие требованиям ЕС к медицинским изделиям для лабораторной диагностики.", "PDF · 1,2 МБ"],
  ["EN ISO 13485", "Качество", "Система менеджмента качества для медицинских изделий.", "PDF · 0,9 МБ"],
  ["ISO 9001", "Качество", "Система менеджмента качества производственных процессов.", "PDF · 0,7 МБ"],
  ["РУ РФ", "Россия", "Документ для обращения теста на территории России.", "PDF · 0,8 МБ"],
];

export function CertificatesView() {
  const row = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  function scroll(dir: number) {
    row.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  }
  return (
    <>
      <Header />
      <main className="wrap band">
        <h1 className="page-title">Сертификаты и документы</h1>
        <p className="lead">FOX Food Xplorer разработан австрийской компанией MacroArray Diagnostics (MADx). Документы можно открыть или скачать. Формулировки — о производстве и качестве.</p>
        <div className="flip-nav" style={{ marginTop: 16 }}>
          <button type="button" className="page-btn arrow" aria-label="Предыдущий документ" onClick={() => scroll(-1)}>
            <img src="/icons/arrow-left.svg" alt="" />
          </button>
          <button type="button" className="page-btn arrow" aria-label="Следующий документ" onClick={() => scroll(1)}>
            <img src="/icons/arrow-right.svg" alt="" />
          </button>
        </div>
        <div className="cert-row" data-certs ref={row}>
          {DOCS.map(([code, kind, text, size]) => (
            <article className="panel cert-card" key={code}>
              <p className="meta-line">{kind}</p>
              <h3>{code}</h3>
              <p>{text}</p>
              <p className="meta-line">{size}</p>
              <button type="button" className="btn btn-dark" onClick={() => setOpen(code)}>Открыть PDF</button>
            </article>
          ))}
        </div>
        {open && (
          <div className="modal-back" onClick={() => setOpen(null)}>
            <div className="modal" role="dialog" aria-label={open} onClick={(event) => event.stopPropagation()}>
              <h2>{open}</h2>
              <p className="lead">Просмотрщик PDF. Файл описывает соответствие производства, а не эффективность для конкретного человека.</p>
              <button type="button" className="btn btn-dark" onClick={() => setOpen(null)}>Закрыть</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
