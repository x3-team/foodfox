import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// First screen after the splash: photo hero over the brand green with the
/// value proposition and a single call to action.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onStart});

  final VoidCallback onStart;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with SingleTickerProviderStateMixin {
  // Slow Ken Burns push on the hero photo.
  late final AnimationController _kb = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 6),
  )..forward();

  @override
  void dispose() {
    _kb.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final photoHeight = media.size.height * 0.68;

    return Scaffold(
      backgroundColor: FoxTokens.bgGreen,
      body: Stack(
        fit: StackFit.expand,
        children: [
          SizedBox(
            height: photoHeight,
            child: AnimatedBuilder(
              animation: _kb,
              builder: (context, child) => Transform.scale(
                scale: 1 + 0.06 * _kb.value,
                child: child,
              ),
              child: Image.asset(
                "assets/images/onboarding_hero.jpg",
                fit: BoxFit.cover,
                alignment: Alignment.topCenter,
                errorBuilder: (_, _, _) => Container(color: FoxTokens.bgBrown),
              ),
            ),
          ),
          // Photo shadows blend into the brand green, then fade to solid.
          Container(
            height: photoHeight,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0.0, 0.42, 0.72, 1.0],
                colors: [
                  Color(0x8C21251D),
                  Color(0x0021251D),
                  Color(0xC721251D),
                  FoxTokens.bgGreen,
                ],
              ),
            ),
          ),
          Positioned(
            left: 24,
            top: media.padding.top + 12,
            child: const FoxFadeSlide(
              offset: 10,
              child: _Wordmark(),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: EdgeInsets.fromLTRB(24, 0, 24, media.padding.bottom + 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: foxStagger(
                  [
                    Row(
                      children: [
                        const FoxZoneDot(color: FoxTokens.accentLime, size: 7),
                        const SizedBox(width: 8),
                        Text(
                          "IgG-тест FOX · сопровождение после сдачи",
                          style: FoxType.captionS.copyWith(
                            color: FoxTokens.accentLime,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      "Персональный план питания по вашему тесту FOX",
                      style: FoxType.h2.copyWith(
                        color: FoxTokens.textInverted,
                        fontSize: 38,
                        height: 42 / 38,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      "Загрузите PDF-отчёт — распознаем 285 антигенов "
                      "и соберём протокол на 4–6 месяцев",
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textInvertedSecondary,
                        height: 23 / 16,
                      ),
                    ),
                    const SizedBox(height: 22),
                    const _Stats(),
                    const SizedBox(height: 30),
                    FoxButton(
                      label: "Войти по номеру телефона",
                      kind: FoxButtonKind.accent,
                      trailingIcon: Icons.arrow_forward_rounded,
                      onPressed: widget.onStart,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      "IgG — не диагноз аллергии. Результаты интерпретируются "
                      "со специалистом.",
                      textAlign: TextAlign.center,
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.textInvertedSecondary,
                        height: 16 / 12,
                      ),
                    ),
                  ],
                  start: const Duration(milliseconds: 120),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "FOX",
            style: FoxType.h4.copyWith(
              color: FoxTokens.textInverted,
              fontSize: 26,
              height: 1,
              letterSpacing: 1,
              fontWeight: FontWeight.w800,
              fontVariations: const [FontVariation("wght", 800)],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            "FOOD XPLORER",
            style: FoxType.captionS.copyWith(
              color: FoxTokens.textInvertedSecondary,
              fontSize: 9,
              letterSpacing: 1.6,
              fontWeight: FontWeight.w500,
              fontVariations: const [FontVariation("wght", 500)],
            ),
          ),
        ],
      );
}

class _Stats extends StatelessWidget {
  const _Stats();

  @override
  Widget build(BuildContext context) => Row(
        children: [
          for (final item in const [
            ("285", "продуктов"),
            ("3", "зоны"),
            ("4", "шага"),
          ]) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.$1,
                    style: FoxType.label.copyWith(
                      color: FoxTokens.accentLime,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    item.$2,
                    style: FoxType.caption
                        .copyWith(color: FoxTokens.textInvertedSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
          ],
        ],
      );
}
