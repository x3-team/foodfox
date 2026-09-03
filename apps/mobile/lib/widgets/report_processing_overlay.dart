import "dart:async";

import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/fox_logo.dart";

class ReportProcessingStep {
  const ReportProcessingStep({
    required this.id,
    required this.label,
    required this.detail,
  });

  final String id;
  final String label;
  final String detail;
}

const reportProcessingSteps = [
  ReportProcessingStep(
    id: "upload",
    label: "Загрузка PDF",
    detail: "Передаём файл на сервер в защищённое хранилище",
  ),
  ReportProcessingStep(
    id: "extract",
    label: "Извлечение данных",
    detail: "Читаем таблицы и значения IgG из отчёта FOX",
  ),
  ReportProcessingStep(
    id: "parse",
    label: "Разбор антигенов",
    detail: "Распределяем продукты по зонам 🟢 🟡 🔴",
  ),
  ReportProcessingStep(
    id: "plan",
    label: "8-недельный план",
    detail: "Элиминация → стабилизация → расширение рациона",
  ),
  ReportProcessingStep(
    id: "chat",
    label: "Подготовка чата",
    detail: "Бот-нутрициолог получит ваши результаты",
  ),
];

/// Shows staged progress while the FOX report is being parsed on the server.
class ReportProcessingOverlay extends StatefulWidget {
  const ReportProcessingOverlay({
    super.key,
    required this.fileName,
    required this.onFinished,
    required this.work,
  });

  final String fileName;
  final Future<void> Function() work;
  final VoidCallback onFinished;

  @override
  State<ReportProcessingOverlay> createState() => _ReportProcessingOverlayState();
}

class _ReportProcessingOverlayState extends State<ReportProcessingOverlay>
    with SingleTickerProviderStateMixin {
  var _activeIndex = 0;
  var _done = false;
  var _failed = false;
  String? _error;
  Timer? _stepTimer;
  late final AnimationController _swing;

  @override
  void initState() {
    super.initState();
    _swing = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))
      ..repeat(reverse: true);
    _stepTimer = Timer.periodic(const Duration(milliseconds: 1800), (_) {
      if (!mounted || _done) return;
      setState(() {
        _activeIndex = (_activeIndex + 1).clamp(0, reportProcessingSteps.length - 2);
      });
    });
    _run();
  }

  Future<void> _run() async {
    try {
      await widget.work();
      if (!mounted) return;
      setState(() {
        _done = true;
        _activeIndex = reportProcessingSteps.length - 1;
      });
      await Future<void>.delayed(const Duration(milliseconds: 650));
      if (!mounted) return;
      widget.onFinished();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _error = e.toString().replaceFirst("Exception: ", "");
      });
    } finally {
      _stepTimer?.cancel();
    }
  }

  @override
  void dispose() {
    _stepTimer?.cancel();
    _swing.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _done
        ? 100
        : (((_activeIndex + 0.35) / reportProcessingSteps.length) * 100).round();

    return Material(
      color: Colors.black.withValues(alpha: 0.4),
      child: SafeArea(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              decoration: foxCardDecoration,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      RotationTransition(
                        turns: Tween<double>(begin: -0.03, end: 0.03).animate(
                          CurvedAnimation(parent: _swing, curve: Curves.easeInOut),
                        ),
                        child: FoxLogo(size: 44),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _failed
                                  ? "Не удалось обработать"
                                  : _done
                                      ? "Отчёт готов!"
                                      : "Обрабатываем отчёт FOX",
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w600,
                                color: FoxColors.text,
                              ),
                            ),
                            Text(
                              widget.fileName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13, color: FoxColors.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (!_failed) ...[
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Прогресс",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: FoxColors.muted,
                          ),
                        ),
                        Text(
                          "$progress%",
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: FoxColors.muted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: progress / 100,
                        minHeight: 8,
                        backgroundColor: FoxColors.border.withValues(alpha: 0.6),
                        color: FoxColors.primary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ...List.generate(reportProcessingSteps.length, (index) {
                      final step = reportProcessingSteps[index];
                      final state = _done || index < _activeIndex
                          ? _StepState.done
                          : index == _activeIndex
                              ? _StepState.active
                              : _StepState.pending;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _StepIcon(state: state),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    step.label,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500,
                                      color: state == _StepState.pending
                                          ? FoxColors.muted
                                          : FoxColors.text,
                                    ),
                                  ),
                                  if (state != _StepState.pending)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        step.detail,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: FoxColors.muted,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ] else ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _error ?? "Ошибка обработки",
                        style: const TextStyle(color: FoxColors.red, fontSize: 14),
                      ),
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(
                        backgroundColor: FoxColors.primary,
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: const Text("Закрыть"),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum _StepState { done, active, pending }

class _StepIcon extends StatelessWidget {
  const _StepIcon({required this.state});

  final _StepState state;

  @override
  Widget build(BuildContext context) {
    switch (state) {
      case _StepState.done:
        return Container(
          width: 28,
          height: 28,
          decoration: const BoxDecoration(color: FoxColors.primary, shape: BoxShape.circle),
          child: const Icon(Icons.check, size: 16, color: Colors.white),
        );
      case _StepState.active:
        return SizedBox(
          width: 28,
          height: 28,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: FoxColors.primarySoft,
                  shape: BoxShape.circle,
                  border: Border.all(color: FoxColors.primary, width: 2),
                ),
              ),
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: FoxColors.primary),
              ),
            ],
          ),
        );
      case _StepState.pending:
        return Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: FoxColors.bg,
            shape: BoxShape.circle,
            border: Border.all(color: FoxColors.border),
          ),
          child: Center(
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: FoxColors.border,
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
    }
  }
}

Future<bool> showReportProcessing({
  required BuildContext context,
  required String fileName,
  required Future<void> Function() work,
}) async {
  var success = false;
  await showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.transparent,
    pageBuilder: (ctx, _, _) {
      return ReportProcessingOverlay(
        fileName: fileName,
        work: work,
        onFinished: () {
          success = true;
          Navigator.of(ctx).pop();
        },
      );
    },
  );
  return success;
}
