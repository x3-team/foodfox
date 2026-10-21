import "package:flutter_test/flutter_test.dart";

import "package:foodfox/config/api_config.dart";
import "package:foodfox/services/foodfox_api.dart";

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    "after the demo account signs out the next account gets the server",
    () async {
      final api = FoodFoxApi();
      await api.startDemoSession();
      expect(api.isDemo, isTrue);

      api.logout();
      expect(api.isDemo, isFalse);
      expect(api.isLoggedIn, isFalse);
    },
    // The demo needs the review build's credentials:
    // flutter test --dart-define=FOX_DEMO_PHONE=9251111111 --dart-define=FOX_DEMO_OTP=1111
    skip: ApiConfig.hasDemoCredentials ? false : "no demo credentials",
  );
}
