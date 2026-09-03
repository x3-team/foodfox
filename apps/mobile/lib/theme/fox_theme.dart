import "package:flutter/material.dart";

abstract final class FoxColors {
  static const bg = Color(0xFFF7F9F4);
  static const surface = Color(0xFFFFFFFF);
  static const primary = Color(0xFF256029);
  static const primaryDark = Color(0xFF1B4D1F);
  static const primarySoft = Color(0xFFE8F5E9);
  static const primaryMuted = Color(0xFFC8E6C9);
  static const text = Color(0xFF1C1C1E);
  static const muted = Color(0xFF6B7280);
  static const border = Color(0xFFE5E7EB);
  static const reminder = Color(0xFFF0FDF4);
  static const green = Color(0xFF059669);
  static const yellow = Color(0xFFD97706);
  static const red = Color(0xFFDC2626);
}

ThemeData buildFoxTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: FoxColors.bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: FoxColors.primary,
      primary: FoxColors.primary,
      surface: FoxColors.surface,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: FoxColors.surface,
      foregroundColor: FoxColors.text,
      elevation: 0,
    ),
    textTheme: const TextTheme(
      headlineSmall: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: FoxColors.text,
        height: 1.2,
      ),
      bodyLarge: TextStyle(fontSize: 15, color: FoxColors.text),
      bodyMedium: TextStyle(fontSize: 14, color: FoxColors.muted, height: 1.45),
      labelLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),
  );
}

BoxDecoration foxCardDecoration = BoxDecoration(
  color: FoxColors.surface,
  borderRadius: BorderRadius.circular(16),
  boxShadow: const [
    BoxShadow(
      color: Color(0x0A000000),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ],
);
