/// API endpoint and demo Basic Auth (nginx on foodfox.yuri.guru).
///
/// Override at build time:
///   flutter build apk --dart-define=FOX_API_BASE=https://foodfox.yuri.guru ...
class ApiConfig {
  static const baseUrl = String.fromEnvironment(
    "FOX_API_BASE",
    defaultValue: "https://foodfox.yuri.guru",
  );

  static const basicUser = String.fromEnvironment(
    "FOX_BASIC_USER",
    defaultValue: "demo",
  );

  static const basicPass = String.fromEnvironment(
    "FOX_BASIC_PASS",
    defaultValue: "FoodFox2026!",
  );

  /// Review builds are handed round without access to the SMS gateway, so they
  /// carry the credentials the server accepts and surface them in the UI.
  /// Both are empty in a normal build, which hides the hint entirely.
  static const demoPhone = String.fromEnvironment("FOX_DEMO_PHONE");
  static const demoOtp = String.fromEnvironment("FOX_DEMO_OTP");

  static bool get hasDemoCredentials =>
      demoPhone.length == 10 && demoOtp.isNotEmpty;
}
