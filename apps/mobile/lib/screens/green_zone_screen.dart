import "package:flutter/material.dart";

import "package:foodfox/data/fox_categories.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 06 — allowed products, grouped the way the current mockup does it.
class GreenZoneScreen extends StatefulWidget {
  const GreenZoneScreen({
    super.key,
    required this.api,
    required this.items,
    this.onOpenRecipes,
  });

  final FoodFoxApi api;
  final List<ResultItem> items;
  final VoidCallback? onOpenRecipes;

  @override
  State<GreenZoneScreen> createState() => _GreenZoneScreenState();
}

class _GreenZoneScreenState extends State<GreenZoneScreen> {
  String? _category;
  Map<String, int> _recipeCounts = {};

  @override
  void initState() {
    super.initState();
    _loadRecipeCounts();
  }

  Future<void> _loadRecipeCounts() async {
    try {
      final data = await widget.api.fetchRecipes();
      final counts = <String, int>{};
      for (final recipe in data.recipes) {
        if (!recipe.allGreen && !recipe.suitable) continue;
        final names = <String>{
          for (final item in recipe.ingredients) item.name.toLowerCase(),
          for (final item in recipe.ingredientsList) item.name.toLowerCase(),
        };
        for (final name in names) {
          counts[name] = (counts[name] ?? 0) + 1;
        }
      }
      if (mounted) setState(() => _recipeCounts = counts);
    } catch (_) {
      // The grid is useful without the recipe links.
    }
  }

  List<String> get _categories {
    final present = widget.items
        .map((item) => foxCategoryOf(item.foxName))
        .toSet();
    return [
      for (final name in foxCategoryOrder)
        if (present.contains(name)) name,
    ];
  }

  List<ResultItem> get _visible {
    final items = widget.items.where((item) {
      if (_category == null) return true;
      return foxCategoryOf(item.foxName) == _category;
    }).toList();
    items.sort((a, b) => a.foxName.compareTo(b.foxName));
    return items;
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.items.length;
    final rows = _visible;

    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          children: [
            FoxPressable(
              onTap: () => Navigator.of(context).pop(),
              child: const SizedBox(
                width: 40,
                height: 40,
                child: Icon(
                  Icons.arrow_back_rounded,
                  size: 22,
                  color: FoxTokens.textPrimary,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const FoxZoneDot(color: Color(0xFFA3C644), size: 12),
                const SizedBox(width: 10),
                Text(
                  "Зелёная зона",
                  style: FoxType.h3.copyWith(
                    color: FoxTokens.textPrimary,
                    fontSize: 30,
                    height: 34 / 30,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              "$total ${_productsWord(total)} без ограничений · IgG ниже 10 мкг/мл",
              style: FoxType.caption.copyWith(
                color: FoxTokens.textSecondary,
                height: 20 / 14,
              ),
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  FoxChip(
                    label: "Все",
                    selected: _category == null,
                    onTap: () => setState(() => _category = null),
                  ),
                  for (final name in _categories) ...[
                    const SizedBox(width: 8),
                    FoxChip(
                      label: name,
                      selected: _category == name,
                      onTap: () => setState(() => _category = name),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < rows.length; i += 2) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _card(rows[i])),
                  const SizedBox(width: 10),
                  Expanded(
                    child: i + 1 < rows.length
                        ? _card(rows[i + 1])
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }

  Widget _card(ResultItem item) {
    final recipes = _recipeCounts[item.foxName.toLowerCase()] ?? 0;
    return FoxFadeSlide(
      offset: 10,
      child: FoxCard(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
        radius: 20,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: FoxTokens.zoneGreenBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_rounded,
                size: 16,
                color: FoxTokens.zoneGreen,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              item.foxName,
              style: FoxType.bodyS.copyWith(
                color: FoxTokens.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              foxCategoryOf(item.foxName),
              style: FoxType.captionS.copyWith(
                color: FoxTokens.textSecondary,
                fontSize: 12,
              ),
            ),
            if (recipes > 0) ...[
              const SizedBox(height: 10),
              FoxPressable(
                onTap: widget.onOpenRecipes,
                child: Row(
                  children: [
                    Text(
                      "$recipes ${_recipesWord(recipes)}",
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.zoneGreen,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: FoxTokens.zoneGreen,
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

String _productsWord(int count) {
  final mod100 = count % 100;
  final mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "продуктов";
  return switch (mod10) {
    1 => "продукт",
    2 || 3 || 4 => "продукта",
    _ => "продуктов",
  };
}

String _recipesWord(int count) {
  final mod100 = count % 100;
  final mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "рецептов";
  return switch (mod10) {
    1 => "рецепт",
    2 || 3 || 4 => "рецепта",
    _ => "рецептов",
  };
}
