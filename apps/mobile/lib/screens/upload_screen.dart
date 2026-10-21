import "package:file_picker/file_picker.dart";
import "package:flutter/material.dart";

import "package:foodfox/screens/report_processing_screen.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/no_report_state.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 02 — pick the laboratory PDF, then hand over to processing (03).
class UploadScreen extends StatefulWidget {
  const UploadScreen({
    super.key,
    required this.api,
    required this.onUploaded,
    this.onSupport,
  });

  final FoodFoxApi api;
  final VoidCallback onUploaded;
  final void Function(String question)? onSupport;

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  /// Matches «PDF до 20 МБ» on the screen.
  static const _maxBytes = 20 * 1024 * 1024;

  bool _picking = false;
  String? _error;

  Future<void> _pickAndUpload() async {
    if (_picking) return;
    setState(() {
      _picking = true;
      _error = null;
    });
    FilePickerResult? result;
    try {
      result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: const ["pdf"],
        withData: true,
      );
    } catch (_) {
      result = null;
      if (mounted) setState(() => _error = "Не удалось открыть выбор файла");
    } finally {
      if (mounted) setState(() => _picking = false);
    }
    if (result == null || result.files.isEmpty || !mounted) return;

    final file = result.files.first;
    final bytes = file.bytes;
    if (bytes == null) {
      setState(() => _error = "Не удалось прочитать файл");
      return;
    }
    if (bytes.length > _maxBytes) {
      setState(() => _error = "Файл больше 20 МБ. Нужен PDF из лаборатории");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setState(() => _error = "Нужен файл в формате PDF");
      return;
    }

    final fileName = file.name.isNotEmpty ? file.name : "report.pdf";
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (processingContext) => ReportProcessingScreen(
          fileName: fileName,
          sizeBytes: bytes.length,
          work: () => widget.api.uploadPdf(bytes, fileName),
          onDone: widget.onUploaded,
          onSupport: widget.onSupport,
          onPickAnother: () {
            Navigator.of(processingContext).pop();
            _pickAndUpload();
          },
        ),
      ),
    );
  }

  /// N2 «Фото отчёта»: the server reads text from the PDF and has no OCR
  /// yet, so a photo would only ever end on the error screen.
  void _explainPhoto() => showFoxSheet(
    context,
    icon: Icons.photo_camera_outlined,
    title: "Фото пока не распознаём",
    body: const [
      "Значения IgG мы читаем из PDF, который присылает лаборатория. "
          "На фото и сканах цифры легко перепутать, а от них зависит план.",
      "PDF обычно приходит на почту из лаборатории или от вашего "
          "нутрициолога.",
    ],
    primaryLabel: "Выбрать PDF-файл",
    onPrimary: _pickAndUpload,
    secondaryLabel: "Понятно",
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: FoxPressable(
                onTap: () => Navigator.of(context).maybePop(),
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(
                    Icons.arrow_back_rounded,
                    size: 22,
                    color: FoxTokens.textPrimary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            const FoxScreenTitle(
              title: "Отчёт FOX",
              subtitle: "Загрузите PDF из лаборатории — распознаем 285 антигенов",
            ),
            const SizedBox(height: 20),
            _Dropzone(busy: _picking, onTap: _pickAndUpload),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _SourceButton(
                    icon: Icons.photo_camera_outlined,
                    label: "Камера",
                    onTap: _explainPhoto,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SourceButton(
                    icon: Icons.photo_library_outlined,
                    label: "Галерея",
                    onTap: _explainPhoto,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const _NextSteps(),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: FoxType.caption.copyWith(color: FoxTokens.zoneRed),
              ),
            ],
            const SizedBox(height: 20),
            FoxButton(
              label: "Выбрать PDF-файл",
              loading: _picking,
              onPressed: _pickAndUpload,
            ),
          ],
        ),
      ),
    );
  }
}

class _Dropzone extends StatelessWidget {
  const _Dropzone({required this.busy, required this.onTap});

  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: busy ? null : onTap,
    scale: 1.01,
    borderRadius: BorderRadius.circular(22),
    child: CustomPaint(
      painter: _DashedRoundedPainter(),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 44, horizontal: 20),
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: FoxTokens.zoneGreenBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.file_upload_outlined,
                size: 28,
                color: FoxTokens.zoneGreen,
              ),
            ),
            const SizedBox(height: 14),
            // Figma says «Перетащите или выберите файл», but there is
            // nothing to drag a file from on a phone.
            Text(
              "Выберите файл отчёта",
              textAlign: TextAlign.center,
              style: FoxType.bodyM.copyWith(
                color: FoxTokens.textPrimary,
                fontWeight: FontWeight.w500,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "PDF до 20 МБ · отчёт FOX Food Xplorer",
              textAlign: TextAlign.center,
              style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
            ),
          ],
        ),
      ),
    ),
  );
}

class _SourceButton extends StatelessWidget {
  const _SourceButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: FoxTokens.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: FoxTokens.borderLight),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: FoxTokens.textPrimary),
          const SizedBox(width: 8),
          Text(
            label,
            style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
          ),
        ],
      ),
    ),
  );
}

class _NextSteps extends StatelessWidget {
  const _NextSteps();

  static const _steps = [
    "Распознаем 285 антигенов и зоны",
    "Автоматически построим протокол на 4–6 месяцев",
    "Покажем рецепты из вашей зелёной зоны",
  ];

  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.grey,
    padding: const EdgeInsets.fromLTRB(18, 18, 18, 4),
    radius: 20,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Что будет дальше",
          style: FoxType.bodyS.copyWith(
            color: FoxTokens.textPrimary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        for (var i = 0; i < _steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: FoxTokens.bgGreen,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    "${i + 1}",
                    style: FoxType.label.copyWith(
                      color: FoxTokens.textInverted,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _steps[i],
                    style: FoxType.caption.copyWith(
                      color: FoxTokens.textSecondary,
                      height: 19 / 14,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    ),
  );
}

class _DashedRoundedPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(22),
    );
    final path = Path()..addRRect(rrect);
    final paint = Paint()
      ..color = FoxTokens.bgGrey
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final end = (distance + 7).clamp(0, metric.length).toDouble();
        canvas.drawPath(metric.extractPath(distance, end), paint);
        distance = end + 5;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
