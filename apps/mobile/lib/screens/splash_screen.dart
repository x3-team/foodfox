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
  static const _total = Duration(milliseconds: 2050);

  late final AnimationController _c =
      AnimationController(vsync: this, duration: _total);

  // Timeline in normalised progress (0 … 1) over 2050 ms.
  late final Animation<double> _ring = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.0, 0.39, curve: FoxMotion.easeOut),
  );
  late final Animation<double> _logo = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.20, 0.54, curve: FoxMotion.easeOut),
  );
  late final Animation<double> _glow = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.10, 0.54, curve: FoxMotion.easeOut),
  );
  late final Animation<double> _burst = CurvedAnimation(
    parent: _c,
    curve: const Interval(0.76, 1.0, curve: FoxMotion.easeInOut),
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
          // 160 px ring grows to 1500 px while fading out.
          final ringSize = 160 + burst * 1340;
          final ringOpacity = 1 - burst;
          final logoScale = 0.94 + 0.06 * _logo.value - burst * 0.35;

          return Stack(
            alignment: Alignment.center,
            children: [
              Opacity(
                opacity: (_glow.value * (1 - burst)).clamp(0.0, 1.0),
                child: Container(
                  width: 440,
                  height: 440,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0x3AE7F551), Color(0x00E7F551)],
                    ),
                  ),
                ),
              ),
              Opacity(
                opacity: ringOpacity.clamp(0.0, 1.0),
                child: SizedBox(
                  width: ringSize,
                  height: ringSize,
                  child: CustomPaint(
                    painter: FoxRingPainter(
                      segments: segments,
                      progress: _ring.value,
                      strokeWidth: 8 + burst * 30,
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
