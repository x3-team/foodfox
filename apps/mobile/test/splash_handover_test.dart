import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";

import "package:foodfox/screens/splash_screen.dart";
import "package:foodfox/widgets/ui/fox_wordmark.dart";

void main() {
  testWidgets("the wordmark travels to the corner instead of jumping", (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(MaterialApp(home: SplashScreen(onFinished: () {})));
    // The controller starts from a post-frame callback.
    await tester.pump();

    // Track the centre of the lockup: the block is wide while enlarged, so its
    // left edge barely moves even though the mark itself crosses the screen.
    final samples = <int, Offset>{};
    var elapsed = 0;
    for (final ms in [2700, 2900, 3100, 3300, 3500, 3700, 3900, 4000, 4200]) {
      await tester.pump(Duration(milliseconds: ms - elapsed));
      elapsed = ms;
      samples[ms] = tester.getRect(find.byType(FoxWordmark)).center;
    }

    debugPrint("wordmark path: $samples");

    final path = samples.values.toList();
    final start = path.first;
    final end = path.last;
    final docked = tester.getTopLeft(find.byType(FoxWordmark));

    // It ends docked where the onboarding screen keeps it.
    expect(docked.dx, closeTo(FoxWordmark.inset, 1.5));
    expect(docked.dy, closeTo(FoxWordmark.topGap, 1.5));

    // It starts in the middle of the screen, far from that corner.
    expect((start - end).distance, greaterThan(250));

    // Never doubles back on its way there.
    for (var i = 1; i < path.length; i++) {
      expect(
        (path[i] - end).distance,
        lessThanOrEqualTo((path[i - 1] - end).distance + 0.5),
        reason: "sample $i moved away from the corner",
      );
    }

    // At least four samples sit clearly between the two endpoints. A cut from
    // one position to the other could not produce any.
    final travelling = path
        .where((p) => (p - start).distance > 35 && (p - end).distance > 35)
        .length;
    expect(travelling, greaterThanOrEqualTo(4));
  });
}
