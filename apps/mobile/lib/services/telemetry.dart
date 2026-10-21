import "dart:async";

import "package:appmetrica_plugin/appmetrica_plugin.dart";
import "package:flutter/foundation.dart";
import "package:flutter/widgets.dart";

import "package:foodfox/config/api_config.dart";

/// Crash reports and product analytics through AppMetrica (docs/MONITORING.md).
///
/// Off unless the build carries `--dart-define=FOX_APPMETRICA_KEY=…`, so local
/// runs, tests and builds without the key send nothing and touch no plugin.
///
/// What may go out: event names from [FoxEvent], counts, durations, coarse
/// buckets and short enum-like strings. What may not: phone numbers, names,
/// report values, zones, chat text, file names. [cleanParams] drops any string that
/// looks like it could carry one of those, so a careless call site fails safe.
class Telemetry {
  Telemetry._();

  static const _apiKey = String.fromEnvironment("FOX_APPMETRICA_KEY");

  static bool _active = false;
  static bool get enabled => _active;
  static bool _demo = false;

  /// Called once from main(), without awaiting: the splash must not wait on it.
  static Future<void> start() async {
    if (_apiKey.isEmpty || _active) return;
    try {
      await AppMetrica.activate(
        const AppMetricaConfig(
          _apiKey,
          crashReporting: true,
          nativeCrashReporting: true,
          // Installs FlutterError.onError for errors inside the framework.
          flutterCrashReporting: true,
          locationTracking: false,
          advIdentifiersTracking: false,
          revenueAutoTrackingEnabled: false,
          logs: kDebugMode,
        ),
      );
      _active = true;
      if (_demo) setDemo(true);
      // Errors outside the framework: async gaps, platform channels, isolates.
      final previous = PlatformDispatcher.instance.onError;
      PlatformDispatcher.instance.onError = (error, stack) {
        _report(error, stack, fatal: true);
        return previous?.call(error, stack) ?? false;
      };
      unawaited(
        AppMetrica.putErrorEnvironmentValue(
          "api_host",
          Uri.parse(ApiConfig.baseUrl).host,
        ),
      );
    } catch (e) {
      debugPrint("AppMetrica activation failed: $e");
    }
  }

  /// Marks the session as the bundled demo so the funnel can leave it out.
  static void setDemo(bool demo) {
    _demo = demo;
    if (!_active) return;
    unawaited(AppMetrica.putAppEnvironmentValue("demo", demo ? "1" : null));
    unawaited(AppMetrica.putErrorEnvironmentValue("demo", demo ? "1" : null));
  }

  static void event(String name, [Map<String, Object?> params = const {}]) {
    if (!_active) return;
    final clean = cleanParams(params);
    unawaited(
      clean.isEmpty
          ? AppMetrica.reportEvent(name)
          : AppMetrica.reportEventWithMap(name, clean),
    );
  }

  static void screen(String name) =>
      event(FoxEvent.screenView, {"screen": name});

  /// A handled failure worth seeing next to crashes.
  static void error(Object error, StackTrace? stack, {String? group}) =>
      _report(error, stack, group: group);

  /// A 5xx from the API. The server logs the same [requestId]
  /// (`x-request-id`), which is how one failure is found on both sides.
  static void apiFailure({
    required String method,
    required String path,
    required int status,
    String? requestId,
  }) {
    if (!_active) return;
    final message =
        "HTTP $status $method $path"
        "${requestId == null ? "" : " request_id=$requestId"}";
    unawaited(
      AppMetrica.reportErrorWithGroup(
        "api $status $method $path",
        message: message,
        errorDescription: AppMetricaErrorDescription.fromCurrentStackTrace(
          message: message,
          type: "ApiFailure",
        ),
      ),
    );
  }

  static void _report(
    Object error,
    StackTrace? stack, {
    bool fatal = false,
    String? group,
  }) {
    if (!_active) return;
    final description = AppMetricaErrorDescription(
      stack ?? StackTrace.current,
      message: error.toString(),
      type: error.runtimeType.toString(),
    );
    final Future<void> sent;
    if (fatal) {
      sent = AppMetrica.reportUnhandledException(description);
    } else if (group != null) {
      sent = AppMetrica.reportErrorWithGroup(
        group,
        errorDescription: description,
      );
    } else {
      sent = AppMetrica.reportError(errorDescription: description);
    }
    unawaited(sent.catchError((_) {}));
  }

  static final _risky = RegExp(r"\d{5,}|@|\s{2,}");

  @visibleForTesting
  static Map<String, Object> cleanParams(Map<String, Object?> params) {
    final out = <String, Object>{};
    params.forEach((key, value) {
      if (value is num || value is bool) {
        out[key] = value!;
      } else if (value is String &&
          value.isNotEmpty &&
          value.length <= 40 &&
          !_risky.hasMatch(value)) {
        out[key] = value;
      }
    });
    return out;
  }
}

/// Event names. The new client funnel in AppMetrica is built from these, in
/// order: signInCompleted → uploadOpened → uploadFileChosen →
/// processingSucceeded → resultsViewed → planViewed / chatMessageSent.
abstract final class FoxEvent {
  static const screenView = "screen_view";

  // Sign-in
  static const onboardingStart = "onboarding_start";
  static const otpRequested = "otp_requested";
  static const otpRequestFailed = "otp_request_failed";
  static const otpVerified = "otp_verified";
  static const otpFailed = "otp_failed";
  static const signInCompleted = "signin_completed";
  static const unlocked = "unlocked";
  static const signedOut = "signed_out";

  // Report
  static const uploadOpened = "upload_opened";
  static const uploadFileChosen = "upload_file_chosen";
  static const uploadRejected = "upload_rejected";
  static const uploadPhotoAsked = "upload_photo_asked";
  static const processingStarted = "processing_started";
  static const processingSucceeded = "processing_succeeded";
  static const processingFailed = "processing_failed";
  static const processingRetry = "processing_retry";
  static const resultsViewed = "results_viewed";

  // Plan and assistant
  static const planViewed = "plan_viewed";
  static const chatOpened = "chat_opened";
  static const chatMessageSent = "chat_message_sent";
  static const askAssistant = "ask_assistant";
  static const recipeOpened = "recipe_opened";

  static const apiNetworkError = "api_network_error";
}

/// Reports pushed routes as screens. Tabs are reported by the shell.
class TelemetryRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    final name = route.settings.name;
    if (name != null && name != "/") Telemetry.screen(name);
  }
}

/// Size bucket for an uploaded file, so the exact size never leaves.
String sizeBucket(int bytes) {
  const mb = 1024 * 1024;
  if (bytes < mb) return "<1MB";
  if (bytes < 5 * mb) return "1-5MB";
  if (bytes < 10 * mb) return "5-10MB";
  return ">10MB";
}
