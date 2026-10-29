import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";

import "package:foodfox/widgets/ui/fox_keyboard.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

Widget _app({GlobalKey<NavigatorState>? navigator}) => MaterialApp(
  navigatorKey: navigator,
  navigatorObservers: [FoxUnfocusOnNavigate()],
  builder: (context, child) => FoxKeyboardDismiss(child: child!),
  home: Scaffold(
    body: ListView(
      children: [
        const FoxInput(label: "Имя"),
        for (var i = 0; i < 40; i++)
          SizedBox(height: 60, child: Text("строка $i")),
      ],
    ),
  ),
);

bool _hasFocus(WidgetTester tester) => tester
    .widget<EditableText>(find.byType(EditableText, skipOffstage: false))
    .focusNode
    .hasFocus;

void main() {
  testWidgets("a tap outside the field hides the keyboard", (tester) async {
    await tester.pumpWidget(_app());
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(_hasFocus(tester), isTrue);

    await tester.tap(find.text("строка 3"));
    await tester.pump();
    expect(_hasFocus(tester), isFalse);
  });

  testWidgets("dragging a list hides the keyboard", (tester) async {
    await tester.pumpWidget(_app());
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(_hasFocus(tester), isTrue);

    await tester.drag(find.text("строка 3"), const Offset(0, -200));
    await tester.pump();
    expect(_hasFocus(tester), isFalse);
  });

  testWidgets("leaving the screen hides the keyboard", (tester) async {
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(_app(navigator: navigator));
    await tester.tap(find.byType(TextField));
    await tester.pump();
    expect(_hasFocus(tester), isTrue);

    navigator.currentState!.push(
      MaterialPageRoute<void>(builder: (_) => const Scaffold()),
    );
    await tester.pumpAndSettle();
    expect(_hasFocus(tester), isFalse);
  });
}
