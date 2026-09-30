import "package:flutter/material.dart";

import "package:foodfox/theme/fox_tokens.dart";

/// The FOX lockup, shared by the splash and the onboarding screen.
///
/// Both screens render the very same widget at the very same size: the splash
/// only scales it up and walks it to the corner, so the handover between the
/// two screens lands on identical pixels and reads as one continuous move
/// rather than a swap.
class FoxWordmark extends StatelessWidget {
  const FoxWordmark({super.key});

  /// Distance from the left edge once the lockup has settled in the corner.
  static const inset = 24.0;

  /// Distance below the status bar once the lockup has settled.
  static const topGap = 12.0;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        "FOX",
        style: FoxType.h4.copyWith(
          color: FoxTokens.textInverted,
          fontSize: 30,
          height: 1,
          letterSpacing: 1.2,
          fontWeight: FontWeight.w800,
          fontVariations: const [FontVariation("wght", 800)],
        ),
      ),
      const SizedBox(height: 3),
      Text(
        "FOOD XPLORER",
        style: FoxType.captionS.copyWith(
          color: FoxTokens.textInvertedSecondary,
          fontSize: 10,
          letterSpacing: 1.8,
          fontWeight: FontWeight.w500,
          fontVariations: const [FontVariation("wght", 500)],
        ),
      ),
    ],
  );
}
