import "package:flutter/material.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/report_processing_overlay.dart";
import "package:file_picker/file_picker.dart";

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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageHeader(
          title: "Загрузка отчёта",
          subtitle: "Загрузите PDF FOX Food Xplorer — мы разберём 286 антигенов",
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            children: [
              Material(
                color: FoxColors.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: FoxColors.primaryMuted, width: 2),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: _loading ? null : _pickAndUpload,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                    child: Column(
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: FoxColors.primarySoft,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.picture_as_pdf_outlined,
                            size: 32,
                            color: FoxColors.primary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          "Выберите PDF-отчёт FOX",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: FoxColors.text,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          "Файл с устройства — разбор ~285 антигенов",
                          style: TextStyle(fontSize: 14, color: FoxColors.muted),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: foxCardDecoration,
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "FOX Food Xplorer",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: FoxColors.text,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      "IgG-анализ 286 пищевых антигенов. Результаты носят информационный характер и не заменяют консультацию врача.",
                      style: TextStyle(fontSize: 13, color: FoxColors.muted, height: 1.45),
                    ),
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(_error!, style: const TextStyle(color: FoxColors.red)),
                ),
              ],
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _pickAndUpload,
                style: FilledButton.styleFrom(
                  backgroundColor: FoxColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(_loading ? "Обрабатываем…" : "Загрузить отчёт"),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
