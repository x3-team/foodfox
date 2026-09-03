import "dart:convert";
import "dart:async";
import "dart:io";

import "package:foodfox/config/api_config.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/utils/api_cache.dart";
import "package:foodfox/utils/network_errors.dart";
import "package:http/http.dart" as http;

class FoodFoxApi {
  FoodFoxApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  final ApiCache _cache = ApiCache();
  String? _accessToken;
  String? _refreshToken;
  String? _sessionCookie;

  Map<String, String> get _headers {
    final credentials = base64Encode(
      utf8.encode("${ApiConfig.basicUser}:${ApiConfig.basicPass}"),
    );
    final headers = {
      "Authorization": "Basic $credentials",
      "Accept": "application/json",
    };
    if (_accessToken != null) {
      headers["X-Fox-Token"] = _accessToken!;
    } else if (_sessionCookie != null) {
      headers["Cookie"] = "fox_session=$_sessionCookie";
    }
    return headers;
  }

  Uri _uri(String path) => Uri.parse("${ApiConfig.baseUrl}$path");

  Future<T> _withRetry<T>(
    Future<T> Function() request, {
    int attempts = 3,
    Duration timeout = const Duration(seconds: 30),
  }) async {
    Object? lastError;
    for (var attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await request().timeout(timeout);
      } on SocketException catch (e) {
        lastError = e;
      } on http.ClientException catch (e) {
        lastError = e;
      } on TimeoutException catch (e) {
        lastError = e;
      }
      if (attempt < attempts) {
        await Future<void>.delayed(Duration(milliseconds: 350 * attempt));
      }
    }
    throw Exception(formatNetworkError(lastError ?? "Network error"));
  }

  void _captureSession(http.Response response) {
    final raw = response.headers["set-cookie"];
    if (raw == null) return;
    final match = RegExp(r"fox_session=([^;,\s]+)").firstMatch(raw);
    if (match != null) _sessionCookie = match.group(1);
  }

  void _captureTokens(Map<String, dynamic> data) {
    final access = data["accessToken"] as String?;
    final refresh = data["refreshToken"] as String?;
    if (access != null && access.isNotEmpty) _accessToken = access;
    if (refresh != null && refresh.isNotEmpty) _refreshToken = refresh;
  }

  Future<Map<String, dynamic>> _decode(http.Response response) async {
    _captureSession(response);
    final body = response.body.isEmpty ? "{}" : response.body;
    final data = jsonDecode(body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data["error"] as String? ?? "HTTP ${response.statusCode}");
    }
    _captureTokens(data);
    return data;
  }

  bool get isLoggedIn => _accessToken != null || _sessionCookie != null;

  void setAccessToken(String value) => _accessToken = value;

  void logout() {
    _accessToken = null;
    _refreshToken = null;
    _sessionCookie = null;
    _cache.clear();
  }

  void invalidateDataCache() => _cache.clear();

  Future<UserProfile> login(String email, String password) async {
    return _withRetry(() async {
      final response = await _client.post(
        _uri("/api/auth/login"),
        headers: {..._headers, "Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      );
      final data = await _decode(response);
      final user = data["user"] as Map<String, dynamic>;
      return UserProfile.fromJson(user);
    });
  }

  Future<UserProfile> register(
    String email,
    String password,
    String displayName,
  ) async {
    return _withRetry(() async {
      final response = await _client.post(
        _uri("/api/auth/register"),
        headers: {..._headers, "Content-Type": "application/json"},
        body: jsonEncode({
          "email": email,
          "password": password,
          "displayName": displayName,
        }),
      );
      final data = await _decode(response);
      final user = data["user"] as Map<String, dynamic>;
      return UserProfile.fromJson(user);
    });
  }

  Future<({UserProfile user, ClientProfile profile})> fetchMe() async {
    return _withRetry(() async {
      final response = await _client.get(_uri("/api/auth/me"), headers: _headers);
      final data = await _decode(response);
      return (
        user: UserProfile.fromJson(data["user"] as Map<String, dynamic>),
        profile: ClientProfile.fromJson(data["profile"] as Map<String, dynamic>),
      );
    });
  }

  Future<({
    PlanData? plan,
    List<PlanWeekItem> weekTabs,
    int currentWeek,
  })> fetchPlan({int? week, bool force = false}) async {
    final cacheKey = "plan:${week ?? "current"}";
    if (!force) {
      final cached = _cache.get<
          ({
            PlanData? plan,
            List<PlanWeekItem> weekTabs,
            int currentWeek,
          })>(cacheKey);
      if (cached != null) return cached;
    }

    final result = await _withRetry(() async {
      final path = week == null ? "/api/plan" : "/api/plan?week=$week";
      final response = await _client.get(_uri(path), headers: _headers);
      final data = await _decode(response);
      final planJson = data["plan"];
      final weekTabs = (data["weekTabs"] as List<dynamic>? ?? [])
          .map((e) => PlanWeekItem.fromJson(e as Map<String, dynamic>))
          .toList();
      final currentWeek = data["currentWeek"] as int? ?? 1;
      if (planJson == null) {
        return (plan: null, weekTabs: weekTabs, currentWeek: currentWeek);
      }
      return (
        plan: PlanData.fromJson(planJson as Map<String, dynamic>),
        weekTabs: weekTabs,
        currentWeek: currentWeek,
      );
    });

    _cache.set(cacheKey, result, ttl: const Duration(minutes: 10));
    return result;
  }

  Future<({List<ResultItem> results, ZoneCounts counts})> fetchResults({
    bool force = false,
  }) async {
    if (!force) {
      final cached =
          _cache.get<({List<ResultItem> results, ZoneCounts counts})>("results");
      if (cached != null) return cached;
    }

    final result = await _withRetry(() async {
      final response = await _client.get(_uri("/api/results"), headers: _headers);
      final data = await _decode(response);
      final results = (data["results"] as List<dynamic>)
          .map((e) => ResultItem.fromJson(e as Map<String, dynamic>))
          .toList();
      final counts = ZoneCounts.fromJson(data["counts"] as Map<String, dynamic>);
      return (results: results, counts: counts);
    });

    _cache.set("results", result, ttl: const Duration(minutes: 10));
    return result;
  }

  Future<({List<RecipeItem> recipes, int weekNumber, int suitableCount})> fetchRecipes({
    bool force = false,
  }) async {
    if (!force) {
      final cached = _cache.get<
          ({List<RecipeItem> recipes, int weekNumber, int suitableCount})>(
        "recipes",
      );
      if (cached != null) return cached;
    }

    final result = await _withRetry(() async {
      final response = await _client.get(_uri("/api/recipes"), headers: _headers);
      final data = await _decode(response);
      final recipes = (data["recipes"] as List<dynamic>)
          .map((e) => RecipeItem.fromJson(e as Map<String, dynamic>))
          .toList();
      return (
        recipes: recipes,
        weekNumber: data["weekNumber"] as int? ?? 1,
        suitableCount: data["suitableCount"] as int? ?? recipes.length,
      );
    });

    _cache.set("recipes", result, ttl: const Duration(minutes: 10));
    return result;
  }

  Future<List<ChatMessage>> fetchMessages({bool force = false}) async {
    if (!force) {
      final cached = _cache.get<List<ChatMessage>>("chat");
      if (cached != null) return cached;
    }

    final result = await _withRetry(() async {
      final response =
          await _client.get(_uri("/api/chat/messages"), headers: _headers);
      final data = await _decode(response);
      return (data["messages"] as List<dynamic>)
          .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
          .toList();
    });

    _cache.set("chat", result, ttl: const Duration(minutes: 2));
    return result;
  }

  Future<void> markChatRead() async {
    await _withRetry(() async {
      await _client.patch(_uri("/api/chat/unread"), headers: _headers);
    });
  }

  Future<List<ChatMessage>> sendChat(String message) async {
    return _withRetry(
      () async {
        final response = await _client.post(
          _uri("/api/chat"),
          headers: {..._headers, "Content-Type": "application/json"},
          body: jsonEncode({"message": message}),
        );
        final data = await _decode(response);
        final messages = (data["messages"] as List<dynamic>)
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        _cache.set("chat", messages, ttl: const Duration(minutes: 2));
        return messages;
      },
      attempts: 2,
      timeout: const Duration(seconds: 90),
    );
  }

  Future<void> uploadPdf(List<int> bytes, String filename) async {
    await _withRetry(() async {
      final request = http.MultipartRequest("POST", _uri("/api/reports/upload"));
      request.headers.addAll(_headers);
      request.files.add(
        http.MultipartFile.fromBytes("file", bytes, filename: filename),
      );
      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);
      await _decode(response);
      invalidateDataCache();
    });
  }

  void dispose() => _client.close();
}
