import "dart:convert";

import "package:crypto/crypto.dart";
import "package:local_auth/local_auth.dart";
import "package:shared_preferences/shared_preferences.dart";

/// Local half of the auth flow: refresh token, PIN and the biometrics opt-in.
///
/// The PIN never leaves the device — only a salted SHA-256 digest is stored, so
/// a dump of shared preferences does not reveal the code itself.
class AuthStore {
  static const _kAccess = "fox.accessToken";
  static const _kRefresh = "fox.refreshToken";
  static const _kPinHash = "fox.pinHash";
  static const _kPinSalt = "fox.pinSalt";
  static const _kBiometrics = "fox.biometrics";
  static const _kPhone = "fox.phone";
  static const _kName = "fox.displayName";

  SharedPreferences? _prefs;

  Future<SharedPreferences> get _p async =>
      _prefs ??= await SharedPreferences.getInstance();

  Future<String?> get accessToken async => (await _p).getString(_kAccess);
  Future<String?> get refreshToken async => (await _p).getString(_kRefresh);
  Future<String?> get phone async => (await _p).getString(_kPhone);
  Future<String?> get displayName async => (await _p).getString(_kName);

  Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
    String? phone,
    String? displayName,
  }) async {
    final p = await _p;
    await p.setString(_kAccess, accessToken);
    if (refreshToken != null) await p.setString(_kRefresh, refreshToken);
    if (phone != null) await p.setString(_kPhone, phone);
    if (displayName != null) await p.setString(_kName, displayName);
  }

  Future<bool> get hasPin async => (await _p).getString(_kPinHash) != null;

  Future<void> setPin(String pin) async {
    final p = await _p;
    final salt = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    await p.setString(_kPinSalt, salt);
    await p.setString(_kPinHash, _digest(pin, salt));
  }

  Future<bool> verifyPin(String pin) async {
    final p = await _p;
    final salt = p.getString(_kPinSalt);
    final hash = p.getString(_kPinHash);
    if (salt == null || hash == null) return false;
    return _digest(pin, salt) == hash;
  }

  String _digest(String pin, String salt) =>
      sha256.convert(utf8.encode("$salt:$pin")).toString();

  Future<bool> get biometricsEnabled async =>
      (await _p).getBool(_kBiometrics) ?? false;

  Future<void> setBiometricsEnabled(bool value) async =>
      (await _p).setBool(_kBiometrics, value);

  /// Whether the device actually offers Face ID / fingerprint.
  Future<bool> biometricsAvailable() async {
    try {
      final auth = LocalAuthentication();
      return await auth.canCheckBiometrics || await auth.isDeviceSupported();
    } catch (_) {
      return false;
    }
  }

  /// Biometric unlock. Always falls back to the PIN when it fails.
  Future<bool> authenticateBiometric() async {
    try {
      final auth = LocalAuthentication();
      return await auth.authenticate(
        localizedReason: "Вход в FoodFox",
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );
    } catch (_) {
      return false;
    }
  }

  Future<void> clear() async {
    final p = await _p;
    for (final key in [
      _kAccess,
      _kRefresh,
      _kPinHash,
      _kPinSalt,
      _kBiometrics,
      _kPhone,
      _kName,
    ]) {
      await p.remove(key);
    }
  }
}
