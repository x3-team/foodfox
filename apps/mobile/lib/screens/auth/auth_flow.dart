import "package:flutter/material.dart";

import "package:foodfox/config/api_config.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/screens/auth/phone_screen.dart";
import "package:foodfox/screens/auth/pin_screen.dart";
import "package:foodfox/screens/auth/sms_screen.dart";
import "package:foodfox/screens/onboarding_screen.dart";
import "package:foodfox/services/auth_store.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";

enum _Step { onboarding, phone, sms, pinCreate, pinConfirm }

/// Drives the sign-in sequence: onboarding → phone → SMS → PIN → app.
class AuthFlow extends StatefulWidget {
  const AuthFlow({
    super.key,
    required this.api,
    required this.store,
    required this.onAuthenticated,
  });

  final FoodFoxApi api;
  final AuthStore store;
  final VoidCallback onAuthenticated;

  @override
  State<AuthFlow> createState() => _AuthFlowState();
}

class _AuthFlowState extends State<AuthFlow> {
  _Step _step = _Step.onboarding;
  String _phone = "";
  String _firstPin = "";
  String? _error;
  bool _busy = false;

  /// True while the review build is signing in against bundled data because
  /// the backend could not take the request.
  bool _offlineDemo = false;

  bool _isDemoPhone(String phone) =>
      ApiConfig.hasDemoCredentials && phone == "7${ApiConfig.demoPhone}";

  Future<void> _requestCode(String phone) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.requestOtp(phone);
      if (!mounted) return;
      setState(() {
        _phone = phone;
        _offlineDemo = false;
        _step = _Step.sms;
        _busy = false;
      });
    } catch (e) {
      if (!mounted) return;
      // The demo account is meant for reviewing the app, so an unreachable or
      // out-of-date backend must not be the thing that blocks it.
      if (_isDemoPhone(phone)) {
        setState(() {
          _phone = phone;
          _offlineDemo = true;
          _step = _Step.sms;
          _busy = false;
        });
        return;
      }
      setState(() {
        _error = _clean(e);
        _busy = false;
      });
    }
  }

  Future<void> _verifyCode(String code) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final profile = _offlineDemo
          ? await _verifyOffline(code)
          : await widget.api.verifyOtp(_phone, code);
      await widget.store.saveSession(
        // The demo session has no token; a placeholder keeps the warm-start
        // path, which only checks for a stored session, working.
        accessToken: widget.api.accessToken ?? (_offlineDemo ? "demo" : ""),
        refreshToken: widget.api.refreshTokenValue,
        phone: _phone,
        displayName: profile.displayName,
        demo: _offlineDemo,
      );
      if (!mounted) return;
      setState(() {
        _step = _Step.pinCreate;
        _busy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = _clean(e);
        _busy = false;
      });
    }
  }

  Future<UserProfile> _verifyOffline(String code) async {
    if (code != ApiConfig.demoOtp) {
      throw Exception(
        "Неверный код — в демо-режиме подходит только ${ApiConfig.demoOtp}",
      );
    }
    return widget.api.startDemoSession();
  }

  String _clean(Object e) =>
      e.toString().replaceFirst("Exception: ", "").trim();

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: FoxMotion.base,
      switchInCurve: FoxMotion.easeOut,
      switchOutCurve: FoxMotion.easeOut,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0.04, 0),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: KeyedSubtree(key: ValueKey(_step), child: _current()),
    );
  }

  Widget _current() {
    switch (_step) {
      case _Step.onboarding:
        return OnboardingScreen(
          onStart: () => setState(() => _step = _Step.phone),
        );

      case _Step.phone:
        return PhoneScreen(
          busy: _busy,
          error: _error,
          demoPhone: ApiConfig.hasDemoCredentials ? ApiConfig.demoPhone : null,
          onBack: () => setState(() {
            _step = _Step.onboarding;
            _error = null;
          }),
          onSubmit: _requestCode,
        );

      case _Step.sms:
        return SmsScreen(
          phone: _phone,
          busy: _busy,
          error: _error,
          demoCode: ApiConfig.hasDemoCredentials ? ApiConfig.demoOtp : null,
          offlineNotice: _offlineDemo
              ? "Сервер недоступен — вход в демо-режиме с тестовыми данными"
              : null,
          onSubmit: _verifyCode,
          onResend: () => widget.api.requestOtp(_phone),
          onChangeNumber: () => setState(() {
            _step = _Step.phone;
            _error = null;
          }),
        );

      case _Step.pinCreate:
        return PinScreen(
          mode: PinMode.create,
          onCompleted: (pin) async {
            _firstPin = pin;
            setState(() => _step = _Step.pinConfirm);
            return null;
          },
        );

      case _Step.pinConfirm:
        return PinScreen(
          mode: PinMode.confirm,
          onBack: () => setState(() => _step = _Step.pinCreate),
          onCompleted: (pin) async {
            if (pin != _firstPin) {
              return "Коды не совпадают — попробуйте ещё раз";
            }
            await widget.store.setPin(pin);
            if (await widget.store.biometricsAvailable()) {
              await widget.store.setBiometricsEnabled(true);
            }
            widget.onAuthenticated();
            return null;
          },
        );
    }
  }
}

/// Lock screen shown on a warm start when a PIN already exists.
class UnlockGate extends StatefulWidget {
  const UnlockGate({
    super.key,
    required this.store,
    required this.onUnlocked,
    required this.onForgot,
  });

  final AuthStore store;
  final VoidCallback onUnlocked;
  final VoidCallback onForgot;

  @override
  State<UnlockGate> createState() => _UnlockGateState();
}

class _UnlockGateState extends State<UnlockGate> {
  bool _biometricAvailable = false;
  String? _name;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  Future<void> _prepare() async {
    final enabled = await widget.store.biometricsEnabled;
    final available = enabled && await widget.store.biometricsAvailable();
    final name = await widget.store.displayName;
    if (!mounted) return;
    setState(() {
      _biometricAvailable = available;
      _name = name;
    });
    if (available) await _tryBiometric();
  }

  Future<void> _tryBiometric() async {
    final ok = await widget.store.authenticateBiometric();
    if (ok && mounted) widget.onUnlocked();
  }

  @override
  Widget build(BuildContext context) => PinScreen(
    mode: PinMode.unlock,
    greeting: _name == null || _name!.isEmpty
        ? "С возвращением"
        : "С возвращением, $_name",
    biometricAvailable: _biometricAvailable,
    onBiometric: _tryBiometric,
    onForgot: widget.onForgot,
    onCompleted: (pin) async {
      final ok = await widget.store.verifyPin(pin);
      if (ok) {
        widget.onUnlocked();
        return null;
      }
      return "Неверный пин-код";
    },
  );
}
