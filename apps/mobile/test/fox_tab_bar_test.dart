import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";
import "package:foodfox/widgets/ui/fox_tab_bar.dart";

void main() {
  testWidgets("tab bar lifts its labels above the Android navigation bar", (
    tester,
  ) async {
    const inset = 48.0;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) {
            return MediaQuery(
              data: MediaQuery.of(context).copyWith(
                padding: const EdgeInsets.only(bottom: inset),
              ),
              child: Scaffold(
                bottomNavigationBar: FoxTabBar(
                  index: 0,
                  onSelect: _noop,
                  tabs: [
                    FoxTab(kind: FoxIconKind.report, label: "Отчёт"),
                    FoxTab(kind: FoxIconKind.plan, label: "План"),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );

    final bar = tester.widget<Container>(find.byKey(const Key("fox-tab-bar")));
    final padding = bar.padding! as EdgeInsets;
    expect(padding.bottom, 14 + inset);
    expect(find.text("Отчёт"), findsOneWidget);
  });

  testWidgets("tab bar keeps its own padding when there is no system inset", (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: FoxTabBar(
            index: 0,
            onSelect: _noop,
            tabs: [FoxTab(kind: FoxIconKind.chat, label: "Чат")],
          ),
        ),
      ),
    );

    final bar = tester.widget<Container>(find.byKey(const Key("fox-tab-bar")));
    expect((bar.padding! as EdgeInsets).bottom, 14);
  });
}

void _noop(int _) {}
