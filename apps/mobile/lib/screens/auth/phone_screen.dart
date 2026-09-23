import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_numpad.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// A1 — phone entry. No password anywhere in the client flow.
class PhoneScreen extends StatefulWidget {
  const PhoneScreen({
    super.key,
    required this.onSubmit,
    this.onBack,
    this.error,
    this.busy = false,
    this.demoPhone,
  });

  final Future<void> Function(String phone) onSubmit;
  final VoidCallback? onBack;
  final String? error;
  final bool busy;

  /// Ten digits the review build can sign in with, or null in a real build.
  final String? demoPhone;

  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  String _digits = "";
  bool _consent = true;

  bool get _complete => _digits.length == 10;

  /// Spells out why «Получить код» is inactive — a disabled button with no
  /// explanation reads as a broken one.
  String? get _blockedReason {
    if (!_complete) {
      final left = 10 - _digits.length;
      return "Осталось ввести $left ${_plural(left)}";
    }
    if (!_consent) return "Подтвердите согласие на обработку данных";
    return null;
  }

  String _plural(int n) {
    if (n % 10 == 1 && n % 100 != 11) return "цифру";
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
      return "цифры";
    }
    return "цифр";
  }

  void _push(String d) {
    if (_digits.length >= 10) return;
    HapticFeedback.selectionClick();
    setState(() => _digits += d);
  }

  void _pop() {
    if (_digits.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() => _digits = _digits.substring(0, _digits.length - 1));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: foxStagger([
                    if (widget.onBack != null)
                      _BackButton(onTap: widget.onBack!)
                    else
                      const SizedBox(height: 40),
                    const SizedBox(height: 18),
                    const FoxScreenTitle(
                      title: "Ваш номер телефона",
                      subtitle: "Отправим код подтверждения в СМС. Пароль придумывать не нужно.",
                    ),
                    const SizedBox(height: 18),
                    _PhoneField(digits: _digits, error: widget.error != null),
                    if (widget.error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        widget.error!,
                        style: FoxType.captionS.copyWith(
                          color: FoxTokens.zoneRed,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    _Consent(
                      value: _consent,
                      onChanged: (v) => setState(() => _consent = v),
                    ),
                    if (widget.demoPhone != null) ...[
                      const SizedBox(height: 18),
                      _DemoHint(
                        phone: widget.demoPhone!,
                        onFill: () =>
                            setState(() => _digits = widget.demoPhone!),
                      ),
                    ],
                    const SizedBox(height: 18),
                  ]),
                ),
              ),
            ),
            // Pinned above the keypad: on short screens the scroll area
            // shrinks, and a call to action hidden below the fold reads as a
            // button that does nothing.
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  FoxButton(
                    label: "Получить код",
                    loading: widget.busy,
                    onPressed: _complete && _consent && !widget.busy
                        ? () => widget.onSubmit("7$_digits")
                        : null,
                  ),
                  if (_blockedReason != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _blockedReason!,
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            FoxNumpad(onDigit: _push, onBackspace: _pop),
          ],
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: onTap,
    child: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: FoxTokens.bgCard,
        shape: BoxShape.circle,
        border: Border.all(color: FoxTokens.borderLight),
      ),
      child: const Icon(
        Icons.arrow_back_ios_new_rounded,
        size: 16,
        color: FoxTokens.textPrimary,
      ),
    ),
  );
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({required this.digits, required this.error});

  final String digits;
  final bool error;

  /// Slot layout of a Russian mobile number: `999 123-45-67`.
  static const _groups = [3, 3, 2, 2];

  @override
  Widget build(BuildContext context) {
    final base = FoxType.bodyM.copyWith(
      fontSize: 22,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.5,
    );

    // The mask is rendered slot by slot so an empty field can never be
    // mistaken for a pre-filled number, and the caret sits on the next slot.
    final spans = <InlineSpan>[];
    var index = 0;
    for (var g = 0; g < _groups.length; g++) {
      if (g > 0) {
        spans.add(
          TextSpan(
            text: g == 1 ? " " : "-",
            style: base.copyWith(
              color: index <= digits.length
                  ? FoxTokens.textPrimary
                  : FoxTokens.textPlaceholder,
            ),
          ),
        );
      }
      for (var i = 0; i < _groups[g]; i++, index++) {
        final filled = index < digits.length;
        spans.add(
          TextSpan(
            text: filled ? digits[index] : "—",
            style: base.copyWith(
              color: filled ? FoxTokens.textPrimary : FoxTokens.textPlaceholder,
            ),
          ),
        );
        if (index == digits.length - 1 && digits.length < 10) {
          spans.add(
            const WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: _Caret(),
            ),
          );
        }
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: FoxTokens.bgCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: error ? FoxTokens.zoneRed : FoxTokens.textPrimary,
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Text("+7", style: base.copyWith(color: FoxTokens.textPrimary)),
          const SizedBox(width: 12),
          if (digits.isEmpty) const _Caret(),
          Expanded(child: Text.rich(TextSpan(children: spans))),
        ],
      ),
    );
  }
}

class _Caret extends StatefulWidget {
  const _Caret();

  @override
  State<_Caret> createState() => _CaretState();
}

class _CaretState extends State<_Caret> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1000),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: _c,
    child: Container(width: 2, height: 26, color: FoxTokens.accentLime),
  );
}

/// Review builds have no SMS gateway behind them, so the number the server
/// will accept is offered right here instead of being something to ask about.
class _DemoHint extends StatelessWidget {
  const _DemoHint({required this.phone, required this.onFill});

  final String phone;
  final VoidCallback onFill;

  String get _pretty =>
      "+7 ${phone.substring(0, 3)} ${phone.substring(3, 6)}"
      "-${phone.substring(6, 8)}-${phone.substring(8)}";

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: onFill,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: FoxTokens.zoneGreenBg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.science_outlined,
            size: 18,
            color: FoxTokens.zoneGreen,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Демо-доступ: $_pretty",
                  style: FoxType.label.copyWith(
                    color: FoxTokens.zoneGreen,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "Нажмите, чтобы подставить номер",
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.zoneGreen.withValues(alpha: 0.75),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _Consent extends StatelessWidget {
  const _Consent({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: () => onChanged(!value),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedContainer(
          duration: FoxMotion.quick,
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: value ? FoxTokens.zoneGreen : FoxTokens.bgCard,
            borderRadius: BorderRadius.circular(6),
            border: value
                ? null
                : Border.all(color: FoxTokens.borderLight, width: 1.5),
          ),
          child: value
              ? const Icon(
                  Icons.check_rounded,
                  size: 15,
                  color: FoxTokens.zoneGreenBg,
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            "Соглашаюсь с обработкой персональных данных "
            "и данных о здоровье (152-ФЗ)",
            style: FoxType.captionS.copyWith(
              color: FoxTokens.textSecondary,
              height: 17 / 12,
            ),
          ),
        ),
      ],
    ),
  );
}
