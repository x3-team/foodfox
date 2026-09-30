import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_numpad.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

enum PinMode {
  /// A3 — choose a new PIN.
  create,

  /// A4 — repeat it.
  confirm,

  /// A5 — unlock on a later launch.
  unlock,
}

/// PIN entry. The code is stored only on the device; biometrics always fall
/// back to this screen.
class PinScreen extends StatefulWidget {
  const PinScreen({
    super.key,
    required this.mode,
    required this.onCompleted,
    this.onBack,
    this.onForgot,
    this.onBiometric,
    this.biometricAvailable = false,
    this.greeting,
  });

  final PinMode mode;

  /// Returns an error message to display, or null when the code is accepted.
  final Future<String?> Function(String pin) onCompleted;
  final VoidCallback? onBack;
  final VoidCallback? onForgot;
  final Future<void> Function()? onBiometric;
  final bool biometricAvailable;
  final String? greeting;

  @override
  State<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> {
  String _pin = "";
  String? _error;
  int _shake = 0;
  bool _busy = false;

  Future<void> _push(String d) async {
    if (_pin.length >= 4 || _busy) return;
    HapticFeedback.selectionClick();
    setState(() {
      _pin += d;
      _error = null;
    });
    if (_pin.length == 4) await _submit();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    final error = await widget.onCompleted(_pin);
    if (!mounted) return;
    if (error == null) {
      setState(() => _busy = false);
      return;
    }
    HapticFeedback.heavyImpact();
    setState(() {
      _error = error;
      _shake++;
      _busy = false;
    });
    await Future<void>.delayed(const Duration(milliseconds: 260));
    if (mounted) setState(() => _pin = "");
  }

  void _pop() {
    if (_pin.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  ({String title, String subtitle}) get _copy => switch (widget.mode) {
    PinMode.create => (
      title: "Придумайте пин-код",
      subtitle: "4 цифры — чтобы не запрашивать СМС при каждом входе",
    ),
    PinMode.confirm => (
      title: "Повторите пин-код",
      subtitle: "Введите те же 4 цифры ещё раз",
    ),
    PinMode.unlock => (
      title: widget.greeting ?? "С возвращением",
      subtitle: "Введите пин-код",
    ),
  };

  @override
  Widget build(BuildContext context) {
    final copy = _copy;
    final unlock = widget.mode == PinMode.unlock;

    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(24, unlock ? 40 : 8, 24, 0),
                child: Column(
                  children: [
                    if (!unlock)
                      Align(
                        alignment: Alignment.centerLeft,
                        child: widget.onBack == null
                            ? const SizedBox(height: 40)
                            : FoxPressable(
                                onTap: widget.onBack,
                                child: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: FoxTokens.bgCard,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: FoxTokens.borderLight,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.arrow_back_ios_new_rounded,
                                    size: 16,
                                    color: FoxTokens.textPrimary,
                                  ),
                                ),
                              ),
                      ),
                    if (unlock) ...[
                      Container(
                        width: 64,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: FoxTokens.bgGreen,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          "FOX",
                          style: FoxType.bodyS.copyWith(
                            color: FoxTokens.textInverted,
                            fontSize: 18,
                            letterSpacing: 0.5,
                            fontWeight: FontWeight.w800,
                            fontVariations: const [FontVariation("wght", 800)],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ] else
                      const SizedBox(height: 18),
                    Text(
                      copy.title,
                      textAlign: TextAlign.center,
                      style: FoxType.h3.copyWith(
                        color: FoxTokens.textPrimary,
                        fontSize: unlock ? 26 : 30,
                        height: 1.14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      copy.subtitle,
                      textAlign: TextAlign.center,
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 28),
                    FoxShake(
                      trigger: _shake,
                      child: FoxPinDots(
                        filled: _pin.length,
                        error: _error != null,
                      ),
                    ),
                    const SizedBox(height: 18),
                    if (_error != null)
                      Text(
                        _error!,
                        textAlign: TextAlign.center,
                        style: FoxType.caption.copyWith(
                          color: FoxTokens.zoneRed,
                          fontWeight: FontWeight.w500,
                        ),
                      )
                    else if (widget.mode == PinMode.create)
                      FoxCard(
                        tone: FoxCardTone.grey,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 13,
                        ),
                        child: Text(
                          "Пин-код хранится только на устройстве "
                          "и не передаётся на сервер",
                          textAlign: TextAlign.center,
                          style: FoxType.captionS.copyWith(
                            color: FoxTokens.textSecondary,
                            height: 17 / 12,
                          ),
                        ),
                      )
                    else if (unlock && widget.onForgot != null)
                      FoxPressable(
                        onTap: widget.onForgot,
                        child: Text(
                          "Забыли пин-код? Войти по СМС",
                          style: FoxType.caption.copyWith(
                            color: FoxTokens.zoneGreen,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            FoxNumpad(
              onDigit: _push,
              onBackspace: _pop,
              onBiometric: unlock && widget.biometricAvailable
                  ? () => widget.onBiometric?.call()
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
