import "dart:async";

import "package:flutter/material.dart";
import "package:flutter/services.dart";

import "package:foodfox/app.dart";
import "package:foodfox/services/telemetry.dart";
import "package:foodfox/theme/fox_theme.dart";

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(foxSystemOverlay);
  unawaited(Telemetry.start());
  runApp(const FoodFoxApp());
}
