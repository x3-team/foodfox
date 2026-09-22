import "dart:convert";

import "package:flutter/material.dart";

import "package:foodfox/config/api_config.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_tokens.dart";

enum RecipeZoneBadge { allGreen, suitable, unsuitable }

RecipeZoneBadge recipeZoneBadge(RecipeItem recipe) {
  if (recipe.allGreen) return RecipeZoneBadge.allGreen;
  if (recipe.suitable) return RecipeZoneBadge.suitable;
  return RecipeZoneBadge.unsuitable;
}

/// Resolves a catalogue photo to a displayable image.
///
/// The catalogue stores site-relative paths (`/recipes/…`). The same files ship
/// inside the bundle, so we prefer the local asset and only fall back to the
/// network when the app meets an unknown path.
class RecipePhoto extends StatelessWidget {
  const RecipePhoto({super.key, required this.photoUrl, this.fit = BoxFit.cover});

  final String? photoUrl;
  final BoxFit fit;

  static const _basicAuth = "Basic ";

  @override
  Widget build(BuildContext context) {
    final url = photoUrl;
    if (url == null || url.isEmpty) return const _PhotoFallback();

    if (url.startsWith("/recipes/")) {
      final asset = "assets$url";
      return Image.asset(
        asset,
        fit: fit,
        errorBuilder: (_, _, _) => _networkImage("${ApiConfig.baseUrl}$url"),
      );
    }
    if (url.startsWith("/")) return _networkImage("${ApiConfig.baseUrl}$url");
    return _networkImage(url);
  }

  Widget _networkImage(String url) => Image.network(
        url,
        fit: fit,
        headers: {
          "Authorization": _basicAuth +
              base64Encode(
                utf8.encode("${ApiConfig.basicUser}:${ApiConfig.basicPass}"),
              ),
        },
        errorBuilder: (_, _, _) => const _PhotoFallback(),
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : const _PhotoFallback(),
      );
}

class _PhotoFallback extends StatelessWidget {
  const _PhotoFallback();

  @override
  Widget build(BuildContext context) => const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [FoxTokens.bgGrey, FoxTokens.zoneGreenBg],
          ),
        ),
      );
}

class RecipeCardMedia extends StatelessWidget {
  const RecipeCardMedia({
    super.key,
    required this.badge,
    required this.title,
    this.photoUrl,
    this.height = 176,
  });

  final RecipeZoneBadge badge;
  final String title;
  final String? photoUrl;
  final double height;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            RecipePhoto(photoUrl: photoUrl),
            Positioned(left: 14, top: 14, child: _ZoneBadge(badge: badge)),
          ],
        ),
      );
}

class _ZoneBadge extends StatelessWidget {
  const _ZoneBadge({required this.badge});

  final RecipeZoneBadge badge;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (badge) {
      RecipeZoneBadge.allGreen => (
          "100% зелёная зона",
          FoxTokens.accentLime,
          FoxTokens.textPrimary,
        ),
      RecipeZoneBadge.suitable => (
          "Подходит с ротацией",
          FoxTokens.zoneYellowBg,
          FoxTokens.zoneYellow,
        ),
      RecipeZoneBadge.unsuitable => (
          "Есть красная зона",
          FoxTokens.zoneRedBg,
          FoxTokens.zoneRed,
        ),
    };

    return Container(
      padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: FoxType.captionS.copyWith(
              color: fg,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
