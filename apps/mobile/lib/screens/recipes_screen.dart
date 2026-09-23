import "package:flutter/material.dart";

import "package:foodfox/models/models.dart";
import "package:foodfox/screens/recipe_detail_screen.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/recipe_card_media.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 07 — green-zone recipes, one featured card and compact rows.
class RecipesScreen extends StatefulWidget {
  const RecipesScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

enum _RecipeFilter { green, breakfast, lunch, dinner }

class _RecipesScreenState extends State<RecipesScreen> {
  bool _loading = false;
  Object? _error;
  List<RecipeItem> _recipes = [];
  var _filter = _RecipeFilter.green;
  late final LazyTabLoader _loader = LazyTabLoader(onLoad: _load);

  @override
  void initState() {
    super.initState();
    _loader.sync(active: true);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.fetchRecipes();
      if (!mounted) return;
      setState(() {
        _recipes = data.recipes;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  List<RecipeItem> get _visible {
    return _recipes.where((recipe) {
      return switch (_filter) {
        _RecipeFilter.green => recipe.allGreen,
        _RecipeFilter.breakfast => _hasMeal(recipe, "завтрак"),
        _RecipeFilter.lunch => _hasMeal(recipe, "обед"),
        _RecipeFilter.dinner => _hasMeal(recipe, "ужин"),
      };
    }).toList();
  }

  void _openRecipe(RecipeItem recipe) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RecipeDetailScreen(recipe: recipe),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final recipes = _visible;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: FoxTokens.bgGreen,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              children: [
                const FoxScreenTitle(
                  title: "Рецепты",
                  subtitle: "Только из разрешённых вам продуктов",
                ),
                const SizedBox(height: 16),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final filter in _RecipeFilter.values) ...[
                        if (filter != _RecipeFilter.green)
                          const SizedBox(width: 8),
                        FoxChip(
                          label: _filterLabel(filter),
                          selected: _filter == filter,
                          onTap: () => setState(() => _filter = filter),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.only(top: 48),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: FoxTokens.bgGreen,
                      ),
                    ),
                  )
                else if (_error != null)
                  NetworkErrorPanel(
                    error: _error!,
                    onRetry: () => _loader.sync(active: true, force: true),
                  )
                else if (recipes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 32),
                    child: Text(
                      "В этом фильтре пока нет блюд из вашей зелёной зоны.",
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                  )
                else ...[
                  FoxFadeSlide(
                    child: _FeaturedCard(
                      recipe: recipes.first,
                      onTap: () => _openRecipe(recipes.first),
                    ),
                  ),
                  const SizedBox(height: 12),
                  for (var i = 1; i < recipes.length; i++) ...[
                    FoxFadeSlide(
                      delay: FoxMotion.stagger * i,
                      child: _RecipeRow(
                        recipe: recipes[i],
                        onTap: () => _openRecipe(recipes[i]),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  const _FeaturedCard({required this.recipe, required this.onTap});

  final RecipeItem recipe;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(22),
    child: FoxCard(
      padding: EdgeInsets.zero,
      radius: 22,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 176,
            child: Stack(
              fit: StackFit.expand,
              children: [
                RecipePhoto(photoUrl: recipe.photoUrl),
                const Positioned(
                  left: 12,
                  top: 12,
                  child: _LimeBadge(label: "100% зелёная"),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  recipe.title,
                  style: FoxType.bodyM.copyWith(
                    color: FoxTokens.textPrimary,
                    fontSize: 18,
                    height: 22 / 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _recipeMeta(recipe),
                  style: FoxType.caption.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _RecipeRow extends StatelessWidget {
  const _RecipeRow({required this.recipe, required this.onTap});

  final RecipeItem recipe;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(18),
    child: FoxCard(
      padding: const EdgeInsets.all(10),
      radius: 18,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 76,
              height: 76,
              child: RecipePhoto(photoUrl: recipe.photoUrl),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  recipe.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: FoxType.bodyS.copyWith(
                    color: FoxTokens.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    if (recipe.allGreen) ...[
                      const _GreenPill(),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        _recipeMeta(recipe),
                        overflow: TextOverflow.ellipsis,
                        style: FoxType.captionS.copyWith(
                          color: FoxTokens.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _LimeBadge extends StatelessWidget {
  const _LimeBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: FoxTokens.accentLime,
      borderRadius: BorderRadius.circular(100),
    ),
    child: Text(
      label,
      style: FoxType.captionS.copyWith(
        color: FoxTokens.textPrimary,
        fontWeight: FontWeight.w500,
      ),
    ),
  );
}

class _GreenPill extends StatelessWidget {
  const _GreenPill();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: FoxTokens.zoneGreenBg,
      borderRadius: BorderRadius.circular(100),
    ),
    child: Text(
      "зелёная",
      style: FoxType.captionS.copyWith(
        color: FoxTokens.zoneGreen,
        fontWeight: FontWeight.w500,
      ),
    ),
  );
}

String _filterLabel(_RecipeFilter filter) => switch (filter) {
  _RecipeFilter.green => "100% зелёная",
  _RecipeFilter.breakfast => "Завтрак",
  _RecipeFilter.lunch => "Обед",
  _RecipeFilter.dinner => "Ужин",
};

bool _hasMeal(RecipeItem recipe, String meal) =>
    recipe.tags.any((tag) => tag.toLowerCase().contains(meal));

String _recipeMeta(RecipeItem recipe) {
  final time =
      recipe.tags.where((tag) => tag.contains("мин")).firstOrNull ??
      recipe.prepTime;
  final meal = recipe.tags
      .map((tag) => tag.toLowerCase())
      .where(
        (tag) =>
            tag.contains("завтрак") ||
            tag.contains("обед") ||
            tag.contains("ужин"),
      )
      .map(_mealTitle)
      .firstOrNull;
  if (time != null && meal != null) return "$time · $meal";
  return time ?? meal ?? "";
}

String _mealTitle(String tag) {
  if (tag.contains("завтрак")) return "Завтрак";
  if (tag.contains("обед")) return "Обед";
  return "Ужин";
}

extension on Iterable<String> {
  String? get firstOrNull {
    final iterator = this.iterator;
    if (!iterator.moveNext()) return null;
    return iterator.current;
  }
}
