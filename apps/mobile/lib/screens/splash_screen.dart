import "dart:math" as math;

import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";
import "package:foodfox/widgets/ui/fox_wordmark.dart";

/// Launch animation: a lime seed unfolds into the FOX zone ring, the wordmark
/// resolves inside it, then the ring expands past the screen and hands the
/// wordmark over to the onboarding screen.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onFinished});

  final VoidCallback onFinished;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  // 4.2 s total. Long enough to read the ring being drawn zone by zone, hold
  // on the finished logo, and still give the logo's trip to the corner over a
  // second of its own rather than a flick at the end.
  static const _total = Duration(milliseconds: 4200);

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: _total,
  );

  // Seed dot breathes in first, then hands over to the ring.
  late final Animation<double> _seed = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.0, 0.07, curve: FoxMotion.easeOut),
  );

  // 290 → 1810 ms: arcs sweep round. easeInOutCubic keeps the start and the
  // finish gentle instead of snapping into place.
  late final Animation<double> _ring = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.07, 0.43, curve: Curves.easeInOutCubic),
  );

  // 1260 → 2180 ms: wordmark resolves while the last arc is still drawing.
  late final Animation<double> _logo = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.30, 0.52, curve: FoxMotion.easeOut),
  );

  late final Animation<double> _glow = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.09, 0.58, curve: FoxMotion.easeOut),
  );

  // 2770 → 3780 ms: the ring opens past the screen edge.
  late final Animation<double> _burst = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.66, 0.90, curve: Curves.easeInOutCubic),
  );

  // 2770 → 3990 ms: the wordmark walks to the corner it occupies on the
  // onboarding screen. Deliberately slower than the ring burst and finishing
  // before the controller does, so it visibly settles before the handover.
  // easeInOutSine rather than the cubic used elsewhere: the cubic packs almost
  // the whole distance into the middle 300 ms, which reads as a jump.
  late final Animation<double> _fly = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.66, 0.95, curve: Curves.easeInOutSine),
  );

  /// How much larger the lockup sits at rest than in its docked corner.
  /// Paired with [_ringSize]: the "FOOD XPLORER" line is the widest part of
  /// the lockup and has to stay inside the ring.
  static const _zoom = 2.05;

  /// Diameter of the ring while it is being drawn.
  static const _ringSize = 252.0;

  @override
  void initState() {
    super.initState();
    _c.addStatusListener((status) {
      if (status == AnimationStatus.completed) widget.onFinished();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (FoxMotion.reduced(context)) {
        Future<void>.delayed(const Duration(milliseconds: 300), () {
          if (mounted) widget.onFinished();
        });
      } else {
        _c.forward();
      }
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    const segments = <({double fraction, Color color})>[
      (fraction: 0.60, color: FoxTokens.accentLime),
      (fraction: 0.10, color: Color(0xFFE8B44A)),
      (fraction: 0.30, color: Color(0xFFC0563C)),
    ];

    return Scaffold(
      backgroundColor: FoxTokens.bgGreen,
      body: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final burst = _burst.value;
          final fly = _fly.value;
          final ringDraw = _ring.value;
          // The seed dot grows into the ring, so the two never appear at once.
          final seedOpacity = (1 - ringDraw * 6).clamp(0.0, 1.0);
          // The ring opens past the screen edge while fading out.
          final ringSize = _ringSize + burst * (1560 - _ringSize);
          final logoScale = 0.94 + 0.06 * _logo.value;
          // Glow breathes gently once the ring is complete.
          final breathe = 1 + 0.03 * math.sin(_c.value * math.pi * 3);

          return Stack(
            alignment: Alignment.center,
            children: [
              Opacity(
                opacity: (_glow.value * (1 - burst)).clamp(0.0, 1.0),
                child: Transform.scale(
                  scale: breathe,
                  child: Container(
                    width: 520,
                    height: 520,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [Color(0x3AE7F551), Color(0x00E7F551)],
                      ),
                    ),
                  ),
                ),
              ),
              if (seedOpacity > 0)
                Opacity(
                  opacity: seedOpacity,
                  child: Container(
                    width: 12 * _seed.value,
                    height: 12 * _seed.value,
                    decoration: const BoxDecoration(
                      color: FoxTokens.accentLime,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              Opacity(
                opacity: (1 - burst).clamp(0.0, 1.0),
                child: SizedBox(
                  width: ringSize,
                  height: ringSize,
                  child: CustomPaint(
                    painter: FoxRingPainter(
                      segments: segments,
                      progress: ringDraw,
                      strokeWidth: 9 + burst * 28,
                    ),
                  ),
                ),
              ),
              // The lockup slides and shrinks into the exact spot the
              // onboarding screen keeps it, so the two screens hand it over
              // instead of blinking it from the middle to the corner.
              Align(
                alignment: Alignment.lerp(
                  Alignment.center,
                  Alignment.topLeft,
                  fly,
                )!,
                child: Padding(
                  padding: EdgeInsets.only(
                    left: FoxWordmark.inset * fly,
                    top: (media.padding.top + FoxWordmark.topGap) * fly,
                  ),
                  child: Transform.scale(
                    scale: logoScale * (1 + (_zoom - 1) * (1 - fly)),
                    child: Opacity(
                      opacity: _logo.value.clamp(0.0, 1.0),
                      child: const FoxWordmark(),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
