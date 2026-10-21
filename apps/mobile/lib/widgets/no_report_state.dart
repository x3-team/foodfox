import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// S3 «Пока нет отчёта»: the first thing a new client sees on the report and
/// plan tabs, until a FOX report has been uploaded.
class NoReportState extends StatelessWidget {
  const NoReportState({super.key, required this.onUpload, this.onAsk});

  final VoidCallback onUpload;

  /// Opens the chat with a question; the «Где сдать тест?» sheet offers it.
  final void Function(String question)? onAsk;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    // A whole page of its own: Figma pins the buttons to the bottom and
    // centres the message in what is left above them. It still scrolls, so
    // pull-to-refresh works and nothing is cut off on a short screen.
    builder: (context, constraints) => SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: (constraints.maxHeight - 32).clamp(0, double.infinity),
        ),
        child: IntrinsicHeight(
          child: Column(
            children: [
              const Spacer(),
              FoxFadeSlide(
                duration: FoxMotion.base,
                child: Column(
                  children: [
                    const _RoundIcon(
                      icon: Icons.description_outlined,
                      color: FoxTokens.textPrimary,
                      background: FoxTokens.bgGrey,
                    ),
                    const SizedBox(height: 18),
                    Text(
                      "Пока нет отчёта",
                      textAlign: TextAlign.center,
                      style: FoxType.h4.copyWith(
                        color: FoxTokens.textPrimary,
                        fontSize: 28,
                        height: 31 / 28,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Загрузите PDF из лаборатории — распознаем 285 антигенов "
                      "и соберём персональный протокол.",
                      textAlign: TextAlign.center,
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textSecondary,
                        height: 21 / 16,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              const SizedBox(height: 32),
              FoxFadeSlide(
                delay: const Duration(milliseconds: 80),
                duration: FoxMotion.base,
                child: Column(
                  children: [
                    FoxButton(
                      label: "Загрузить отчёт FOX",
                      kind: FoxButtonKind.accent,
                      onPressed: onUpload,
                    ),
                    const SizedBox(height: 16),
                    FoxButton(
                      label: "Где сдать тест?",
                      kind: FoxButtonKind.outline,
                      onPressed: () => showWhereToTestSheet(
                        context,
                        onUpload: onUpload,
                        onAsk: onAsk,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// N1 «Где сдать тест» — not in Figma. A sheet in the style of the app that
/// explains where the report comes from and hands over to the chat.
Future<void> showWhereToTestSheet(
  BuildContext context, {
  required VoidCallback onUpload,
  void Function(String question)? onAsk,
}) {
  return showFoxSheet(
    context,
    icon: Icons.science_outlined,
    title: "Где сдать тест",
    body: const [
      "FOX Food Xplorer — анализ крови на IgG к 285 продуктам. "
          "Его сдают в лаборатории, направление и консультацию даёт "
          "нутрициолог-партнёр FOX.",
      "Через несколько дней лаборатория присылает отчёт в PDF. "
          "Его и нужно загрузить в приложение.",
    ],
    primaryLabel: onAsk != null ? "Спросить в чате" : "Загрузить отчёт",
    onPrimary: onAsk != null
        ? () => onAsk("Где сдать тест FOX Food Xplorer?")
        : onUpload,
    secondaryLabel: "Понятно",
  );
}

/// Bottom sheet in the app's card style: icon, title, paragraphs, buttons.
Future<void> showFoxSheet(
  BuildContext context, {
  required IconData icon,
  required String title,
  required List<String> body,
  required String primaryLabel,
  required VoidCallback onPrimary,
  String? secondaryLabel,
}) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: FoxTokens.bgNeutral,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(FoxTokens.radiusHero),
      ),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: FoxTokens.bgGrey,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            _RoundIcon(
              icon: icon,
              color: FoxTokens.zoneGreen,
              background: FoxTokens.zoneGreenBg,
              size: 56,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: FoxType.h4.copyWith(color: FoxTokens.textPrimary),
            ),
            const SizedBox(height: 10),
            for (final paragraph in body) ...[
              Text(
                paragraph,
                style: FoxType.bodyS.copyWith(
                  color: FoxTokens.textSecondary,
                  height: 21 / 16,
                ),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 14),
            FoxButton(
              label: primaryLabel,
              onPressed: () {
                Navigator.of(sheetContext).pop();
                onPrimary();
              },
            ),
            if (secondaryLabel != null) ...[
              const SizedBox(height: 12),
              FoxButton(
                label: secondaryLabel,
                kind: FoxButtonKind.outline,
                onPressed: () => Navigator.of(sheetContext).pop(),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon({
    required this.icon,
    required this.color,
    required this.background,
    this.size = 76,
  });

  final IconData icon;
  final Color color;
  final Color background;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(color: background, shape: BoxShape.circle),
    child: Icon(icon, size: size * 0.42, color: color),
  );
}
