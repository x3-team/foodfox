import "package:flutter/material.dart";

/// Fox head from the FoodFox Figma mockups — mirrors the web `FoxLogo` SVG
/// on the same 32×32 design grid.
class FoxLogo extends StatelessWidget {
  const FoxLogo({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _FoxLogoPainter()),
    );
  }
}

class _FoxLogoPainter extends CustomPainter {
  static const _grid = 32.0;

  static const _fur = Color(0xFFED7B1F);
  static const _earInner = Color(0xFF55555F);
  static const _muzzle = Color(0xFFFFF1E0);
  static const _dark = Color(0xFF2B2118);

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / _grid;
    Offset p(double x, double y) => Offset(x * s, y * s);

    Path triangle(List<Offset> pts) => Path()
      ..moveTo(pts[0].dx, pts[0].dy)
      ..lineTo(pts[1].dx, pts[1].dy)
      ..lineTo(pts[2].dx, pts[2].dy)
      ..close();

    final furPaint = Paint()..color = _fur;
    canvas.drawPath(triangle([p(4.2, 2.2), p(13.4, 6.2), p(7.2, 12.4)]), furPaint);
    canvas.drawPath(triangle([p(27.8, 2.2), p(18.6, 6.2), p(24.8, 12.4)]), furPaint);

    final innerPaint = Paint()..color = _earInner;
    canvas.drawPath(triangle([p(6.3, 5.2), p(11.2, 7.4), p(8.4, 10.2)]), innerPaint);
    canvas.drawPath(triangle([p(25.7, 5.2), p(20.8, 7.4), p(23.6, 10.2)]), innerPaint);

    final head = Path()
      ..moveTo(6.2 * s, 14.8 * s)
      ..cubicTo(6.2 * s, 10.2 * s, 10.6 * s, 6.6 * s, 16 * s, 6.6 * s)
      ..cubicTo(21.4 * s, 6.6 * s, 25.8 * s, 10.2 * s, 25.8 * s, 14.8 * s)
      ..cubicTo(25.8 * s, 17.7 * s, 24.6 * s, 20.3 * s, 22.6 * s, 22.1 * s)
      ..lineTo(16 * s, 28 * s)
      ..lineTo(9.4 * s, 22.1 * s)
      ..cubicTo(7.4 * s, 20.3 * s, 6.2 * s, 17.7 * s, 6.2 * s, 14.8 * s)
      ..close();
    canvas.drawPath(head, furPaint);

    final muzzle = Path()
      ..moveTo(16 * s, 26.4 * s)
      ..cubicTo(13.8 * s, 24.8 * s, 12.4 * s, 23.2 * s, 12.4 * s, 21.8 * s)
      ..cubicTo(12.4 * s, 20.6 * s, 14 * s, 19.8 * s, 16 * s, 19.8 * s)
      ..cubicTo(18 * s, 19.8 * s, 19.6 * s, 20.6 * s, 19.6 * s, 21.8 * s)
      ..cubicTo(19.6 * s, 23.2 * s, 18.2 * s, 24.8 * s, 16 * s, 26.4 * s)
      ..close();
    canvas.drawPath(muzzle, Paint()..color = _muzzle);

    final darkPaint = Paint()..color = _dark;
    canvas.drawOval(
      Rect.fromCenter(center: p(11.9, 15.4), width: 3.3 * s, height: 3.7 * s),
      darkPaint,
    );
    canvas.drawOval(
      Rect.fromCenter(center: p(20.1, 15.4), width: 3.3 * s, height: 3.7 * s),
      darkPaint,
    );

    final nose = Path()
      ..moveTo(16 * s, 23.3 * s)
      ..cubicTo(15 * s, 22.6 * s, 14.4 * s, 21.9 * s, 14.4 * s, 21.3 * s)
      ..arcToPoint(p(17.6, 21.3), radius: Radius.circular(1.6 * s))
      ..cubicTo(17.6 * s, 21.9 * s, 17 * s, 22.6 * s, 16 * s, 23.3 * s)
      ..close();
    canvas.drawPath(nose, darkPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
