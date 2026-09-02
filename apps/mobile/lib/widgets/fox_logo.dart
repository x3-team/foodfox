import "package:flutter/material.dart";

/// Fox mark exported from Figma MVP Screens header (node `1:4`, 🦊).
class FoxLogo extends StatelessWidget {
  const FoxLogo({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      "assets/images/fox_logo.png",
      width: size,
      height: size,
      semanticLabel: "FoodFox",
    );
  }
}
