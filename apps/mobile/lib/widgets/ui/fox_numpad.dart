import "dart:math" as math;

import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";

/// Numeric keypad used by the phone, SMS and PIN screens.
class FoxNumpad extends StatelessWidget {
  const FoxNumpad({
    super.key,
    required this.onDigit,
    required this.onBackspace,
    this.onBiometric,
  });

  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback? onBiometric;

  @override
  Widget build(BuildContext context) {
    final rows = <List<String>>[
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      [onBiometric != null ? "bio" : "", "0", "del"],
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final row in rows)
            Row(
              children: [
                for (final key in row)
                  Expanded(
                    child: _Key(value: key, pad: this),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Key extends StatefulWidget {
  const _Key({required this.value, required this.pad});

  final String value;
  final FoxNumpad pad;

  @override
  State<_Key> createState() => _KeyState();
}

class _KeyState extends State<_Key> {
  bool _down = false;

  void _fire() {
    switch (widget.value) {
      case "":
        return;
      case "del":
        widget.pad.onBackspace();
      case "bio":
        widget.pad.onBiometric?.call();
      default:
        widget.pad.onDigit(widget.value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final empty = widget.value.isEmpty;
    final Widget child;
    switch (widget.value) {
      case "":
        child = const SizedBox(width: 28, height: 28);
      case "del":
        child = const Icon(
          Icons.backspace_outlined,
          size: 24,
          color: FoxTokens.textPrimary,
        );
      case "bio":
        child = const Icon(
          Icons.face_retouching_natural_outlined,
          size: 28,
          color: FoxTokens.textPrimary,
        );
      default:
        child = Text(
          widget.value,
          style: FoxType.bodyM.copyWith(
            fontSize: 28,
            color: FoxTokens.textPrimary,
          ),
        );
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: empty ? null : (_) => setState(() => _down = true),
      onTapUp: empty ? null : (_) => setState(() => _down = false),
      onTapCancel: empty ? null : () => setState(() => _down = false),
      onTap: empty ? null : _fire,
      child: AnimatedContainer(
        duration: _down ? FoxMotion.press : FoxMotion.release,
        curve: FoxMotion.easeOut,
        margin: const EdgeInsets.all(2),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: _down ? FoxTokens.bgGrey : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(child: child),
      ),
    );
  }
}

/// Four filled/empty dots used while entering a PIN.
class FoxPinDots extends StatelessWidget {
  const FoxPinDots({
    super.key,
    required this.filled,
    this.length = 4,
    this.error = false,
  });

  final int filled;
  final int length;
  final bool error;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      for (var i = 0; i < length; i++) ...[
        if (i > 0) const SizedBox(width: 18),
        AnimatedContainer(
          duration: const Duration(milliseconds: 140),
          curve: FoxMotion.easeOut,
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: i < filled
                ? (error ? FoxTokens.zoneRed : FoxTokens.textPrimary)
                : Colors.transparent,
            border: i < filled
                ? null
                : Border.all(color: FoxTokens.borderLight, width: 1.5),
          ),
        ),
      ],
    ],
  );
}

/// Horizontal shake used when a PIN or code is rejected.
class FoxShake extends StatefulWidget {
  const FoxShake({super.key, required this.child, required this.trigger});

  final Widget child;

  /// Increment to play the shake.
  final int trigger;

  @override
  State<FoxShake> createState() => _FoxShakeState();
}

class _FoxShakeState extends State<FoxShake>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 240),
  );

  @override
  void didUpdateWidget(covariant FoxShake oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.trigger != oldWidget.trigger) _c.forward(from: 0);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, child) {
      // Two damped oscillations of ±6 px.
      final t = _c.value;
      final dx = t == 0 ? 0.0 : 6 * (1 - t) * math.sin(t * 4 * math.pi);
      return Transform.translate(offset: Offset(dx, 0), child: child);
    },
    child: widget.child,
  );
}
