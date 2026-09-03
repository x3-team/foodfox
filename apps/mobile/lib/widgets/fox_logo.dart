import "package:flutter/material.dart";

/// Fox mark from Figma MVP Screens header (node `1:4`, 🦊).
class FoxLogo extends StatelessWidget {
  const FoxLogo({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: "FoodFox",
      child: Text(
        "🦊",
        style: TextStyle(fontSize: size * 0.92, height: 1),
      ),
    );
  }
}
