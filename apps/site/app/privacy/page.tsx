import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./frame.css";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

const LAW =
  "Настоящая политика определяет порядок обработки персональных данных пользователей сайта foxfoodxplorer.ru и меры по обеспечению их безопасности в соответствии с Федеральным законом № 152-ФЗ «О персональных данных». Текст — от юриста клиента, вёрстка не меняет формулировки.";

const STORE =
  "Персональные данные хранятся на серверах на территории РФ не дольше, чем требуют цели обработки, и уничтожаются по их достижении или по запросу субъекта. Текст — от юриста клиента.";

const TOC = [
  ["s1", "1. Общие положения"],
  ["s2", "2. Какие данные мы собираем"],
  ["s3", "3. Цели обработки"],
  ["s4", "4. Правовые основания"],
  ["s5", "5. Сроки хранения"],
  ["s6", "6. Передача третьим лицам"],
  ["s7", "7. Cookie и аналитика"],
  ["s8", "8. Права субъекта данных"],
  ["s9", "9. Как отозвать согласие"],
  ["s10", "10. Контакты оператора"],
];

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <section data-s="pr01">
          <div className="wrap pr01">
            <p className="crumbs"><Link href="/">Главная</Link><span className="sep">/</span><span aria-current="page">Политика конфиденциальности</span></p>
            <div className="pr01-top">
              <div>
                <h1>Политика конфиденциальности</h1>
                <p className="pr-meta"><span className="pr-meta-main"><img src="/icons/nf/pin.svg" alt="" />Редакция от 01.09.2026</span><span>Оператор: ООО «Инмунотех»</span><span>Чтение ~12 мин</span></p>
              </div>
              <div className="pr-actions">
                <button type="button" className="btn btn-dark"><img src="/icons/download.svg" alt="" />Скачать PDF</button>
                <a className="btn btn-ghost pr-link" href="#s10">К контактам оператора</a>
              </div>
            </div>
            <article className="pr-short">
              <h2>Коротко — без юридического языка</h2>
              <ul>
                <li className="pr-i1"><b>Не храним медицинские данные</b><span>Отчёты выдаёт лаборатория, на сайт они не попадают</span></li>
                <li className="pr-i2"><b>Симптом-чекер работает локально</b><span>Ответы не уходят на сервер без вашего действия</span></li>
                <li className="pr-i3"><b>Отозвать согласие — одним письмом</b><span>privacy@inmunotech.ru, ответ в течение 10 дней</span></li>
              </ul>
            </article>
          </div>
        </section>
        <section data-s="pr02">
          <div className="wrap pr02">
            <aside>
              <p>Содержание</p>
              <nav aria-label="Содержание">
                {TOC.map(([id, label]) => (
                  <a key={id} href={`#${id}`}>{label}</a>
                ))}
              </nav>
              <p className="pr-progress">Прочитано 28%</p>
            </aside>
            <div className="pr-body">
              <section id="s1">
                <h2>1. Общие положения</h2>
                <p>{LAW}</p>
              </section>
              <section id="s2">
                <h2>2. Какие данные мы собираем</h2>
                <p>{LAW}</p>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Данные</th><th>Где собираем</th><th>Зачем</th></tr></thead>
                    <tbody>
                      <tr><td>Имя, e-mail, телефон</td><td>Форма «Задать вопрос», регистрация на курс</td><td>Ответить, дать доступ к урокам</td></tr>
                      <tr><td>Специальность</td><td>Регистрация на курс</td><td>Подобрать материалы</td></tr>
                      <tr><td>Город</td><td>Страница /labs, геолокация</td><td>Показать ближайшие отделения</td></tr>
                      <tr><td>Cookie, IP, браузер</td><td>Все страницы — после согласия</td><td>Аналитика и улучшение сайта</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <section id="s3">
                <h2>3. Цели обработки</h2>
                <p>{LAW}</p>
                <aside className="pr-call">
                  <b>Важно для этого проекта</b>
                  <p>Сайт не собирает и не хранит медицинские данные и результаты анализов: отчёты выдаёт лаборатория. Симптом-чекер работает локально и не отправляет данные без явного действия пользователя.</p>
                </aside>
              </section>
              <section id="s4">
                <h2>4. Правовые основания</h2>
                <p>{LAW}</p>
              </section>
              <section id="s5">
                <h2>5. Сроки хранения</h2>
                <p>{STORE}</p>
              </section>
              <section id="s6">
                <h2>6. Передача третьим лицам</h2>
                <p>{STORE}</p>
              </section>
              <section id="s7">
                <h2>7. Cookie и аналитика</h2>
                <p>{STORE}</p>
                <p className="pr-cookie">Сейчас: необходимые + аналитика. Можно изменить в любой момент. <button type="button">Изменить выбор</button></p>
              </section>
              <section id="s8">
                <h2>8. Права субъекта данных</h2>
                <ol className="pr-rights">
                  <li><b>01</b><span>Узнать, какие данные обрабатываются</span></li>
                  <li><b>02</b><span>Уточнить или исправить данные</span></li>
                  <li><b>03</b><span>Потребовать удаления</span></li>
                  <li><b>04</b><span>Отозвать согласие</span></li>
                  <li><b>05</b><span>Обжаловать в Роскомнадзоре</span></li>
                  <li><b>06</b><span>Получить ответ в течение 10 дней</span></li>
                </ol>
              </section>
              <section id="s9">
                <h2>9. Как отозвать согласие</h2>
                <p>{STORE}</p>
              </section>
              <section id="s10">
                <h2>10. Контакты оператора</h2>
                <article className="pr-op">
                  <h3>ООО «Инмунотех»</h3>
                  <p>ОГРН 0000000000000 · Москва, ул. Таганская, 3 · privacy@inmunotech.ru</p>
                </article>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
