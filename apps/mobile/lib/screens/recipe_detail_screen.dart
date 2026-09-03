import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/recipe_card_media.dart";

class RecipeDetailScreen extends StatelessWidget {
  const RecipeDetailScreen({super.key, required this.recipe});

  final RecipeItem recipe;

  @override
  Widget build(BuildContext context) {
    final badge = recipeZoneBadge(recipe);
    final intro = recipe.lead ?? recipe.description;

    return Scaffold(
      backgroundColor: FoxColors.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: FoxColors.primary,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (recipe.photoUrl != null && recipe.photoUrl!.isNotEmpty)
                    Image.network(recipe.photoUrl!, fit: BoxFit.cover)
                  else
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [FoxColors.primarySoft, FoxColors.primaryMuted],
                        ),
                      ),
                      child: Center(
                        child: Text("🍽️", style: TextStyle(fontSize: 64)),
                      ),
                    ),
                  Positioned(
                    left: 16,
                    top: MediaQuery.of(context).padding.top + 8,
                    child: _ZoneBadge(badge: badge),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    recipe.title,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: FoxColors.text,
                      height: 1.2,
                    ),
                  ),
                  if (intro != null && intro.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      intro,
                      style: const TextStyle(
                        fontSize: 16,
                        height: 1.5,
                        color: FoxColors.text,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (recipe.prepTime != null)
                        _MetaChip(icon: "⏱", label: recipe.prepTime!),
                      if (recipe.cookTime != null)
                        _MetaChip(icon: "🔥", label: recipe.cookTime!),
                      if (recipe.servings != null)
                        _MetaChip(icon: "🍽", label: "${recipe.servings} порции"),
                      ...recipe.tags.map((tag) => _TagChip(label: tag)),
                    ],
                  ),
                  if (recipe.warnings.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: FoxColors.yellow.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        recipe.warnings.join(" · "),
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.45,
                          color: FoxColors.yellow,
                        ),
                      ),
                    ),
                  ],
                  if (recipe.ingredientsList.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    const _SectionTitle("Ингредиенты"),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: FoxColors.bg.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: FoxColors.border),
                      ),
                      child: Column(
                        children: [
                          for (var i = 0; i < recipe.ingredientsList.length; i++) ...[
                            if (i > 0)
                              const Divider(height: 1, color: FoxColors.border),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      recipe.ingredientsList[i].name,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        color: FoxColors.text,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    recipe.ingredientsList[i].amount,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: FoxColors.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                  if (recipe.steps.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    const _SectionTitle("Приготовление"),
                    const SizedBox(height: 16),
                    ...List.generate(recipe.steps.length, (index) {
                      final step = recipe.steps[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  alignment: Alignment.center,
                                  decoration: const BoxDecoration(
                                    color: FoxColors.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    "${index + 1}",
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        step.title,
                                        style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w600,
                                          color: FoxColors.text,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        step.body,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          height: 1.5,
                                          color: FoxColors.text,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (step.imageUrl != null && step.imageUrl!.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Padding(
                                padding: const EdgeInsets.only(left: 44),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.network(
                                    step.imageUrl!,
                                    height: 180,
                                    width: double.infinity,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                  ],
                  if (recipe.tips.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: FoxColors.primarySoft.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: FoxColors.primary.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Советы нутрициолога",
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: FoxColors.primaryDark,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...recipe.tips.map(
                            (tip) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("• ", style: TextStyle(fontSize: 14)),
                                  Expanded(
                                    child: Text(
                                      tip,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        height: 1.45,
                                        color: FoxColors.text,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.6,
        color: FoxColors.muted,
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final String icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: FoxColors.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        "$icon $label",
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: FoxColors.muted),
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  const _TagChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: FoxColors.primarySoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: FoxColors.primary,
        ),
      ),
    );
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
