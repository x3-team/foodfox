import "dart:math" as math;

import "package:flutter/widgets.dart";

/// Tab-bar iconography drawn to match the Figma set exactly.
enum FoxIconKind { report, plan, chat, recipes, profile }

class FoxIcon extends StatelessWidget {
  const FoxIcon({
    super.key,
    required this.kind,
    required this.color,
    this.size = 24,
    this.filled = false,
  });

  final FoxIconKind kind;
  final Color color;
  final double size;
  final bool filled;

  @override
  Widget build(BuildContext context) => CustomPaint(
    size: Size.square(size),
    painter: _FoxIconPainter(kind: kind, color: color, filled: filled),
  );
}

class _FoxIconPainter extends CustomPainter {
  _FoxIconPainter({
    required this.kind,
    required this.color,
    required this.filled,
  });

  final FoxIconKind kind;
  final Color color;
  final bool filled;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    canvas.save();
    canvas.scale(s);

    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = color;
    final fill = Paint()
      ..style = PaintingStyle.fill
      ..color = color;

    switch (kind) {
      case FoxIconKind.report:
        canvas.drawCircle(const Offset(12, 12), 8.5, stroke);
        final wedge = Path()
          ..moveTo(12, 12)
          ..lineTo(12, 3.5)
          ..arcToPoint(
            const Offset(20.5, 12),
            radius: const Radius.circular(8.5),
          )
          ..close();
        canvas.drawPath(wedge, fill);

      case FoxIconKind.plan:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(3.5, 5, 17, 15.5),
            const Radius.circular(3),
          ),
          stroke,
        );
        canvas.drawLine(const Offset(8, 3), const Offset(8, 7), stroke);
        canvas.drawLine(const Offset(16, 3), const Offset(16, 7), stroke);
        canvas.drawLine(
          const Offset(3.5, 10.5),
          const Offset(20.5, 10.5),
          stroke,
        );
        if (filled) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              const Rect.fromLTWH(7, 13.5, 4, 4),
              const Radius.circular(1),
            ),
            fill,
          );
        }

      case FoxIconKind.chat:
        final bubble = Path()
          ..moveTo(20.5, 11.5)
          ..cubicTo(20.5, 15.6, 16.7, 18.9, 12, 18.9)
          ..cubicTo(11, 18.9, 10, 18.75, 9.1, 18.48)
          ..lineTo(4.2, 20.2)
          ..lineTo(5.5, 16.7)
          ..cubicTo(4.2, 15.3, 3.5, 13.5, 3.5, 11.5)
          ..cubicTo(3.5, 7.4, 7.3, 4.1, 12, 4.1)
          ..cubicTo(16.7, 4.1, 20.5, 7.4, 20.5, 11.5)
          ..close();
        canvas.drawPath(bubble, stroke);
        final spark = Path()
          ..moveTo(12, 7.6)
          ..lineTo(12.85, 9.65)
          ..lineTo(14.9, 10.5)
          ..lineTo(12.85, 11.35)
          ..lineTo(12, 13.4)
          ..lineTo(11.15, 11.35)
          ..lineTo(9.1, 10.5)
          ..lineTo(11.15, 9.65)
          ..close();
        canvas.drawPath(spark, fill);

      case FoxIconKind.recipes:
        final book = Path()
          ..moveTo(4.5, 5.5)
          ..cubicTo(4.5, 4.1, 5.6, 3, 7, 3)
          ..lineTo(19.5, 3)
          ..lineTo(19.5, 18)
          ..lineTo(7, 18)
          ..cubicTo(5.6, 18, 4.5, 19.1, 4.5, 20.5)
          ..close();
        canvas.drawPath(book, stroke);
        final spine = Path()
          ..moveTo(4.5, 20.5)
          ..cubicTo(4.5, 19.1, 5.6, 18, 7, 18)
          ..lineTo(19.5, 18)
          ..lineTo(19.5, 21)
          ..lineTo(7, 21);
        canvas.drawPath(spine, stroke);
        canvas.drawLine(const Offset(9, 7.5), const Offset(15, 7.5), stroke);

      case FoxIconKind.profile:
        canvas.drawCircle(const Offset(12, 8.5), 3.8, stroke);
        final body = Path()
          ..moveTo(4.8, 20)
          ..cubicTo(5.7, 16.4, 8.6, 14.4, 12, 14.4)
          ..cubicTo(15.4, 14.4, 18.3, 16.4, 19.2, 20);
        canvas.drawPath(body, stroke);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _FoxIconPainter old) =>
      old.color != color || old.kind != kind || old.filled != filled;
}

/// The FOX zone ring used by the splash screen and the results donut.
class FoxRingPainter extends CustomPainter {
  FoxRingPainter({
    required this.segments,
    required this.progress,
    required this.strokeWidth,
    this.gap = 0.05,
  });

  /// Fractions of the full circle in drawing order, with their colours.
  final List<({double fraction, Color color})> segments;

  /// 0 → nothing drawn, 1 → all segments complete.
  final double progress;
  final double strokeWidth;
  final double gap;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    var drawn = 0.0;
    var start = -math.pi / 2;
    for (final seg in segments) {
      final sweepFull = seg.fraction * 2 * math.pi;
      final remaining = (progress - drawn).clamp(0.0, seg.fraction);
      drawn += seg.fraction;
      if (remaining <= 0) continue;

      final sweep = remaining * 2 * math.pi;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..color = seg.color;

      final g = sweepFull > 0.12 ? gap : 0.0;
      canvas.drawArc(
        rect,
        start + g / 2,
        math.max(sweep - g, 0.001),
        false,
        paint,
      );
      start += sweepFull;
    }
  }

  @override
  bool shouldRepaint(covariant FoxRingPainter old) =>
      old.progress != progress || old.segments != segments;
}
