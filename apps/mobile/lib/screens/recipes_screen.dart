import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/page_header.dart";

class RecipesScreen extends StatefulWidget {
  const RecipesScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<RecipesScreen> createState() => _RecipesScreenState();
}

class _RecipesScreenState extends State<RecipesScreen> {
  bool _loading = true;
  String? _error;
  List<RecipeItem> _recipes = [];
  int _weekNumber = 1;

  @override
  void initState() {
    super.initState();
    _load();
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
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
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
                          Padding(
                            padding: const EdgeInsets.all(20),
                            child: Text(_error!, style: const TextStyle(color: FoxColors.red)),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                        itemCount: _recipes.length,
                        itemBuilder: (context, index) {
                          final recipe = _recipes[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: foxCardDecoration,
                            clipBehavior: Clip.antiAlias,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Container(
                                  height: 128,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        FoxColors.primarySoft,
                                        FoxColors.primaryMuted,
                                      ],
                                    ),
                                  ),
                                  child: const Text(
                                    "ФОТО БЛЮДА",
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                      letterSpacing: 1,
                                      color: FoxColors.primary,
                                    ),
                                  ),
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
                                      const SizedBox(height: 8),
                                      Text(
                                        "${recipe.tags.isNotEmpty ? recipe.tags.first : "—"} · без красной зоны",
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                          color: FoxColors.primary,
                                        ),
                                      ),
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
