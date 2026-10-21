import "dart:convert";

import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:http/http.dart" as http;
import "package:http/testing.dart";

import "package:foodfox/models/diary.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/screens/chat_screen.dart";
import "package:foodfox/screens/diary_screen.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/services/telemetry.dart";

final _now = DateTime(2026, 10, 21, 12);

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {"content-type": "application/json; charset=utf-8"},
);

/// A client in week 2 of the plan with one entry from yesterday.
class _FakeServer {
  final requests = <http.Request>[];

  late final api = FoodFoxApi(
    client: MockClient((request) async {
      requests.add(request);
      if (request.url.path == "/api/diary" && request.method == "GET") {
        return _json({
          "context": {
            "today": "2026-10-21",
            "hasPlan": true,
            "weekNumber": 2,
            "phase": "Элиминация",
            "planStartedAt": "2026-10-12",
            "foodSuggestions": ["Гречка", "Кабачок"],
            "editWindowDays": 30,
          },
          "entries": [
            {
              "date": "2026-10-20",
              "wellbeing": "so_so",
              "symptoms": ["bloating"],
              "note": "вздутие вечером",
              "foods": <Object>[],
              "weekNumber": 2,
              "phase": "Элиминация",
              "updatedAt": "2026-10-20T19:00:00Z",
            },
          ],
        });
      }
      if (request.url.path == "/api/diary" && request.method == "PUT") {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        return _json({
          "entry": {
            ...body,
            "foods": [
              for (final f in body["foods"] as List<dynamic>)
                {"name": f, "zone": f == "Молоко коровье" ? "red" : "green"},
            ],
            "weekNumber": 2,
            "phase": "Элиминация",
            "updatedAt": "2026-10-21T09:00:00Z",
          },
        });
      }
      if (request.url.path == "/api/diary" && request.method == "DELETE") {
        return _json({"deleted": true});
      }
      return _json(<String, Object>{});
    }),
  )..setAccessToken("token");
}

Future<void> _pumpDiary(WidgetTester tester, _FakeServer server) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      home: DiaryScreen(api: server.api, clock: () => _now),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group("models", () {
    test("an entry parses and summarises like the Figma row", () {
      final e = DiaryEntry.fromJson({
        "date": "2026-09-20",
        "wellbeing": "so_so",
        "symptoms": ["bloating", "gut", "unknown"],
        "foods": [
          {"name": "Молоко коровье", "zone": "red"},
          {"name": "Своё", "zone": null},
        ],
      });
      expect(e.wellbeing, Wellbeing.soSo);
      expect(e.symptoms, [Symptom.bloating, Symptom.gut]);
      expect(e.symptomsSummary, "вздутие, ЖКТ");
      expect(e.redFoods.map((f) => f.name), ["Молоко коровье"]);
      expect(diaryShortDate(e.date), "20 сен");
      expect(
        DiaryEntry.fromJson({"date": "2026-09-21", "wellbeing": "good"})
            .symptomsSummary,
        "без симптомов",
      );
    });

    test("a draft sends symptoms in server order and drops an empty note", () {
      final json = const DiaryDraft(
        date: "2026-10-21",
        wellbeing: Wellbeing.bad,
        symptoms: {Symptom.sleep, Symptom.bloating},
        note: "   ",
      ).toJson();
      expect(json["wellbeing"], "bad");
      expect(json["symptoms"], ["bloating", "sleep"]);
      expect(json["note"], isNull);
      expect(json["foods"], isEmpty);
    });

    test("the diary nudge is a reminder of its own kind", () {
      final m = ChatMessage(
        id: "1",
        role: "assistant",
        messageType: "diary_reminder",
        content: "Как вы сегодня?",
      );
      expect(m.isReminder, isTrue);
      expect(m.isDiaryReminder, isTrue);
    });
  });

  testWidgets("screen 14 shows the Figma content and the plan week", (
    tester,
  ) async {
    await _pumpDiary(tester, _FakeServer());

    expect(find.text("Дневник"), findsOneWidget);
    expect(
      find.text("Отмечайте самочувствие — нутрициолог видит динамику"),
      findsOneWidget,
    );
    expect(find.text("Неделя 2 · Элиминация"), findsOneWidget);
    expect(find.text("Как сегодня самочувствие?"), findsOneWidget);
    for (final label in ["Плохо", "Хорошо", "Вздутие", "Кожа", "Энергия"]) {
      expect(find.text(label), findsOneWidget, reason: label);
    }
    expect(find.text("Сон"), findsOneWidget);
    expect(find.text("ЖКТ"), findsOneWidget);
    expect(find.text("Последние записи"), findsOneWidget);
    expect(find.text("20 окт"), findsOneWidget);
    expect(find.text("вздутие"), findsOneWidget);
    expect(find.text("Самочувствие по фазам плана"), findsOneWidget);
  });

  testWidgets(
    "saving sends the entry, shows the red-zone hint, and analytics get "
    "only the fact",
    (tester) async {
      final server = _FakeServer();
      final events = <(String, Map<String, Object>)>[];
      Telemetry.debugSink = (name, params) => events.add((name, params));
      addTearDown(() => Telemetry.debugSink = null);

      await _pumpDiary(tester, server);

      final save = find.widgetWithText(GestureDetector, "Сохранить запись");
      await tester.tap(save.first);
      await tester.pump();
      expect(
        server.requests.where((r) => r.method == "PUT"),
        isEmpty,
        reason: "nothing to save until wellbeing is chosen",
      );

      await tester.tap(find.text("Хорошо"));
      await tester.tap(find.text("Сон"));
      await tester.tap(find.text("Что ели"));
      await tester.pumpAndSettle();
      await tester.tap(find.text("Гречка"));
      await tester.enterText(
        find.widgetWithText(TextField, "Добавить продукт"),
        "Молоко коровье",
      );
      await tester.tap(find.byIcon(Icons.add_rounded).last);
      await tester.pumpAndSettle();

      await tester.tap(find.text("Сохранить запись"));
      await tester.pumpAndSettle();

      final put = server.requests.singleWhere((r) => r.method == "PUT");
      expect(jsonDecode(put.body), {
        "date": "2026-10-21",
        "wellbeing": "good",
        "symptoms": ["sleep"],
        "note": null,
        "foods": ["Гречка", "Молоко коровье"],
      });

      expect(
        find.textContaining("в красной зоне по вашему отчёту"),
        findsOneWidget,
      );
      expect(find.text("21 окт"), findsOneWidget, reason: "joins the history");

      expect(events, hasLength(1));
      expect(events.single.$1, "diary_entry_saved");
      expect(events.single.$2, {"from": "profile"});

      // The tick gives way to «Обновить запись».
      await tester.pump(const Duration(seconds: 2));
      expect(find.text("Обновить запись"), findsOneWidget);
    },
  );

  testWidgets("the calendar opens a day, and the entry can be deleted", (
    tester,
  ) async {
    final server = _FakeServer();
    await _pumpDiary(tester, server);

    await tester.tap(find.text("Календарь"));
    await tester.pumpAndSettle();
    expect(find.text("Октябрь 2026"), findsOneWidget);

    await tester.tap(find.bySemanticsLabel("20 октября, Так себе"));
    await tester.pumpAndSettle();
    expect(find.text("20 октября"), findsOneWidget);
    expect(find.text("вздутие вечером"), findsOneWidget);

    await tester.tap(find.text("Удалить запись"));
    await tester.pumpAndSettle();
    await tester.tap(find.text("Удалить"));
    await tester.pumpAndSettle();

    final delete = server.requests.singleWhere((r) => r.method == "DELETE");
    expect(delete.url.queryParameters["date"], "2026-10-20");
    expect(find.bySemanticsLabel("20 октября, Так себе"), findsNothing);
  });

  testWidgets("an empty past day in the calendar opens the form for it", (
    tester,
  ) async {
    await _pumpDiary(tester, _FakeServer());

    await tester.tap(find.text("Календарь"));
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel("15 октября"));
    await tester.pumpAndSettle();

    expect(find.text("Как было самочувствие?"), findsOneWidget);
  });

  testWidgets("the assistant's diary nudge opens the diary", (tester) async {
    var opened = 0;
    final api = FoodFoxApi(
      client: MockClient((request) async {
        if (request.url.path == "/api/chat/messages") {
          return _json({
            "messages": [
              {
                "id": "r1",
                "role": "assistant",
                "messageType": "diary_reminder",
                "content": "Как вы сегодня? Отметьте самочувствие в дневнике.",
              },
            ],
          });
        }
        return _json({"ok": true});
      }),
    )..setAccessToken("token");

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ChatScreen(api: api, onOpenDiary: () => opened++),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text("Открыть дневник"));
    expect(opened, 1);
  });
}
