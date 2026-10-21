/// Symptom diary (screen 14). Mirrors apps/web/src/lib/diary.ts.
library;

enum Wellbeing {
  bad("bad", "Плохо"),
  soSo("so_so", "Так себе"),
  good("good", "Хорошо");

  const Wellbeing(this.wire, this.label);

  final String wire;
  final String label;

  static Wellbeing fromWire(String? value) => Wellbeing.values.firstWhere(
    (w) => w.wire == value,
    orElse: () => Wellbeing.soSo,
  );
}

/// The five symptoms of the Figma screen, in its order.
enum Symptom {
  bloating("bloating", "Вздутие"),
  skin("skin", "Кожа"),
  energy("energy", "Энергия"),
  sleep("sleep", "Сон"),
  gut("gut", "ЖКТ");

  const Symptom(this.wire, this.label);

  final String wire;
  final String label;

  static Symptom? fromWire(String value) {
    for (final s in Symptom.values) {
      if (s.wire == value) return s;
    }
    return null;
  }
}

class DiaryFood {
  const DiaryFood({required this.name, this.zone});

  factory DiaryFood.fromJson(Map<String, dynamic> json) =>
      DiaryFood(name: json["name"] as String, zone: json["zone"] as String?);

  final String name;

  /// `green`, `yellow` or `red` from the client's own report; null when the
  /// food is not in it.
  final String? zone;
}

class DiaryEntry {
  const DiaryEntry({
    required this.date,
    required this.wellbeing,
    this.symptoms = const [],
    this.note,
    this.foods = const [],
    this.weekNumber,
    this.phase,
  });

  factory DiaryEntry.fromJson(Map<String, dynamic> json) => DiaryEntry(
    date: json["date"] as String,
    wellbeing: Wellbeing.fromWire(json["wellbeing"] as String?),
    symptoms: [
      for (final s in json["symptoms"] as List<dynamic>? ?? const [])
        ?Symptom.fromWire(s as String),
    ],
    note: json["note"] as String?,
    foods: [
      for (final f in json["foods"] as List<dynamic>? ?? const [])
        DiaryFood.fromJson(f as Map<String, dynamic>),
    ],
    weekNumber: json["weekNumber"] as int?,
    phase: json["phase"] as String?,
  );

  /// The client's local day, `YYYY-MM-DD`.
  final String date;
  final Wellbeing wellbeing;
  final List<Symptom> symptoms;
  final String? note;
  final List<DiaryFood> foods;
  final int? weekNumber;
  final String? phase;

  List<DiaryFood> get redFoods => foods.where((f) => f.zone == "red").toList();

  /// Right-hand line of a history row: «без симптомов» or «вздутие, сон».
  String get symptomsSummary => symptoms.isEmpty
      ? "без симптомов"
      : symptoms
            .map((s) => s == Symptom.gut ? s.label : s.label.toLowerCase())
            .join(", ");
}

/// What the app sends to save a day.
class DiaryDraft {
  const DiaryDraft({
    required this.date,
    required this.wellbeing,
    this.symptoms = const {},
    this.note = "",
    this.foods = const [],
  });

  final String date;
  final Wellbeing wellbeing;
  final Set<Symptom> symptoms;
  final String note;
  final List<String> foods;

  Map<String, dynamic> toJson() => {
    "date": date,
    "wellbeing": wellbeing.wire,
    // Server order, whatever order they were tapped in.
    "symptoms": [
      for (final s in Symptom.values)
        if (symptoms.contains(s)) s.wire,
    ],
    "note": note.trim().isEmpty ? null : note.trim(),
    "foods": foods,
  };
}

class DiaryContext {
  const DiaryContext({
    required this.today,
    this.hasPlan = false,
    this.weekNumber,
    this.phase,
    this.planStartedAt,
    this.foodSuggestions = const [],
    this.editWindowDays = 30,
  });

  factory DiaryContext.fromJson(Map<String, dynamic> json) => DiaryContext(
    today: json["today"] as String,
    hasPlan: json["hasPlan"] as bool? ?? false,
    weekNumber: json["weekNumber"] as int?,
    phase: json["phase"] as String?,
    planStartedAt: json["planStartedAt"] as String?,
    foodSuggestions: [
      for (final f in json["foodSuggestions"] as List<dynamic>? ?? const [])
        f as String,
    ],
    editWindowDays: json["editWindowDays"] as int? ?? 30,
  );

  /// The server's UTC day; the app uses its own local date for entries.
  final String today;
  final bool hasPlan;
  final int? weekNumber;
  final String? phase;
  final String? planStartedAt;
  final List<String> foodSuggestions;
  final int editWindowDays;
}

class DiaryData {
  const DiaryData({required this.context, required this.entries});

  factory DiaryData.fromJson(Map<String, dynamic> json) => DiaryData(
    context: DiaryContext.fromJson(json["context"] as Map<String, dynamic>),
    entries: [
      for (final e in json["entries"] as List<dynamic>? ?? const [])
        DiaryEntry.fromJson(e as Map<String, dynamic>),
    ],
  );

  final DiaryContext context;

  /// Newest first.
  final List<DiaryEntry> entries;

  DiaryEntry? entryOn(String date) {
    for (final e in entries) {
      if (e.date == date) return e;
    }
    return null;
  }
}

/// `YYYY-MM-DD` of a local calendar day.
String diaryDayKey(DateTime d) =>
    "${d.year.toString().padLeft(4, '0')}-"
    "${d.month.toString().padLeft(2, '0')}-"
    "${d.day.toString().padLeft(2, '0')}";

DateTime diaryParseDay(String key) {
  final parts = key.split("-").map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

const _monthsShort = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

const _monthsGenitive = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const diaryMonthsNominative = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/// «21 сен», as in the Figma history rows.
String diaryShortDate(String key) {
  final d = diaryParseDay(key);
  return "${d.day} ${_monthsShort[d.month - 1]}";
}

/// «21 сентября».
String diaryLongDate(String key) {
  final d = diaryParseDay(key);
  return "${d.day} ${_monthsGenitive[d.month - 1]}";
}
