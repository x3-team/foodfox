import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";

enum RecipeZoneBadge { allGreen, suitable, unsuitable }

RecipeZoneBadge recipeZoneBadge(RecipeItem recipe) {
  if (recipe.allGreen) return RecipeZoneBadge.allGreen;
  if (recipe.suitable) return RecipeZoneBadge.suitable;
  return RecipeZoneBadge.unsuitable;
}

class RecipeCardMedia extends StatelessWidget {
  const RecipeCardMedia({
    super.key,
    required this.badge,
    required this.title,
    this.photoUrl,
  });

  final RecipeZoneBadge badge;
  final String title;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 128,
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [FoxColors.primarySoft, FoxColors.primaryMuted],
              ),
            ),
            child: photoUrl != null && photoUrl!.isNotEmpty
                ? Image.network(photoUrl!, fit: BoxFit.cover)
                : Center(
                    child: Text(
                      _recipeEmoji(title),
                      style: const TextStyle(fontSize: 52),
                    ),
                  ),
          ),
          Positioned(
            left: 12,
            top: 12,
            child: _ZoneBadge(badge: badge),
          ),
        ],
      ),
    );
  }

  String _recipeEmoji(String title) {
    final t = title.toLowerCase();
    if (RegExp(r"салат|зелен|шпинат|капуст").hasMatch(t)) return "🥗";
    if (RegExp(r"суп|бульон").hasMatch(t)) return "🍲";
    if (RegExp(r"рыб|лосос|треск").hasMatch(t)) return "🐟";
    if (RegExp(r"куриц|индейк|мяс").hasMatch(t)) return "🍗";
    if (RegExp(r"гречк|рис|каша|овсян").hasMatch(t)) return "🥣";
    if (RegExp(r"кабач|цукк|овощ|запек").hasMatch(t)) return "🥒";
    return "🍽️";
  }
}

class _ZoneBadge extends StatelessWidget {
  const _ZoneBadge({required this.badge});

  final RecipeZoneBadge badge;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (badge) {
      RecipeZoneBadge.allGreen => ("100% зелёная зона", FoxColors.primary, Colors.white),
      RecipeZoneBadge.suitable => (
          "Подходит с учётом ротации",
          FoxColors.yellow.withValues(alpha: 0.2),
          FoxColors.yellow,
        ),
      RecipeZoneBadge.unsuitable => (
          "Есть красная зона",
          const Color(0xFFFEE2E2),
          FoxColors.red,
        ),
    };

    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(
          label,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg, height: 1.2),
        ),
      ),
    );
  }
}
