import "package:flutter/material.dart";

/// Design tokens mirroring the approved FOX design system in Figma
/// (page «Fox приложение», collection «FOX App»).
abstract final class FoxTokens {
  // Background
  static const bgNeutral = Color(0xFFF8F9F6);
  static const bgGrey = Color(0xFFD7D8CD);
  static const bgGreen = Color(0xFF21251D);
  static const bgBrown = Color(0xFF424235);
  static const bgCard = Color(0xFFFFFFFF);

  // Accent
  static const accentLime = Color(0xFFE7F551);

  // Text & icon
  static const textPrimary = Color(0xFF0B0C08);
  static const textSecondary = Color(0xFF5C5E57);
  static const textInverted = Color(0xFFF8F9F6);
  static const textInvertedSecondary = Color(0xFFA8AAA3);

  // Border
  static const borderLight = Color(0xFFE3E4DF);
  static const borderDark = Color(0xFF3A3E35);

  // FOX zones
  static const zoneGreen = Color(0xFF4A6B1F);
  static const zoneGreenBg = Color(0xFFEDF3D9);
  static const zoneYellow = Color(0xFF8A6416);
  static const zoneYellowBg = Color(0xFFFBF0D8);
  static const zoneRed = Color(0xFFA03A22);
  static const zoneRedBg = Color(0xFFF8E3DE);

  // Radii used across the app shell
  static const radiusChip = 100.0;
  static const radiusCard = 20.0;
  static const radiusHero = 24.0;
}

/// Manrope is shipped as a variable font, so weight is applied through
/// [FontVariation] rather than relying on separately bundled static faces.
abstract final class FoxType {
  static const family = "Manrope";

  static const _light = [FontVariation("wght", 300)];
  static const _regular = [FontVariation("wght", 400)];
  static const _medium = [FontVariation("wght", 500)];

  static const display = TextStyle(
    fontFamily: family,
    fontSize: 64,
    height: 68 / 64,
    letterSpacing: -2,
    fontWeight: FontWeight.w300,
    fontVariations: _light,
  );

  static const h1 = TextStyle(
    fontFamily: family,
    fontSize: 56,
    height: 60 / 56,
    letterSpacing: -1,
    fontWeight: FontWeight.w300,
    fontVariations: _light,
  );

  static const h2 = TextStyle(
    fontFamily: family,
    fontSize: 40,
    height: 44 / 40,
    letterSpacing: -1,
    fontWeight: FontWeight.w300,
    fontVariations: _light,
  );

  static const h3 = TextStyle(
    fontFamily: family,
    fontSize: 32,
    height: 36 / 32,
    letterSpacing: -0.5,
    fontWeight: FontWeight.w300,
    fontVariations: _light,
  );

  static const h4 = TextStyle(
    fontFamily: family,
    fontSize: 24,
    height: 28 / 24,
    letterSpacing: -0.5,
    fontWeight: FontWeight.w300,
    fontVariations: _light,
  );

  static const bodyM = TextStyle(
    fontFamily: family,
    fontSize: 20,
    height: 24 / 20,
    fontWeight: FontWeight.w400,
    fontVariations: _regular,
  );

  static const bodyS = TextStyle(
    fontFamily: family,
    fontSize: 16,
    height: 20 / 16,
    fontWeight: FontWeight.w400,
    fontVariations: _regular,
  );

  static const button = TextStyle(
    fontFamily: family,
    fontSize: 16,
    height: 20 / 16,
    fontWeight: FontWeight.w500,
    fontVariations: _medium,
  );

  static const caption = TextStyle(
    fontFamily: family,
    fontSize: 14,
    height: 18 / 14,
    fontWeight: FontWeight.w400,
    fontVariations: _regular,
  );

  static const captionS = TextStyle(
    fontFamily: family,
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w400,
    fontVariations: _regular,
  );

  static const label = TextStyle(
    fontFamily: family,
    fontSize: 14,
    height: 18 / 14,
    fontWeight: FontWeight.w500,
    fontVariations: _medium,
  );
}

/// Zone palette lookup used by results, plan and recipe screens.
({Color fg, Color bg}) foxZoneColors(String zone) {
  switch (zone) {
    case "green":
      return (fg: FoxTokens.zoneGreen, bg: FoxTokens.zoneGreenBg);
    case "yellow":
      return (fg: FoxTokens.zoneYellow, bg: FoxTokens.zoneYellowBg);
    default:
      return (fg: FoxTokens.zoneRed, bg: FoxTokens.zoneRedBg);
  }
}
