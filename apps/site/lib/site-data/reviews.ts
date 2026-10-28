/* Published reviews of /reviews: defaults for the site and for the admin (lib/cms/registry.ts). */

export type Review = {
  id: string;
  kind: string;
  who: string;
  tag: string;
  photo: string;
  video: boolean;
  title: string;
  name: string;
  role?: string;
  text: string;
  hidden?: boolean;
  leadId?: string;
};

export const REVIEWS_DEFAULT: Review[] = [
  { id: "r1", kind: "Видео", who: "Пациенты", tag: "ЖКТ", photo: "/figma/reviews/r1.webp", video: true, title: "Наконец поняла, что менять в рационе", name: "Елена, 34 года", text: "" },
  { id: "r2", kind: "Текст", who: "Пациенты", tag: "Питание", photo: "/figma/reviews/r2.webp", video: false, title: "", name: "Екатерина Ласковская", text: "Убирала молочку, потом глютен, потом всё сразу — и каждый раз наугад. Отчёт наконец дал конкретный список." },
  { id: "r3", kind: "Текст", who: "Пациенты", tag: "Общее самочувствие", photo: "/figma/reviews/r3.webp", video: false, title: "", name: "Игорь Потруников", text: "Списывал всё на возраст и работу. Четыре месяца вёл дневник питания и не продвинулся ни на шаг." },
  { id: "r4", kind: "Текст", who: "Специалисты", tag: "Специалист", photo: "/figma/reviews/r1.webp", video: false, title: "", name: "Алёна Вавилова", role: "Нутрициолог", text: "С отчётом легче выстроить разговор: пациент видит структуру, а не список запретов." },
  { id: "r5", kind: "Видео", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r5.webp", video: true, title: "Ответ оказался не в косметологии", name: "Алексей, 41 год", text: "" },
  { id: "r6", kind: "Текст", who: "Пациенты", tag: "Кожа", photo: "/figma/reviews/r2.webp", video: false, title: "", name: "Марина К.", text: "С врачом собрали план по отчёту — без угадывания. Через два месяца стало заметно лучше." },
  { id: "r7", kind: "Текст", who: "Пациенты", tag: "Вес и отёчность", photo: "/figma/reviews/r7.webp", video: false, title: "", name: "Ольга, 29 лет", text: "Думала, что дело в соли. С нутрициологом временно убрали лишнее — ушло ощущение тяжести." },
  { id: "r8", kind: "Текст", who: "Специалисты", tag: "Общее самочувствие", photo: "/figma/reviews/r8.webp", video: false, title: "", name: "Клиника на Таганке", text: "Отчёт стал структурой приёма, а не списком запретов, который пациент составил сам." },
];
