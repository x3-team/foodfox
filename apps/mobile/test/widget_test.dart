import "package:flutter_test/flutter_test.dart";

import "package:foodfox/app.dart";
import "package:foodfox/widgets/ui/fox_wordmark.dart";

void main() {
  testWidgets("FoodFox app smoke test", (tester) async {
    await tester.pumpWidget(const FoodFoxApp());
    await tester.pump();

    // The app opens on the splash, which is the only screen guaranteed to be
    // reachable without a session or a backend.
    expect(find.byType(FoxWordmark), findsOneWidget);
  });
}
