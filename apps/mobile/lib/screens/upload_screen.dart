import "package:file_picker/file_picker.dart";
import "package:flutter/material.dart";

import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/report_processing_overlay.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 02 — pick the laboratory PDF and see what happens next.
class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key, required this.api, required this.onUploaded});

  final FoodFoxApi api;
  final VoidCallback onUploaded;

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ["pdf"],
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null) {
      setState(() => _error = "Не удалось прочитать файл");
      return;
    }

    final fileName = file.name.isNotEmpty ? file.name : "report.pdf";
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final ok = await showReportProcessing(
      context: context,
      fileName: fileName,
      work: () => widget.api.uploadPdf(file.bytes!, fileName),
    );

    if (!mounted) return;
    setState(() => _loading = false);
    if (ok) widget.onUploaded();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          children: [
            FoxPressable(
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
            const SizedBox(height: 8),
            const FoxScreenTitle(
              title: "Отчёт FOX",
              subtitle:
                  "Загрузите PDF из лаборатории — распознаем 285 антигенов",
            ),
            const SizedBox(height: 20),
            _Dropzone(loading: _loading, onTap: _pickAndUpload),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _SourceButton(
                    icon: Icons.photo_camera_outlined,
                    label: "Камера",
                    onTap: _loading ? null : _pickAndUpload,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SourceButton(
                    icon: Icons.photo_library_outlined,
                    label: "Галерея",
                    onTap: _loading ? null : _pickAndUpload,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
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
              label: _loading ? "Обрабатываем…" : "Выбрать PDF-файл",
              loading: _loading,
              onPressed: _loading ? null : _pickAndUpload,
            ),
          ],
        ),
      ),
    );
  }
}

class _Dropzone extends StatelessWidget {
  const _Dropzone({required this.loading, required this.onTap});

  final bool loading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxPressable(
    onTap: loading ? null : onTap,
    borderRadius: BorderRadius.circular(22),
    child: CustomPaint(
      painter: _DashedRoundedPainter(),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: FoxTokens.bgCard,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.upload_file_rounded,
                size: 26,
                color: FoxTokens.textPrimary,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              "Перетащите PDF сюда",
              style: FoxType.bodyS.copyWith(
                color: FoxTokens.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "или выберите файл с устройства",
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
    "Разберём PDF и разложим антигены по зонам",
    "Соберём план на ближайшие недели",
    "Подберём рецепты из зелёной зоны",
  ];

  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.grey,
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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
        const SizedBox(height: 8),
        for (var i = 0; i < _steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "${i + 1}",
                  style: FoxType.label.copyWith(color: FoxTokens.zoneGreen),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _steps[i],
                    style: FoxType.caption.copyWith(
                      color: FoxTokens.textPrimary,
                      height: 20 / 14,
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
