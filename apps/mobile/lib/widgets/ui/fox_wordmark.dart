import "dart:ui" show lerpDouble;

import "package:flutter/material.dart";

import "package:foodfox/theme/fox_tokens.dart";

/// The FOX lockup, shared by the splash and the onboarding screen.
///
/// Figma has two states of it: centred inside the zone ring on the splash
/// (SP3–SP4, FOX 40 px) and docked top-left on screen 01 (SP5, FOX 26 px,
/// left-aligned). [dock] walks between them, so the splash can carry the very
/// widget the onboarding screen renders and the handover lands on identical
/// pixels instead of a swap.
class FoxWordmark extends StatelessWidget {
  const FoxWordmark({super.key, this.dock = 1});

  /// 0 → centred splash lockup, 1 → docked corner lockup.
  final double dock;

  /// Distance from the left edge once the lockup has settled in the corner.
  static const inset = 24.0;

  /// Distance below the status bar once the lockup has settled. Puts the FOX
  /// caps where Figma SP5 / screen 01 has them (26 px under a 47 px bar).
  static const topGap = 22.0;

  @override
  Widget build(BuildContext context) {
    final t = dock.clamp(0.0, 1.0);
    double l(double centred, double docked) => lerpDouble(centred, docked, t)!;

    final foxTracking = l(2, 1);
    final subTracking = l(2.4, 1.6);
    final align = Alignment.lerp(Alignment.center, Alignment.centerLeft, t)!;

    // Inside the ring both lines share the ring's vertical axis, as in Figma.
    // Kept left-aligned there, FOX sat off-centre above the wider subline.
    Widget line(String text, TextStyle style) => Align(
      alignment: align,
      child: Text(text, style: style, maxLines: 1, softWrap: false),
    );

    return IntrinsicWidth(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          line(
            "FOX",
            FoxType.h4.copyWith(
              color: FoxTokens.textInverted,
              fontSize: l(40, 26),
              height: 1,
              letterSpacing: foxTracking,
              fontWeight: FontWeight.w800,
              fontVariations: const [FontVariation("wght", 800)],
            ),
          ),
          SizedBox(height: l(12, 8)),
          line(
            "FOOD XPLORER",
            FoxType.captionS.copyWith(
              color: FoxTokens.textInvertedSecondary,
              fontSize: l(10, 9),
              height: 1,
              letterSpacing: subTracking,
              fontWeight: FontWeight.w500,
              fontVariations: const [FontVariation("wght", 500)],
            ),
          ),
        ],
      ),
    );
  }
}
