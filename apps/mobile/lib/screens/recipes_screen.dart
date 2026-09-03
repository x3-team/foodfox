import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/recipe_card_media.dart";

class RecipesScreen extends StatefulWidget {
  const RecipesScreen({super.key, required this.api, this.isActive = true});

  final FoodFoxApi api;
  final bool isActive;

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends State<RecipesScreen> {
  bool _loading = false;
  Object? _error;
  List<RecipeItem> _recipes = [];
  int _weekNumber = 1;
  int _suitableCount = 0;
  late final LazyTabLoader _loader = LazyTabLoader(onLoad: _load);

  @override
  void initState() {
    super.initState();
    _loader.sync(active: widget.isActive);
  }

  @override
  void didUpdateWidget(covariant RecipesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    _loader.sync(active: widget.isActive);
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
        _weekNumber = data.weekNumber;
        _suitableCount = data.suitableCount;
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

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PageHeader(
          title: "Рецепты",
          subtitle:
              "Неделя $_weekNumber · ${getWeekPhase(_weekNumber)} — только зелёные продукты",
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: FoxColors.primary,
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: FoxColors.primary))
                : _error != null
                    ? ListView(
                        children: [
                          NetworkErrorPanel(
                            error: _error!,
                            onRetry: () => _loader.sync(active: true, force: true),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                        itemCount: _recipes.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Text(
                                "$_suitableCount из ${_recipes.length} блюд подходят вам",
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: FoxColors.primary,
                                ),
                              ),
                            );
                          }
                          final recipe = _recipes[index - 1];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: foxCardDecoration,
                            clipBehavior: Clip.antiAlias,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                RecipeCardMedia(
                                  badge: recipeZoneBadge(recipe),
                                  title: recipe.title,
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        recipe.title,
                                        style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w600,
                                          color: FoxColors.text,
                                        ),
                                      ),
                                      if (recipe.description != null) ...[
                                        const SizedBox(height: 6),
                                        Text(
                                          recipe.description!,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            color: FoxColors.muted,
                                            height: 1.45,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ),
      ],
    );
  }
}
