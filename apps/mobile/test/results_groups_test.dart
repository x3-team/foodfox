import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:foodfox/config/api_config.dart";
import "package:foodfox/screens/results_screen.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";

void main() {
  testWidgets("results open as category groups, not the full antigen list", (
    tester,
  ) async {
    final api = FoodFoxApi();
    await tester.runAsync(() => api.startDemoSession());
    tester.view.physicalSize = const Size(400, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildFoxTheme(),
        home: Scaffold(body: ResultsScreen(api: api)),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text("Овощи"), findsWidgets);
    expect(find.text("Молоко и яйцо"), findsWidgets);
    expect(find.text("Коровье молоко"), findsNothing);
    expect(find.text("Красная зона · элиминация"), findsNothing);

    await tester.tap(find.text("Молоко и яйцо").last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text("Коровье молоко"), findsOneWidget);
    expect(find.textContaining("Молоко и яйцо"), findsWidgets);
  }, skip: !ApiConfig.hasDemoCredentials);
}
