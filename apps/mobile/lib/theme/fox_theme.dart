import "package:flutter/material.dart";

import "package:foodfox/theme/fox_tokens.dart";

/// Semantic aliases kept stable for existing screens; values follow the
/// approved FOX design system (see fox_tokens.dart).
abstract final class FoxColors {
  static const bg = FoxTokens.bgNeutral;
  static const surface = FoxTokens.bgCard;
  static const primary = FoxTokens.bgGreen;
  static const primaryDark = Color(0xFF101400);
  static const primarySoft = FoxTokens.zoneGreenBg;
  static const primaryMuted = FoxTokens.bgGrey;
  static const accent = FoxTokens.accentLime;
  static const text = FoxTokens.textPrimary;
  static const muted = FoxTokens.textSecondary;
  static const border = FoxTokens.borderLight;
  static const reminder = FoxTokens.zoneGreenBg;
  static const green = FoxTokens.zoneGreen;
  static const yellow = FoxTokens.zoneYellow;
  static const red = FoxTokens.zoneRed;
}

ThemeData buildFoxTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: FoxType.family,
    scaffoldBackgroundColor: FoxColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: FoxColors.primary,
      primary: FoxColors.primary,
      secondary: FoxColors.accent,
      surface: FoxColors.surface,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: FoxColors.bg,
      foregroundColor: FoxColors.text,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    textTheme: TextTheme(
      displaySmall: FoxType.h3.copyWith(color: FoxColors.text),
      headlineMedium: FoxType.h3.copyWith(color: FoxColors.text),
      headlineSmall: FoxType.h4.copyWith(color: FoxColors.text),
      titleMedium: FoxType.button.copyWith(color: FoxColors.text),
      bodyLarge: FoxType.bodyS.copyWith(color: FoxColors.text),
      bodyMedium: FoxType.caption.copyWith(
        color: FoxColors.muted,
        height: 1.45,
      ),
      labelLarge: FoxType.button.copyWith(color: FoxColors.surface),
      labelSmall: FoxType.captionS.copyWith(color: FoxColors.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: FoxColors.primary,
        foregroundColor: FoxColors.surface,
        minimumSize: const Size.fromHeight(54),
        shape: const StadiumBorder(),
        textStyle: FoxType.button,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: FoxColors.text,
        minimumSize: const Size.fromHeight(54),
        side: const BorderSide(color: FoxColors.border),
        shape: const StadiumBorder(),
        textStyle: FoxType.button,
      ),
    ),
  );
}

BoxDecoration foxCardDecoration = BoxDecoration(
  color: FoxColors.surface,
  borderRadius: BorderRadius.circular(FoxTokens.radiusCard),
  border: Border.all(color: FoxColors.border),
);
