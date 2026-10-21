import "dart:convert";

import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:http/http.dart" as http;
import "package:http/testing.dart";
import "package:shared_preferences/shared_preferences.dart";

import "package:foodfox/screens/plan_screen.dart";
import "package:foodfox/screens/report_processing_screen.dart";
import "package:foodfox/screens/results_screen.dart";
import "package:foodfox/services/auth_store.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/widgets/no_report_state.dart";

/// A brand new account: the server has no report, no plan, no recipes.
FoodFoxApi _newAccountApi() => FoodFoxApi(
  client: MockClient((request) async {
    final body = switch (request.url.path) {
      "/api/results" => {
        "results": <Object>[],
        "counts": {"green": 0, "yellow": 0, "red": 0},
      },
      "/api/plan" => {"plan": null, "weekTabs": <Object>[], "currentWeek": 1},
      _ => <String, Object>{},
    };
    return http.Response(
      jsonEncode(body),
      200,
      headers: {"content-type": "application/json; charset=utf-8"},
    );
  }),
)..setAccessToken("token");

Widget _host(Widget child) =>
    MaterialApp(home: Scaffold(body: SizedBox.expand(child: child)));

void main() {
  testWidgets("a new account sees S3 and its button opens the upload", (
    tester,
  ) async {
    var uploads = 0;
    await tester.pumpWidget(
      _host(ResultsScreen(api: _newAccountApi(), onUpload: () => uploads++)),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NoReportState), findsOneWidget);
    expect(find.text("Мои результаты"), findsNothing);

    await tester.tap(find.text("Загрузить отчёт FOX"));
    expect(uploads, 1);
  });

  testWidgets("the plan tab shows the same empty state without a report", (
    tester,
  ) async {
    var uploads = 0;
    await tester.pumpWidget(
      _host(PlanScreen(api: _newAccountApi(), onUpload: () => uploads++)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text("Загрузить отчёт FOX"));
    expect(uploads, 1);
  });

  testWidgets("«Где сдать тест?» opens a sheet that hands over to the chat", (
    tester,
  ) async {
    String? asked;
    await tester.pumpWidget(
      _host(NoReportState(onUpload: () {}, onAsk: (q) => asked = q)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text("Где сдать тест?"));
    await tester.pumpAndSettle();
    expect(find.text("Где сдать тест"), findsOneWidget);

    await tester.tap(find.text("Спросить в чате"));
    await tester.pumpAndSettle();
    expect(asked, contains("Где сдать тест"));
  });

  testWidgets("processing finishes at 100% and then opens the results", (
    tester,
  ) async {
    var done = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: ReportProcessingScreen(
          fileName: "FOX.pdf",
          sizeBytes: 1258291,
          work: () async {
            await Future<void>.delayed(const Duration(seconds: 3));
            return const UploadOutcome(parsedCount: 285, confidence: "high");
          },
          onDone: () => done++,
          onPickAnother: () {},
        ),
      ),
    );
    expect(find.text("Распознаём ваш отчёт"), findsOneWidget);
    expect(find.text("FOX.pdf · 1,2 МБ"), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 700));
    expect(find.text("100%"), findsOneWidget);
    expect(find.text("285 из 285 антигенов"), findsOneWidget);
    expect(done, 0);

    await tester.pump(const Duration(milliseconds: 500));
    expect(done, 1);
  });

  testWidgets("a report the server cannot read lands on S1", (tester) async {
    var again = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: ReportProcessingScreen(
          fileName: "scan.pdf",
          sizeBytes: 2048,
          work: () async => throw Exception(
            "Не удалось извлечь текст из PDF. "
            "Убедитесь, что это отчёт FOX Food Xplorer.",
          ),
          onDone: () {},
          onPickAnother: () => again++,
          onSupport: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("Распознали не всё"), findsOneWidget);
    expect(find.text("Написать в поддержку"), findsOneWidget);
    await tester.tap(find.text("Загрузить другой файл"));
    expect(again, 1);
  });

  testWidgets("a dropped connection offers a retry instead of S1", (
    tester,
  ) async {
    var attempts = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: ReportProcessingScreen(
          fileName: "FOX.pdf",
          sizeBytes: 2048,
          work: () async {
            attempts++;
            throw Exception("Нет связи с сервером. Проверьте интернет.");
          },
          onDone: () {},
          onPickAnother: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("Файл не загрузился"), findsOneWidget);
    await tester.tap(find.text("Повторить"));
    await tester.pumpAndSettle();
    expect(attempts, 2);
  });

  test("signing out forgets the demo session", () async {
    SharedPreferences.setMockInitialValues({});
    final store = AuthStore();
    await store.saveSession(accessToken: "demo", demo: true);
    expect(await store.isDemoSession, isTrue);

    await store.clear();
    expect(await store.isDemoSession, isFalse);
  });
}
