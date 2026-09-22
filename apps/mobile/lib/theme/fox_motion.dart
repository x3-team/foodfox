import "package:flutter/widgets.dart";

/// Motion tokens mirroring the Figma annotations.
/// Single easing curve across the product; movement is only ever applied to
/// interface chrome, never to the IgG values themselves.
abstract final class FoxMotion {
  static const Cubic easeOut = Cubic(0.22, 1, 0.36, 1);
  static const Cubic easeInOut = Cubic(0.65, 0, 0.35, 1);

  static const Duration press = Duration(milliseconds: 120);
  static const Duration release = Duration(milliseconds: 160);
  static const Duration quick = Duration(milliseconds: 200);
  static const Duration base = Duration(milliseconds: 240);
  static const Duration slow = Duration(milliseconds: 400);
  static const Duration ring = Duration(milliseconds: 900);
  static const Duration countUp = Duration(milliseconds: 700);
  static const Duration progress = Duration(milliseconds: 600);

  /// Delay between neighbouring items in a staggered list.
  static const Duration stagger = Duration(milliseconds: 50);

  static bool reduced(BuildContext context) =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;
}

/// Entrance animation used across screens: fade plus a short upward slide.
class FoxFadeSlide extends StatefulWidget {
  const FoxFadeSlide({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.offset = 16,
    this.duration = const Duration(milliseconds: 320),
  });

  final Widget child;
  final Duration delay;
  final double offset;
  final Duration duration;

  @override
  State<FoxFadeSlide> createState() => _FoxFadeSlideState();
}

class _FoxFadeSlideState extends State<FoxFadeSlide>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.duration,
  );
  late final Animation<double> _a =
      CurvedAnimation(parent: _c, curve: FoxMotion.easeOut);

  @override
  void initState() {
    super.initState();
    if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      Future<void>.delayed(widget.delay, () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (FoxMotion.reduced(context)) return widget.child;
    return AnimatedBuilder(
      animation: _a,
      builder: (context, child) => Opacity(
        opacity: _a.value,
        child: Transform.translate(
          offset: Offset(0, widget.offset * (1 - _a.value)),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

/// Staggers [FoxFadeSlide] over a list of children.
List<Widget> foxStagger(
  List<Widget> children, {
  Duration step = FoxMotion.stagger,
  Duration start = Duration.zero,
  double offset = 12,
}) {
  return [
    for (var i = 0; i < children.length; i++)
      FoxFadeSlide(
        delay: start + step * i,
        offset: offset,
        child: children[i],
      ),
  ];
}

/// Animated integer used for the antigen counter and payout amounts.
class FoxCountUp extends StatelessWidget {
  const FoxCountUp({
    super.key,
    required this.value,
    required this.style,
    this.duration = FoxMotion.countUp,
    this.formatter,
  });

  final int value;
  final TextStyle style;
  final Duration duration;
  final String Function(int)? formatter;

  @override
  Widget build(BuildContext context) {
    if (FoxMotion.reduced(context)) {
      return Text(formatter?.call(value) ?? "$value", style: style);
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: duration,
      curve: FoxMotion.easeOut,
      builder: (context, v, _) {
        final shown = v.round();
        return Text(formatter?.call(shown) ?? "$shown", style: style);
      },
    );
  }
}
