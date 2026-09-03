import "package:flutter_test/flutter_test.dart";
import "package:foodfox/app.dart";

void main() {
  testWidgets("FoodFox app smoke test", (tester) async {
    await tester.pumpWidget(const FoodFoxApp());
    expect(find.text("Загрузка отчёта"), findsOneWidget);
  });
}
