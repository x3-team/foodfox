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

class RecipeItem {
  RecipeItem({
    required this.id,
    required this.title,
    required this.description,
    required this.tags,
  });

  factory RecipeItem.fromJson(Map<String, dynamic> json) {
    return RecipeItem(
      id: json["id"] as String,
      title: json["title"] as String,
      description: json["description"] as String?,
      tags: (json["tags"] as List<dynamic>? ?? []).cast<String>(),
    );
  }

  final String id;
  final String title;
  final String? description;
  final List<String> tags;
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
  return "Жёлтая зона";
}
