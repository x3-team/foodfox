import "dart:math" as math;

import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";

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
  // 3.8 s total. Long enough to read the ring being drawn zone by zone, with a
  // real hold on the finished logo before the screen opens up.
  static const _total = Duration(milliseconds: 3800);

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: _total,
  );

  // Seed dot breathes in first, then hands over to the ring.
  late final Animation<double> _seed = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.0, 0.08, curve: FoxMotion.easeOut),
  );

  // 300 → 1800 ms: arcs sweep round. easeInOutCubic keeps the start and the
  // finish gentle instead of snapping into place.
  late final Animation<double> _ring = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.08, 0.47, curve: Curves.easeInOutCubic),
  );

  // 1250 → 2200 ms: wordmark resolves while the last arc is still drawing.
  late final Animation<double> _logo = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.33, 0.58, curve: FoxMotion.easeOut),
  );

  late final Animation<double> _glow = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.10, 0.62, curve: FoxMotion.easeOut),
  );

  // 2850 → 3800 ms: hold ends, the ring opens past the screen edge.
  late final Animation<double> _burst = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.75, 1.0, curve: Curves.easeInOutCubic),
  );

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
          final ringDraw = _ring.value;
          // The seed dot grows into the ring, so the two never appear at once.
          final seedOpacity = (1 - ringDraw * 6).clamp(0.0, 1.0);
          // 168 px ring opens to 1500 px while fading out.
          final ringSize = 168 + burst * 1332;
          final logoScale = 0.94 + 0.06 * _logo.value - burst * 0.34;
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
                    width: 460,
                    height: 460,
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
              Opacity(
                opacity: (_logo.value * (1 - burst * 0.4)).clamp(0.0, 1.0),
                child: Transform.scale(
                  scale: logoScale.clamp(0.4, 1.2),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "FOX",
                        style: FoxType.h2.copyWith(
                          color: FoxTokens.textInverted,
                          fontSize: 40,
                          height: 1,
                          letterSpacing: 2,
                          fontWeight: FontWeight.w800,
                          fontVariations: const [FontVariation("wght", 800)],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "FOOD XPLORER",
                        style: FoxType.captionS.copyWith(
                          color: FoxTokens.textInvertedSecondary,
                          fontSize: 10,
                          letterSpacing: 2.4,
                          fontWeight: FontWeight.w500,
                          fontVariations: const [FontVariation("wght", 500)],
                        ),
                      ),
                    ],
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
