import "dart:async";

import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_numpad.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// A2 — SMS confirmation code.
class SmsScreen extends StatefulWidget {
  const SmsScreen({
    super.key,
    required this.phone,
    required this.onSubmit,
    required this.onChangeNumber,
    required this.onResend,
    this.error,
    this.busy = false,
    this.demoCode,
    this.offlineNotice,
  });

  final String phone;
  final Future<void> Function(String code) onSubmit;
  final VoidCallback onChangeNumber;
  final Future<void> Function() onResend;
  final String? error;
  final bool busy;

  /// Code the review build can sign in with, or null in a real build.
  final String? demoCode;

  /// Set when the backend refused the request and the review build fell back
  /// to bundled data, so the screen can say so rather than imply an SMS.
  final String? offlineNotice;

  @override
  State<SmsScreen> createState() => _SmsScreenState();
}

class _SmsScreenState extends State<SmsScreen> {
  static const _length = 4;
  String _code = "";
  int _seconds = 42;
  int _shake = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant SmsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.error != null && widget.error != oldWidget.error) {
      setState(() {
        _shake++;
        _code = "";
      });
      HapticFeedback.heavyImpact();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _seconds = 42);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _seconds--);
      if (_seconds <= 0) t.cancel();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _push(String d) {
    if (_code.length >= _length || widget.busy) return;
    HapticFeedback.selectionClick();
    setState(() => _code += d);
    if (_code.length == _length) widget.onSubmit(_code);
  }

  void _pop() {
    if (_code.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() => _code = _code.substring(0, _code.length - 1));
  }

  String get _prettyPhone {
    final p = widget.phone;
    if (p.length != 11) return p;
    return "+7 ${p.substring(1, 4)} ${p.substring(4, 7)}-"
        "${p.substring(7, 9)}-${p.substring(9)}";
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.error != null;

    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Column(
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: FoxPressable(
                        onTap: widget.onChangeNumber,
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
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      "Код из СМС",
                      textAlign: TextAlign.center,
                      style: FoxType.h3.copyWith(
                        color: FoxTokens.textPrimary,
                        fontSize: 30,
                        height: 34 / 30,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.offlineNotice ?? "Отправили на $_prettyPhone",
                      textAlign: TextAlign.center,
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 26),
                    FoxShake(
                      trigger: _shake,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          for (var i = 0; i < _length; i++) ...[
                            if (i > 0) const SizedBox(width: 12),
                            _CodeBox(
                              value: i < _code.length ? _code[i] : null,
                              active: i == _code.length && !hasError,
                              error: hasError,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    if (hasError)
                      Text(
                        widget.error!,
                        style: FoxType.caption.copyWith(
                          color: FoxTokens.zoneRed,
                          fontWeight: FontWeight.w500,
                        ),
                      )
                    else if (widget.busy)
                      Text(
                        "Проверяем код…",
                        style: FoxType.caption.copyWith(
                          color: FoxTokens.textSecondary,
                        ),
                      )
                    else if (_seconds > 0)
                      Text(
                        "Отправить снова через 0:${_seconds.toString().padLeft(2, '0')}",
                        style: FoxType.caption.copyWith(
                          color: FoxTokens.textSecondary,
                        ),
                      )
                    else
                      FoxPressable(
                        onTap: () async {
                          await widget.onResend();
                          _startTimer();
                        },
                        child: Text(
                          "Отправить код ещё раз",
                          style: FoxType.caption.copyWith(
                            color: FoxTokens.zoneGreen,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    const SizedBox(height: 14),
                    FoxPressable(
                      onTap: widget.onChangeNumber,
                      child: Text(
                        "Изменить номер",
                        style: FoxType.caption.copyWith(
                          color: FoxTokens.zoneGreen,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    if (widget.demoCode != null) ...[
                      const SizedBox(height: 20),
                      _DemoCode(
                        code: widget.demoCode!,
                        onFill: () {
                          setState(() => _code = widget.demoCode!);
                          widget.onSubmit(widget.demoCode!);
                        },
                      ),
                    ],
                  ],
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

/// No SMS actually arrives in a review build, so the accepted code is on screen.
class _DemoCode extends StatelessWidget {
  const _DemoCode({required this.code, required this.onFill});

  final String code;
  final VoidCallback onFill;

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
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.science_outlined,
            size: 18,
            color: FoxTokens.zoneGreen,
          ),
          const SizedBox(width: 10),
          Text(
            "Демо-код: $code",
            style: FoxType.label.copyWith(
              color: FoxTokens.zoneGreen,
              fontSize: 14,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            "подставить",
            style: FoxType.captionS.copyWith(
              color: FoxTokens.zoneGreen.withValues(alpha: 0.75),
            ),
          ),
        ],
      ),
    ),
  );
}

class _CodeBox extends StatelessWidget {
  const _CodeBox({
    required this.value,
    required this.active,
    required this.error,
  });

  final String? value;
  final bool active;
  final bool error;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: FoxMotion.press,
    curve: FoxMotion.easeOut,
    width: 64,
    height: 72,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: FoxTokens.bgCard,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        color: error
            ? FoxTokens.zoneRed
            : active
            ? FoxTokens.textPrimary
            : FoxTokens.borderLight,
        width: active || error ? 1.5 : 1,
      ),
    ),
    child: value != null
        ? Text(
            value!,
            style: FoxType.bodyM.copyWith(
              fontSize: 28,
              color: error ? FoxTokens.zoneRed : FoxTokens.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          )
        : active
        ? Container(width: 2, height: 30, color: FoxTokens.accentLime)
        : null,
  );
}
