import "package:flutter_test/flutter_test.dart";
import "package:shared_preferences/shared_preferences.dart";

import "package:foodfox/app.dart";
import "package:foodfox/widgets/ui/fox_wordmark.dart";

void main() {
  testWidgets("FoodFox app smoke test", (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const FoodFoxApp());
    await tester.pump();

    // The app opens on the splash, which is the only screen guaranteed to be
    // reachable without a session or a backend.
    expect(find.byType(FoxWordmark), findsOneWidget);
  });

  testWidgets("finished splash opens onboarding instead of staying there", (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const FoodFoxApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 4300));
    await tester.pump();

    expect(find.text("Войти по номеру телефона"), findsOneWidget);

    // Let the onboarding entrance timers fire before the tree is disposed.
    await tester.pump(const Duration(milliseconds: 900));
  });
}
