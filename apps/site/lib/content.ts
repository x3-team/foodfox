export type Category =
  | "symptoms"
  | "nutrition"
  | "report"
  | "science"
  | "stories"
  | "specialists";

export type Author = {
  slug: string;
  name: string;
  role: string;
  avatar: string;
  portrait: string;
  roles: Array<"doctor" | "nutritionist" | "degree" | "lecturer" | "editorial">;
  materialsLabel: string;
  lecturer?: string;
  lesson?: string;
  bio: string;
  experience: Array<{ years: string; text: string }>;
  education: string[];
  topics: string[];
  listed?: boolean;
};

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; title: string; text: string }
  | { type: "figure"; src: string; caption: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "quote"; text: string; by: string }
  | { type: "cta"; title: string; text: string; primary: string; secondary: string };

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  tags: string[];
  minutes: number;
  author: string;
  cover: string;
  featured?: boolean;
  synonyms?: string[];
  blocks?: Block[];
};

export const CATEGORIES: Array<{ id: "all" | Category; label: string }> = [
  { id: "all", label: "Всё" },
  { id: "symptoms", label: "Симптомы" },
  { id: "nutrition", label: "Питание" },
  { id: "report", label: "Как читать отчёт" },
  { id: "science", label: "Наука и метод" },
  { id: "stories", label: "Истории людей" },
  { id: "specialists", label: "Специалистам" },
];

export const TAGS = [
  "лактоза",
  "глютен",
  "IgG",
  "вздутие",
  "акне",
  "дети",
  "элиминация",
] as const;

export const ROLE_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Все" },
  { id: "doctor", label: "Врачи" },
  { id: "nutritionist", label: "Нутрициологи" },
  { id: "degree", label: "Кандидаты и доктора наук" },
  { id: "lecturer", label: "Лекторы курса" },
  { id: "editorial", label: "Редакция" },
];

export const UPDATED = "12 августа 2026";

export const authors: Author[] = [
  {
    slug: "kseniya-ellinskaya",
    name: "Ксения Эллинская",
    role: "К. м. н., врач-дерматовенеролог, нутрициолог",
    avatar: "/blog/avatar-ksenia.png",
    portrait: "/blog/author-ksenia.png",
    roles: ["doctor", "nutritionist", "degree", "lecturer"],
    materialsLabel: "13 материалов",
    lecturer: "Лектор курса · урок 4",
    lesson: "урок 4",
    bio: "Пишет о связи рациона и состояния кожи: атопический дерматит, акне, розацеа. Ведёт урок 4 курса FOX для специалистов.",
    experience: [
      { years: "2005 — н. в.", text: "Врач-дерматовенеролог, косметолог" },
      { years: "2014 — н. в.", text: "Нутрициологическое сопровождение пациентов с кожными проявлениями" },
      { years: "2019 — н. в.", text: "Автор профессионального блога, 85 000+ подписчиков" },
    ],
    education: [
      "Кандидат медицинских наук. Первый МГМУ им. И. М. Сеченова, ординатура по дерматовенерологии.",
    ],
    topics: ["Кожа", "Акне", "Рацион", "Отчёт"],
  },
  {
    slug: "alyona-vavilova",
    name: "Алёна Вавилова",
    role: "Клинический нутрициолог, health-coach",
    avatar: "/blog/avatar-alyona.png",
    portrait: "/blog/author-alyona.png",
    roles: ["nutritionist", "lecturer"],
    materialsLabel: "12 материалов",
    lecturer: "Лектор курса · урок 5",
    lesson: "урок 5",
    bio: "Помогает собрать рацион по отчёту: что убрать на время, что ротировать и как возвращать продукты по одному.",
    experience: [
      { years: "2016 — н. в.", text: "Клинический нутрициолог, ведение пациентов с жалобами на ЖКТ и вес" },
      { years: "2021 — н. в.", text: "Лектор курса FOX, урок о работе с рационом после теста" },
    ],
    education: ["Член Международной ассоциации нутрициологов. Практика — разбор отчётов и дневников питания."],
    topics: ["Питание", "ЖКТ", "Вес", "Элиминация"],
  },
  {
    slug: "svetlana-kanevskaya",
    name: "Светлана Каневская",
    role: "Д. м. н., профессор, гастроэнтеролог",
    avatar: "/blog/avatar-svetlana.png",
    portrait: "/blog/author-svetlana.png",
    roles: ["doctor", "degree", "lecturer"],
    materialsLabel: "8 материалов",
    lecturer: "Лектор курса · урок 2",
    lesson: "урок 2",
    bio: "Разбирает, где IgG-тест уместен в гастроэнтерологии и чем он не заменяет очный приём.",
    experience: [
      { years: "1998 — н. в.", text: "Гастроэнтеролог, профессор" },
      { years: "2018 — н. в.", text: "Научный разбор лабораторных методов оценки пищевых реакций" },
    ],
    education: ["Доктор медицинских наук. Научные интересы — функциональные расстройства ЖКТ и нутритивная поддержка."],
    topics: ["Отчёт", "ЖКТ", "Метод"],
  },
  {
    slug: "dmitry-ellinskiy",
    name: "Дмитрий Эллинский",
    role: "Врач-дерматовенеролог, трихолог, нутрициолог",
    avatar: "/blog/avatar-editorial.png",
    portrait: "/blog/author-dmitry.png",
    roles: ["doctor", "lecturer"],
    materialsLabel: "6 материалов",
    lecturer: "Лектор курса · урок 6",
    lesson: "урок 6",
    bio: "Разбирает, как отчёт помогает в разговоре о коже и волосах, не подменяя очный приём.",
    experience: [{ years: "2012 — н. в.", text: "Дерматовенеролог, трихолог" }],
    education: ["Практикует нутрициологическое сопровождение кожных жалоб."],
    topics: ["Кожа", "Отчёт"],
  },
  {
    slug: "anna-melnikova",
    name: "Анна Мельникова",
    role: "Врач-гастроэнтеролог, к. м. н.",
    avatar: "/blog/avatar-svetlana.png",
    portrait: "/blog/author-anna.png",
    roles: ["doctor", "degree"],
    materialsLabel: "4 материала",
    bio: "Пишет о том, когда FOX уместен при жалобах на ЖКТ и где тест не заменяет обследование.",
    experience: [{ years: "2015 — н. в.", text: "Гастроэнтеролог" }],
    education: ["Кандидат медицинских наук."],
    topics: ["ЖКТ", "Метод"],
  },
  {
    slug: "redaktsiya-fox",
    name: "Редакция FOX",
    role: "Проверено научным редактором",
    avatar: "/blog/avatar-editorial.png",
    portrait: "/blog/author-editorial.png",
    roles: ["editorial"],
    materialsLabel: "9 материалов",
    bio: "Истории людей и разборы, которые готовит редакция и проверяет научный редактор.",
    experience: [{ years: "2024 — н. в.", text: "Редакция блога FOX Food Xplorer" }],
    education: ["Каждый материал проходит проверку научного редактора перед публикацией."],
    topics: ["Истории", "Отчёт"],
  },
];

const lactoseArticle: Block[] = [
  { type: "h2", id: "otkaz", text: "Почему отказ от молочного не помогает" },
  {
    type: "p",
    text: "Когда человек исключает целую группу продуктов, он одновременно убирает и вероятный триггер, и десятки продуктов, которые организм переносит нормально. Самочувствие может улучшиться — но непонятно, благодаря чему именно. А рацион становится жёстче, чем нужно.",
  },
  {
    type: "p",
    text: "Вторая проблема — время. Отсроченная реакция на продукт может проявиться через 3–72 часа после еды. Связать вчерашний завтрак с сегодняшней тяжестью почти невозможно — поэтому дневник питания так часто не даёт ответа.",
  },
  {
    type: "h2",
    id: "laktoza",
    text: "Лактоза, казеин и сывороточные белки",
  },
  {
    type: "p",
    text: "Молоко — это не один продукт, а набор компонентов, на которые организм реагирует по-разному:",
  },
  {
    type: "list",
    items: [
      "лактозная недостаточность — ферментная, а не иммунная реакция; тест IgG её не измеряет;",
      "казеин и сывороточные белки — отдельные позиции панели FOX;",
      "термообработка по-разному влияет на разные белки — сыр и молоко могут переноситься разно;",
      "поэтому «убрать молочное» — слишком грубое решение.",
    ],
  },
  {
    type: "callout",
    title: "Вывод",
    text: "Лактозная недостаточность и реакция на белки молока — разные механизмы. Поэтому «убрать молочное» — слишком грубое решение: можно потерять продукты, которые организм переносит нормально.",
  },
  {
    type: "figure",
    src: "/blog/cover-report.png",
    caption: "Страница отчёта FOX: молочная группа. Зелёная, жёлтая и красная зоны подписаны уровнем IgG.",
  },
  { type: "h2", id: "glyuten", text: "Глютен и его фракции" },
  {
    type: "p",
    text: "С глютеном похожая история: пшеница, рожь, ячмень и овёс содержат разные белковые фракции. В панели FOX они представлены отдельно, поэтому отчёт показывает не «глютен в целом», а конкретные злаки с уровнем IgG по каждому.",
  },
  {
    type: "table",
    headers: ["Продукт", "Уровень IgG", "Что делать"],
    rows: [
      ["Молоко коровье", "Повышенный", "Исключить на период элиминации"],
      ["Казеин", "Средний", "Ротация, наблюдать реакцию"],
      ["Сывороточный белок", "Низкий", "Оставить в рационе"],
    ],
  },
  {
    type: "quote",
    text: "Отчёт — не список запретов, а карта, с которой мы начинаем работать на приёме",
    by: "Ксения Эллинская, к. м. н.",
  },
  {
    type: "cta",
    title: "Сомневаетесь, подходит ли тест вам?",
    text: "Отметьте свои жалобы — соберём список для разговора со специалистом. 2 минуты, без регистрации, данные не покидают браузер.",
    primary: "Проверить симптомы",
    secondary: "Где сдать тест",
  },
  { type: "h2", id: "chto-pokazyvaet", text: "Что показывает FOX" },
  {
    type: "p",
    text: "Тест измеряет пищеспецифические IgG к 286 антигенам из 13 групп и распределяет результаты по трём зонам: низкий, средний и повышенный уровень. Повышенный уровень — не диагноз и не «запрет навсегда», а повод временно исключить продукт и наблюдать за самочувствием вместе со специалистом.",
  },
  { type: "h2", id: "ratsion", text: "Как строится рацион после теста" },
  {
    type: "p",
    text: "Обычно работа строится в два этапа. Сначала — элиминация: продукты из повышенной зоны убирают на несколько недель, продукты средней зоны ротируют. Затем — возврат по одному с наблюдением за реакцией. Именно так молочное и хлеб перестают быть одним запретом и становятся конкретным списком.",
  },
  { type: "h2", id: "vrach", text: "Когда нужно к врачу" },
  {
    type: "p",
    text: "Если симптомы выраженные, сопровождаются потерей веса, кровью в стуле или появились внезапно — начинать нужно с очного приёма, а не с теста. Статья не заменяет консультацию и не ставит диагноз: результаты FOX интерпретирует врач или нутрициолог.",
  },
];

const featured: Article = {
  slug: "skrytaya-neperenosimost-laktozy-i-glyutena",
  title: "Скрытая непереносимость лактозы и глютена: как FOX помогает разобраться в питании",
  excerpt:
    "После каши на молоке болит живот, а после булочки появляется вздутие. Первая мысль — убрать молочные продукты и хлеб. Разбираем, почему такой подход редко работает и что показывает отчёт.",
  category: "report",
  tags: ["лактоза", "глютен", "IgG"],
  minutes: 9,
  author: "kseniya-ellinskaya",
  cover: "/blog/cover-lactose.png",
  featured: true,
  synonyms: ["лактоза", "молочные продукты", "лактаза", "глютен"],
  blocks: lactoseArticle,
};

const visible: Article[] = [
  {
    slug: "pervye-priznaki-pishchevoy-neperenosimosti",
    title: "Первые признаки пищевой непереносимости — симптомы, которые легко не заметить",
    excerpt: "Хроническая усталость, вздутие после еды, туман в голове — эти симптомы часто списывают на стресс.",
    category: "symptoms",
    tags: ["вздутие", "IgG"],
    minutes: 7,
    author: "alyona-vavilova",
    cover: "/blog/cover-symptoms.jpg",
  },
  {
    slug: "pravilno-pitayus-no-ves-ne-uhodit",
    title: "Правильно питаюсь, но вес не уходит: в чём причина и что с этим делать",
    excerpt: "Считаете калории, едите полезное, но вес стоит? Причина может быть в скрытой реакции на привычные продукты.",
    category: "nutrition",
    tags: ["элиминация"],
    minutes: 6,
    author: "alyona-vavilova",
    cover: "/blog/cover-plate.jpg",
  },
  {
    slug: "neperenosimost-tsitrusovyh",
    title: "Непереносимость цитрусовых: симптомы, причины и как отличить от аллергии",
    excerpt: "Гистамин, фруктоза, IgG-реакция — разбираем механизмы и что из этого показывает тест.",
    category: "science",
    tags: ["IgG"],
    minutes: 8,
    author: "kseniya-ellinskaya",
    cover: "/blog/cover-citrus.jpg",
  },
  {
    slug: "zheltaya-zona-otcheta",
    title: "Как читать жёлтую зону отчёта и в каком порядке возвращать продукты",
    excerpt: "Пошаговый разбор с примерами из отчётов: средний уровень IgG — не запрет, а повод для ротации.",
    category: "report",
    tags: ["IgG", "элиминация"],
    minutes: 10,
    author: "svetlana-kanevskaya",
    cover: "/blog/cover-report.png",
  },
  {
    slug: "istoriya-igorya",
    title: "«Четыре месяца вёл дневник и не продвинулся» — история Игоря",
    excerpt: "Как выглядит работа с рационом изнутри: от дневника питания до отчёта и спокойных обедов.",
    category: "stories",
    tags: ["вздутие"],
    minutes: 5,
    author: "redaktsiya-fox",
    cover: "/blog/cover-story.png",
  },
  {
    slug: "anti-ccd-kontrol",
    title: "Anti-CCD-контроль: зачем он нужен в IgG-тестах",
    excerpt: "Для специалистов: перекрёстные углеводные структуры и интерпретация результатов.",
    category: "specialists",
    tags: ["IgG"],
    minutes: 12,
    author: "dmitry-ellinskiy",
    cover: "/blog/cover-lab.png",
  },
];

type Extra = [Category, string, string, string[], number, string];

const extras: Extra[] = [
  ["symptoms", "Вздутие к вечеру: что успевает съесть человек за день", "Отсроченная реакция проявляется через часы, и дневник без опоры быстро превращается в догадки.", ["вздутие", "лактоза"], 6, "alyona-vavilova"],
  ["symptoms", "Туман в голове после обеда — не всегда недосып", "Разбираем, какие жалобы люди списывают на работу, хотя связь может быть с привычными продуктами.", ["вздутие"], 7, "kseniya-ellinskaya"],
  ["symptoms", "Кожа реагирует не в день, когда вы съели продукт", "Высыпания часто отстают от еды на сутки и дольше. Поэтому «я ничего такого не ел» — слабый аргумент.", ["акне"], 8, "kseniya-ellinskaya"],
  ["symptoms", "Тяжесть после молока: где заканчивается непереносимость лактозы", "Лактозная недостаточность и реакция на белки молока — разные вопросы, и тест IgG отвечает только на второй.", ["лактоза"], 9, "svetlana-kanevskaya"],
  ["symptoms", "Ребёнок отказывается от каши: что обсудить со специалистом", "Материал для родителей: какие жалобы имеет смысл принести на приём и чего тест не покажет.", ["дети", "лактоза"], 6, "alyona-vavilova"],
  ["symptoms", "Усталость к обеду и тарелка, которая её провоцирует", "Не каждый спад сил связан с едой. Разбираем, когда список жалоб стоит собрать до визита.", ["вздутие"], 5, "redaktsiya-fox"],
  ["nutrition", "Элиминация без фанатизма: сколько продуктов убирать сразу", "Повышенная зона — временное исключение. Средняя — ротация. Остальное остаётся в тарелке.", ["элиминация", "лактоза"], 8, "alyona-vavilova"],
  ["nutrition", "Молочные продукты — не один запрет", "Сыр, йогурт и молоко могут переноситься по-разному. Отчёт смотрит на белки, а не на полку целиком.", ["лактоза"], 7, "kseniya-ellinskaya"],
  ["nutrition", "Глютен, пшеница и овёс: зачем их разделять", "В панели это разные позиции. «Без глютена» как универсальный режим здесь не требуется.", ["глютен"], 8, "svetlana-kanevskaya"],
  ["nutrition", "Как вернуть продукт и не перепутать это с «мне можно всё»", "Возврат по одному, с паузой на наблюдение. Иначе снова неясно, что именно отозвалось.", ["элиминация"], 6, "alyona-vavilova"],
  ["nutrition", "Завтрак, после которого хочется спать", "Каша, бутерброд, йогурт — привычный набор, в котором легко потерять конкретный продукт.", ["лактоза", "глютен"], 5, "alyona-vavilova"],
  ["nutrition", "Ротация: что это и зачем она средней зоне", "Средний уровень IgG — не повод вычёркивать продукт навсегда. Это повод менять частоту.", ["элиминация", "IgG"], 7, "svetlana-kanevskaya"],
  ["nutrition", "Что оставить в рационе, если зона низкая", "Низкий уровень — продукт можно не трогать. Рацион и так сужается сильнее, чем нужно.", ["IgG"], 4, "alyona-vavilova"],
  ["nutrition", "Синонимы на кухне: почему поиск «молочка» не равен одному белку", "Кефир, творог и сыворотка — разные позиции панели. Ищем конкретное, а не полку.", ["лактоза"], 6, "redaktsiya-fox"],
  ["report", "Три зоны отчёта: низкий, средний, повышенный", "Цвет зоны подписан уровнем. Так результат читается и без опоры только на красный или зелёный.", ["IgG"], 8, "svetlana-kanevskaya"],
  ["report", "С чего открыть отчёт на первом приёме", "Не с самой длинной страницы. С зон, которые меняют разговор о рационе в ближайшие недели.", ["IgG", "элиминация"], 9, "kseniya-ellinskaya"],
  ["report", "Повышенный IgG — не «запрещено навсегда»", "Формулировка важна: зона временная, решение о рационе принимает специалист вместе с человеком.", ["IgG"], 7, "svetlana-kanevskaya"],
  ["report", "Как не прочитать отчёт как приговор продуктам", "Список из 286 строк пугает, пока не разделён на три уровня и 13 групп.", ["IgG"], 6, "redaktsiya-fox"],
  ["report", "Пример страницы: молочная группа", "Казеин, молоко, сыворотка стоят отдельно. Это и есть ответ на «убрать всё молочное».", ["лактоза", "IgG"], 10, "kseniya-ellinskaya"],
  ["report", "Что в отчёте есть, а чего в нём нет", "Нет диагноза, нет аллергии IgE, нет цены и нет назначения «не есть это всю жизнь».", ["IgG"], 8, "svetlana-kanevskaya"],
  ["science", "IgG и IgE: два разных вопроса к одной тарелке", "Аллергия отвечает быстро. Реакции, которые смотрит FOX, могут запаздывать на часы и дни.", ["IgG"], 9, "svetlana-kanevskaya"],
  ["science", "Почему дневник питания буксует на третьей неделе", "К моменту реакции обед позавчерашнего дня уже не вспомнить. Отчёт даёт точку отсчёта.", ["вздутие"], 7, "alyona-vavilova"],
  ["science", "ELISA простыми словами", "Иммуноферментный анализ — обычная лабораторная процедура, не домашний тест и не опросник.", ["IgG"], 8, "svetlana-kanevskaya"],
  ["science", "13 групп продуктов и зачем панели быть широкой", "Узкий список часто подтверждает то, что человек и так подозревал. Широкий — показывает остальное.", ["IgG"], 6, "kseniya-ellinskaya"],
  ["science", "Лактаза: фермент, который IgG-тест не измеряет", "Если стул и вздутие связаны с молочным сахаром, это другой механизм. Его ищут другими методами.", ["лактоза"], 7, "svetlana-kanevskaya"],
  ["science", "Откуда берётся цифра 7–10 дней", "Сам анализ занимает около трёх часов. Срок, который видит человек, включает логистику лаборатории.", ["IgG"], 5, "redaktsiya-fox"],
  ["science", "Что такое anti-CCD и почему он в отчёте", "Перекрёстные углеводные детерминанты могут шуметь в IgG. Контроль помогает не принять шум за сигнал.", ["IgG"], 11, "svetlana-kanevskaya"],
  ["stories", "Екатерина убирала молочку, потом глютен, потом всё сразу", "Каждый раз наугад. Отчёт дал список, в котором два продукта она бы не заподозрила.", ["лактоза", "глютен"], 6, "redaktsiya-fox"],
  ["stories", "Как Игорь перестал планировать день вокруг желудка", "Четыре месяца дневника не сдвинули дело. Три продукта и возврат по одному — сдвинули.", ["вздутие", "элиминация"], 7, "redaktsiya-fox"],
  ["stories", "«Я ем полезное» — и всё равно тяжесть после обеда", "Полезное тоже может быть конкретным продуктом из повышенной зоны.", ["элиминация"], 5, "alyona-vavilova"],
  ["stories", "История мамы, которая искала причину сыпи у ребёнка", "Тест не заменяет педиатра. Он может стать списком для разговора, если врач считает это уместным.", ["дети", "акне"], 8, "kseniya-ellinskaya"],
  ["stories", "Два месяца без угадывания: что изменилось в закупках", "Не «без молочного». Без двух позиций и с ротацией третьей.", ["лактоза"], 6, "redaktsiya-fox"],
  ["stories", "Специалист о приёме, на который пациент принёс отчёт", "Разговор начинается со структуры, а не со списка запретов, который человек составил сам.", ["IgG"], 7, "kseniya-ellinskaya"],
  ["stories", "Что люди пишут через два месяца — и чего мы не обещаем", "В историях нет излечения и диагнозов. Есть наблюдение за самочувствием после изменений рациона.", ["элиминация"], 5, "redaktsiya-fox"],
  ["specialists", "Как открыть отчёт на приёме за первые десять минут", "Зоны, группы, anti-CCD. Дальше — вопросы человека, а не лекция о методе.", ["IgG"], 9, "svetlana-kanevskaya"],
  ["specialists", "Где FOX дополняет гастроэнтеролога, а где нет", "Тест не ищет органическую патологию. Он про пищеспецифические IgG и разговор о рационе.", ["IgG"], 10, "svetlana-kanevskaya"],
  ["specialists", "Дерматологу: кожа, рацион и границы метода", "Акне и розацеа не «лечатся списком продуктов». Список может сузить разговор о триггерах.", ["акне", "IgG"], 8, "kseniya-ellinskaya"],
  ["specialists", "Как говорить о жёлтой зоне, не назначая запрет", "Ротация и наблюдение. Формулировки «вредно» и «навсегда» в этом разговоре не нужны.", ["IgG", "элиминация"], 7, "alyona-vavilova"],
  ["specialists", "Курс FOX: что в уроке про чтение отчёта", "Шесть уроков, сертификат, без баллов НМО. Урок про отчёт — общий для разных специальностей.", ["IgG"], 6, "kseniya-ellinskaya"],
  ["specialists", "Направить пациента: что сказать про цену и срок", "Цену называет лаборатория. Срок — 7–10 дней. Подготовки и голодания перед сдачей нет.", ["IgG"], 5, "redaktsiya-fox"],
  ["specialists", "Чего нельзя обещать по результату IgG", "Ни диагноза, ни отмены аллергообследования, ни «этот продукт вам вреден».", ["IgG"], 8, "svetlana-kanevskaya"],
];

const covers = [
  "/blog/cover-symptoms.jpg",
  "/blog/cover-plate.jpg",
  "/blog/cover-citrus.jpg",
  "/blog/cover-report.png",
  "/blog/cover-lab.png",
  "/blog/featured-bg.png",
];

function slugify(title: string, index: number) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const base = title
    .toLowerCase()
    .replace(/[«»"—–]/g, "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${base}-${index}`;
}

const generated: Article[] = extras.map((row, i) => ({
  slug: slugify(row[1], i + 1),
  title: row[1],
  excerpt: row[2],
  category: row[0],
  tags: row[3],
  minutes: row[4],
  author: row[5],
  cover: covers[i % covers.length],
  synonyms: row[3].includes("лактоза") ? ["молочные продукты", "лактоза"] : undefined,
}));

export const articles: Article[] = [featured, ...visible];

export function authorBySlug(slug: string) {
  return authors.find((a) => a.slug === slug);
}

export function articleBySlug(slug: string) {
  return articles.find((a) => a.slug === slug);
}

export function categoryLabel(id: Category) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function materialsWord(n: number) {
  const m = n % 100;
  if (m >= 11 && m <= 14) return "материалов";
  const k = n % 10;
  if (k === 1) return "материал";
  if (k >= 2 && k <= 4) return "материала";
  return "материалов";
}

export function articlesByAuthor(slug: string) {
  return articles.filter((a) => a.author === slug && !a.featured);
}

export const toc = [
  { id: "otkaz", text: "Почему отказ от молочного не помогает" },
  { id: "laktoza", text: "Лактоза, казеин и сывороточные белки" },
  { id: "glyuten", text: "Глютен и его фракции" },
  { id: "chto-pokazyvaet", text: "Что показывает FOX" },
  { id: "ratsion", text: "Как строится рацион после теста" },
  { id: "vrach", text: "Когда нужно к врачу" },
];

export const DISCLAIMER =
  "Материал носит информационный характер и не является медицинской рекомендацией. FOX — лабораторный тест для поддержки персонализированных диетических вмешательств; не тест на аллергию (IgE), не устанавливает диагноз и не заменяет консультацию специалиста.";

export function searchTopics(query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  const topics = [
    {
      label: "лактозная недостаточность",
      hint: "",
      match: (value: string) => value.startsWith("лак") || value.includes("лактоз"),
      test: (a: Article) => /лактоз/i.test(a.title),
    },
    {
      label: "лактаза",
      hint: "фермент",
      match: (value: string) => value.startsWith("лак") || value.includes("лактаз"),
      test: (a: Article) => /лактаз/i.test(`${a.title} ${a.excerpt}`),
    },
    {
      label: "молочные продукты",
      hint: "синоним",
      match: (value: string) => value.startsWith("лак") || value.includes("молоч") || value.includes("лактоз"),
      test: (a: Article) => a.tags.includes("лактоза") || (a.synonyms ?? []).includes("молочные продукты"),
    },
    {
      label: "глютен",
      hint: "",
      match: (value: string) => value.startsWith("глю") || value.includes("глют"),
      test: (a: Article) => a.tags.includes("глютен"),
    },
  ];
  return topics
    .filter((t) => t.match(q))
    .map((t) => ({ label: t.label, hint: t.hint, count: articles.filter(t.test).length }));
}

export function matchesQuery(article: Article, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const hay = `${article.title} ${article.excerpt} ${article.tags.join(" ")} ${(article.synonyms ?? []).join(" ")}`.toLowerCase();
  if (!words.length) return hay.includes(q);
  return words.every((w) => hay.includes(w));
}
