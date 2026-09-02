import "dart:convert";

import "package:foodfox/config/api_config.dart";
import "package:foodfox/models/models.dart";
import "package:http/http.dart" as http;

class FoodFoxApi {
  FoodFoxApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? _sessionCookie;

  Map<String, String> get _headers {
    final credentials = base64Encode(
      utf8.encode("${ApiConfig.basicUser}:${ApiConfig.basicPass}"),
    );
    final headers = {
      "Authorization": "Basic $credentials",
      "Accept": "application/json",
    };
    if (_sessionCookie != null) {
      headers["Cookie"] = "fox_session=$_sessionCookie";
    }
    return headers;
  }

  Uri _uri(String path) => Uri.parse("${ApiConfig.baseUrl}$path");

  void _captureSession(http.Response response) {
    final raw = response.headers["set-cookie"];
    if (raw == null) return;
    final match = RegExp(r"fox_session=([^;,\s]+)").firstMatch(raw);
    if (match != null) _sessionCookie = match.group(1);
  }

  Future<Map<String, dynamic>> _decode(http.Response response) async {
    _captureSession(response);
    final body = response.body.isEmpty ? "{}" : response.body;
    final data = jsonDecode(body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data["error"] as String? ?? "HTTP ${response.statusCode}");
    }
    return data;
  }

  bool get isLoggedIn => _sessionCookie != null;

  void setSessionCookie(String value) => _sessionCookie = value;

  void logout() => _sessionCookie = null;

  Future<UserProfile> login(String email, String password) async {
    final response = await _client.post(
      _uri("/api/auth/login"),
      headers: {..._headers, "Content-Type": "application/json"},
      body: jsonEncode({"email": email, "password": password}),
    );
    final data = await _decode(response);
    final user = data["user"] as Map<String, dynamic>;
    return UserProfile.fromJson(user);
  }

  Future<UserProfile> register(
    String email,
    String password,
    String displayName,
  ) async {
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
  }

  Future<({UserProfile user, ClientProfile profile})> fetchMe() async {
    final response = await _client.get(_uri("/api/auth/me"), headers: _headers);
    final data = await _decode(response);
    return (
      user: UserProfile.fromJson(data["user"] as Map<String, dynamic>),
      profile: ClientProfile.fromJson(data["profile"] as Map<String, dynamic>),
    );
  }

  Future<PlanData?> fetchPlan() async {
    final response = await _client.get(_uri("/api/plan"), headers: _headers);
    final data = await _decode(response);
    final planJson = data["plan"];
    if (planJson == null) return null;
    return PlanData.fromJson(planJson as Map<String, dynamic>);
  }

  Future<({List<ResultItem> results, ZoneCounts counts})> fetchResults() async {
    final response = await _client.get(_uri("/api/results"), headers: _headers);
    final data = await _decode(response);
    final results = (data["results"] as List<dynamic>)
        .map((e) => ResultItem.fromJson(e as Map<String, dynamic>))
        .toList();
    final counts = ZoneCounts.fromJson(data["counts"] as Map<String, dynamic>);
    return (results: results, counts: counts);
  }

  Future<({List<RecipeItem> recipes, int weekNumber})> fetchRecipes() async {
    final response = await _client.get(_uri("/api/recipes"), headers: _headers);
    final data = await _decode(response);
    final recipes = (data["recipes"] as List<dynamic>)
        .map((e) => RecipeItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return (recipes: recipes, weekNumber: data["weekNumber"] as int? ?? 1);
  }

  Future<List<ChatMessage>> fetchMessages() async {
    final response =
        await _client.get(_uri("/api/chat/messages"), headers: _headers);
    final data = await _decode(response);
    return (data["messages"] as List<dynamic>)
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> markChatRead() async {
    await _client.patch(_uri("/api/chat/unread"), headers: _headers);
  }

  Future<List<ChatMessage>> sendChat(String message) async {
    final response = await _client.post(
      _uri("/api/chat"),
      headers: {..._headers, "Content-Type": "application/json"},
      body: jsonEncode({"message": message}),
    );
    final data = await _decode(response);
    return (data["messages"] as List<dynamic>)
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> uploadPdf(List<int> bytes, String filename) async {
    final request = http.MultipartRequest("POST", _uri("/api/reports/upload"));
    request.headers.addAll(_headers);
    request.files.add(
      http.MultipartFile.fromBytes("file", bytes, filename: filename),
    );
    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    await _decode(response);
  }

  void dispose() => _client.close();
}
