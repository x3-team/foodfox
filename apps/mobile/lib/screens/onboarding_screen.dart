import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";
import "package:foodfox/widgets/ui/fox_wordmark.dart";

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
    // Typography tightens on shorter phones so the whole block still clears
    // the portrait's face instead of creeping up over it.
    final k = (media.size.height / 844).clamp(0.78, 1.0);

    return Scaffold(
      backgroundColor: FoxTokens.bgGreen,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Positioned, not a plain SizedBox: StackFit.expand hands children
          // tight constraints, which would stretch the portrait over the
          // whole screen and push her face down under the copy.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: photoHeight,
            // Without the clip the Ken Burns scale spills the photo below its
            // box, past the gradient, and a bright strip lands on the copy.
            child: ClipRect(
              child: AnimatedBuilder(
                animation: _kb,
                builder: (context, child) => Transform.scale(
                  scale: 1 + 0.06 * _kb.value,
                  // Pin the top edge so the push never drags the face down.
                  alignment: Alignment.topCenter,
                  child: child,
                ),
                child: Image.asset(
                  "assets/images/onboarding_hero.jpg",
                  fit: BoxFit.cover,
                  alignment: Alignment.topCenter,
                  errorBuilder: (_, _, _) =>
                      Container(color: FoxTokens.bgBrown),
                ),
              ),
            ),
          ),
          // Photo shadows blend into the brand green, then fade to solid.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: photoHeight,
            child: const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.30, 0.56, 0.82, 1.0],
                  colors: [
                    Color(0x7A21251D),
                    Color(0x0021251D),
                    Color(0x6621251D),
                    Color(0xE621251D),
                    FoxTokens.bgGreen,
                  ],
                ),
              ),
            ),
          ),
          // Deliberately not animated: the splash has just walked the lockup
          // into this exact spot, and re-animating it here would restart the
          // move the user already watched finish.
          Positioned(
            left: FoxWordmark.inset,
            top: media.padding.top + FoxWordmark.topGap,
            child: const FoxWordmark(),
          ),
          // The copy sits at the bottom and the face zone above it is simply
          // whatever is left. A fixed spacer plus a scroll view clipped the
          // eyebrow line on shorter phones; here the block never scrolls, and
          // the scaleDown shrinks it as one piece if a device is tight enough
          // that it still would not fit.
          Column(
            children: [
              const Spacer(),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.bottomCenter,
                  child: SizedBox(
                    width: media.size.width - 48,
                    child: Padding(
                      padding: EdgeInsets.only(
                        bottom: media.padding.bottom + 24 * k,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: foxStagger([
                          Row(
                            children: [
                              const FoxZoneDot(
                                color: FoxTokens.accentLime,
                                size: 7,
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  "IgG-тест FOX · сопровождение после сдачи",
                                  style: FoxType.captionS.copyWith(
                                    color: FoxTokens.accentLime,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 14 * k),
                          Text(
                            "Персональный план питания по вашему тесту FOX",
                            style: FoxType.h2.copyWith(
                              color: FoxTokens.textInverted,
                              fontSize: 38 * k,
                              height: 42 / 38,
                            ),
                          ),
                          SizedBox(height: 14 * k),
                          Text(
                            "Загрузите PDF-отчёт — распознаем 285 антигенов "
                            "и соберём протокол на 4–6 месяцев",
                            style: FoxType.bodyS.copyWith(
                              color: FoxTokens.textInvertedSecondary,
                              fontSize: 16 * k,
                              height: 23 / 16,
                            ),
                          ),
                          SizedBox(height: 22 * k),
                          const _Stats(),
                          SizedBox(height: 30 * k),
                          FoxButton(
                            label: "Войти по номеру телефона",
                            kind: FoxButtonKind.accent,
                            trailingIcon: Icons.arrow_forward_rounded,
                            onPressed: widget.onStart,
                          ),
                          SizedBox(height: 14 * k),
                          SizedBox(
                            width: double.infinity,
                            child: Text(
                              "IgG — не диагноз аллергии. Результаты "
                              "интерпретируются со специалистом.",
                              textAlign: TextAlign.center,
                              style: FoxType.captionS.copyWith(
                                color: FoxTokens.textInvertedSecondary,
                                height: 16 / 12,
                              ),
                            ),
                          ),
                        ], start: const Duration(milliseconds: 120)),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
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
                style: FoxType.caption.copyWith(
                  color: FoxTokens.textInvertedSecondary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
      ],
    ],
  );
}
