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
}
