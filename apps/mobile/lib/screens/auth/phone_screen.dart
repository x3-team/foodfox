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
  });

  final Future<void> Function(String phone) onSubmit;
  final VoidCallback? onBack;
  final String? error;
  final bool busy;

  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  String _digits = "";
  bool _consent = true;

  bool get _complete => _digits.length == 10;

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

  String get _formatted {
    final b = StringBuffer();
    for (var i = 0; i < _digits.length; i++) {
      if (i == 3 || i == 6 || i == 8) b.write(i == 3 ? " " : "-");
      b.write(_digits[i]);
    }
    return b.toString();
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
                      subtitle:
                          "Отправим код подтверждения в СМС. Пароль придумывать не нужно.",
                    ),
                    const SizedBox(height: 18),
                    _PhoneField(text: _formatted, error: widget.error != null),
                    if (widget.error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        widget.error!,
                        style: FoxType.captionS
                            .copyWith(color: FoxTokens.zoneRed),
                      ),
                    ],
                    const SizedBox(height: 18),
                    _Consent(
                      value: _consent,
                      onChanged: (v) => setState(() => _consent = v),
                    ),
                    const SizedBox(height: 18),
                    FoxButton(
                      label: "Получить код",
                      loading: widget.busy,
                      onPressed: _complete && _consent && !widget.busy
                          ? () => widget.onSubmit("7$_digits")
                          : null,
                    ),
                  ]),
                ),
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
          child: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 16, color: FoxTokens.textPrimary),
        ),
      );
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({required this.text, required this.error});

  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) => Container(
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
            Text(
              "+7",
              style: FoxType.bodyM.copyWith(
                fontSize: 22,
                color: FoxTokens.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text.isEmpty ? "999 123-45-67" : text,
                style: FoxType.bodyM.copyWith(
                  fontSize: 22,
                  color: text.isEmpty
                      ? FoxTokens.textSecondary
                      : FoxTokens.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const _Caret(),
          ],
        ),
      );
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
                  ? const Icon(Icons.check_rounded,
                      size: 15, color: FoxTokens.zoneGreenBg)
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
