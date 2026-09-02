import "dart:math" as math;

import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";

Color zoneColor(Zone zone) => switch (zone) {
      Zone.green => FoxColors.green,
      Zone.yellow => FoxColors.yellow,
      Zone.red => FoxColors.red,
    };

class ZoneDonut extends StatelessWidget {
  const ZoneDonut({
    super.key,
    required this.counts,
    this.size = 132,
    this.strokeWidth = 14,
  });

  final ZoneCounts counts;
  final double size;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final total = counts.green + counts.yellow + counts.red;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _DonutPainter(counts: counts, strokeWidth: strokeWidth),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "$total",
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: FoxColors.text,
                  height: 1,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                "АНТИГЕНОВ",
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: FoxColors.muted,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({required this.counts, required this.strokeWidth});

  final ZoneCounts counts;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final total = counts.green + counts.yellow + counts.red;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = const Color(0xFFEEF2EC);
    canvas.drawCircle(center, radius, track);

    if (total == 0) return;

    var startAngle = -math.pi / 2;
    for (final zone in Zone.values) {
      final value = counts.forZone(zone);
      if (value == 0) continue;

      final sweep = (value / total) * 2 * math.pi;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = zoneColor(zone);

      // Small gap between segments keeps rounded caps from overlapping.
      final gap = sweep > 0.12 ? 0.05 : 0.0;
      canvas.drawArc(rect, startAngle + gap / 2, sweep - gap, false, paint);
      startAngle += sweep;
    }
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.counts.green != counts.green ||
      oldDelegate.counts.yellow != counts.yellow ||
      oldDelegate.counts.red != counts.red;
}
