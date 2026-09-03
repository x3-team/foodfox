enum Zone { green, yellow, red }

class ResultItem {
  ResultItem({
    required this.id,
    required this.foxName,
    required this.valueUgMl,
    required this.isFloorValue,
    required this.zone,
  });

  factory ResultItem.fromJson(Map<String, dynamic> json) {
    return ResultItem(
      id: json["id"] as String,
      foxName: json["foxName"] as String,
      valueUgMl: (json["valueUgMl"] as num?)?.toDouble(),
      isFloorValue: json["isFloorValue"] as bool? ?? false,
      zone: _zoneFromString(json["zone"] as String),
    );
  }

  final String id;
  final String foxName;
  final double? valueUgMl;
  final bool isFloorValue;
  final Zone zone;
}

class ZoneCounts {
  ZoneCounts({required this.green, required this.yellow, required this.red});

  factory ZoneCounts.fromJson(Map<String, dynamic> json) {
    return ZoneCounts(
      green: json["green"] as int? ?? 0,
      yellow: json["yellow"] as int? ?? 0,
      red: json["red"] as int? ?? 0,
    );
  }

  final int green;
  final int yellow;
  final int red;

  int forZone(Zone zone) {
    switch (zone) {
      case Zone.green:
        return green;
      case Zone.yellow:
        return yellow;
      case Zone.red:
        return red;
    }
  }
}

class RecipeStep {
  RecipeStep({
    required this.title,
    required this.body,
    this.imageUrl,
  });

  factory RecipeStep.fromJson(dynamic json, {int index = 0}) {
    if (json is String) {
      return RecipeStep(title: "Шаг ${index + 1}", body: json);
    }
    final map = json as Map<String, dynamic>;
    return RecipeStep(
      title: map["title"] as String? ?? "Шаг ${index + 1}",
      body: map["body"] as String? ?? "",
      imageUrl: map["imageUrl"] as String?,
    );
  }

  final String title;
  final String body;
  final String? imageUrl;
}

class RecipeIngredient {
  RecipeIngredient({required this.name, required this.amount});

  factory RecipeIngredient.fromJson(Map<String, dynamic> json) {
    return RecipeIngredient(
      name: json["name"] as String,
      amount: json["amount"] as String? ?? "",
    );
  }

  final String name;
  final String amount;
}

class RecipeZoneIngredient {
  RecipeZoneIngredient({required this.name, required this.zone});

  factory RecipeZoneIngredient.fromJson(Map<String, dynamic> json) {
    return RecipeZoneIngredient(
      name: json["name"] as String,
      zone: json["zone"] as String? ?? "green",
    );
  }

  final String name;
  final String zone;
}

class RecipeItem {
  RecipeItem({
    required this.id,
    required this.title,
    required this.description,
    required this.tags,
    this.lead,
    this.photoUrl,
    this.prepTime,
    this.cookTime,
    this.servings,
    this.steps = const [],
    this.tips = const [],
    this.ingredientsList = const [],
    this.ingredients = const [],
    this.suitable = true,
    this.allGreen = false,
    this.warnings = const [],
  });

  factory RecipeItem.fromJson(Map<String, dynamic> json) {
    final rawSteps = json["steps"] as List<dynamic>? ?? [];
    return RecipeItem(
      id: json["id"] as String,
      title: json["title"] as String,
      description: json["description"] as String?,
      lead: json["lead"] as String?,
      photoUrl: json["photoUrl"] as String?,
      prepTime: json["prepTime"] as String?,
      cookTime: json["cookTime"] as String?,
      servings: json["servings"] as int?,
      tags: (json["tags"] as List<dynamic>? ?? []).cast<String>(),
      steps: [
        for (var i = 0; i < rawSteps.length; i++)
          RecipeStep.fromJson(rawSteps[i], index: i),
      ],
      tips: (json["tips"] as List<dynamic>? ?? []).cast<String>(),
      ingredientsList: (json["ingredientsList"] as List<dynamic>? ?? [])
          .map((e) => RecipeIngredient.fromJson(e as Map<String, dynamic>))
          .toList(),
      ingredients: (json["ingredients"] as List<dynamic>? ?? [])
          .map((e) => RecipeZoneIngredient.fromJson(e as Map<String, dynamic>))
          .toList(),
      suitable: json["suitable"] as bool? ?? true,
      allGreen: json["allGreen"] as bool? ?? false,
      warnings: (json["warnings"] as List<dynamic>? ?? []).cast<String>(),
    );
  }

  final String id;
  final String title;
  final String? description;
  final String? lead;
  final String? photoUrl;
  final String? prepTime;
  final String? cookTime;
  final int? servings;
  final List<String> tags;
  final List<RecipeStep> steps;
  final List<String> tips;
  final List<RecipeIngredient> ingredientsList;
  final List<RecipeZoneIngredient> ingredients;
  final bool suitable;
  final bool allGreen;
  final List<String> warnings;
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.role,
    required this.messageType,
    required this.content,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json["id"] as String,
      role: json["role"] as String,
      messageType: json["messageType"] as String? ?? "chat",
      content: json["content"] as String,
    );
  }

  final String id;
  final String role;
  final String messageType;
  final String content;

  bool get isUser => role == "user";
  bool get isReminder => messageType == "daily_reminder";
}

Zone _zoneFromString(String value) {
  switch (value) {
    case "yellow":
      return Zone.yellow;
    case "red":
      return Zone.red;
    default:
      return Zone.green;
  }
}

String formatValue(double? value, bool isFloor) {
  if (isFloor || value == null) return "<10 µg/ml";
  if (value % 1 == 0) return "${value.toInt()} µg/ml";
  return "${value.toStringAsFixed(1)} µg/ml";
}

String getWeekPhase(int weekNumber) {
  if (weekNumber <= 4) return "Элиминация";
  if (weekNumber <= 6) return "Стабилизация";
  return "Расширение";
}

class UserProfile {
  UserProfile({required this.email, required this.displayName});

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      email: json["email"] as String,
      displayName: json["displayName"] as String? ?? "Клиент",
    );
  }

  final String email;
  final String displayName;
}

class ClientProfile {
  ClientProfile({
    required this.hasReport,
    required this.parsedCount,
    required this.currentWeek,
    this.planStartedAt,
  });

  factory ClientProfile.fromJson(Map<String, dynamic> json) {
    return ClientProfile(
      hasReport: json["hasReport"] as bool? ?? false,
      parsedCount: json["parsedCount"] as int? ?? 0,
      currentWeek: json["currentWeek"] as int? ?? 1,
      planStartedAt: json["planStartedAt"] as String?,
    );
  }

  final bool hasReport;
  final int parsedCount;
  final int currentWeek;
  final String? planStartedAt;
}

class PlanDayItem {
  PlanDayItem({
    required this.date,
    required this.weekNumber,
    required this.allowed,
    required this.forbidden,
    required this.isToday,
    this.botMessage,
  });

  factory PlanDayItem.fromJson(Map<String, dynamic> json) {
    return PlanDayItem(
      date: json["date"] as String,
      weekNumber: json["weekNumber"] as int,
      allowed: (json["allowed"] as List<dynamic>? ?? []).cast<String>(),
      forbidden: (json["forbidden"] as List<dynamic>? ?? []).cast<String>(),
      isToday: json["isToday"] as bool? ?? false,
      botMessage: json["botMessage"] as String?,
    );
  }

  final String date;
  final int weekNumber;
  final List<String> allowed;
  final List<String> forbidden;
  final bool isToday;
  final String? botMessage;
}

class PlanWeekItem {
  PlanWeekItem({
    required this.weekNumber,
    required this.phase,
    required this.days,
  });

  factory PlanWeekItem.fromJson(Map<String, dynamic> json) {
    return PlanWeekItem(
      weekNumber: json["weekNumber"] as int,
      phase: json["phase"] as String? ?? "",
      days: (json["days"] as List<dynamic>? ?? [])
          .map((e) => PlanDayItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final int weekNumber;
  final String phase;
  final List<PlanDayItem> days;
}

class PlanData {
  PlanData({
    required this.planId,
    required this.startedAt,
    required this.weeks,
  });

  factory PlanData.fromJson(Map<String, dynamic> json) {
    return PlanData(
      planId: json["planId"] as String,
      startedAt: json["startedAt"] as String,
      weeks: (json["weeks"] as List<dynamic>)
          .map((e) => PlanWeekItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final String planId;
  final String startedAt;
  final List<PlanWeekItem> weeks;
}
