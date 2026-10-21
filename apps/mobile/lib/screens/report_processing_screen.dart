import "dart:async";
import "dart:math" as math;

import "package:flutter/material.dart";

import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/services/telemetry.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 03 «Распознаём ваш отчёт», and S1 when the server could not read it.
///
/// The upload is a single request, so the server reports nothing until the
/// report is parsed and the plan is built. The ring follows elapsed time and
/// stops short of 100% until the answer arrives; the stages follow the ring.
class ReportProcessingScreen extends StatefulWidget {
  const ReportProcessingScreen({
    super.key,
    required this.fileName,
    required this.sizeBytes,
    required this.work,
    required this.onDone,
    required this.onPickAnother,
    this.onSupport,
  });

  final String fileName;
  final int sizeBytes;
  final Future<UploadOutcome> Function() work;

  /// Called after the finished state has been on screen for a moment.
  final VoidCallback onDone;
  final VoidCallback onPickAnother;
  final void Function(String question)? onSupport;

  @override
  State<ReportProcessingScreen> createState() => _ReportProcessingScreenState();
}

enum _Phase { running, done, failed }

class _ReportProcessingScreenState extends State<ReportProcessingScreen> {
  static const _expectedTotal = 285;

  /// Time constant of the eased progress: about 70% after 40 seconds.
  static const _tau = 33.0;
  static const _cap = 0.94;

  var _phase = _Phase.running;
  var _progress = 0.0;
  UploadOutcome? _outcome;
  String? _error;
  Timer? _ticker;
  var _elapsed = Duration.zero;
  final _clock = Stopwatch();
  var _attempt = 0;

  @override
  void initState() {
    super.initState();
    _start();
  }

  void _start() {
    _attempt++;
    _clock
      ..reset()
      ..start();
    Telemetry.event(
      _attempt == 1 ? FoxEvent.processingStarted : FoxEvent.processingRetry,
      {"attempt": _attempt},
    );
    const tick = Duration(milliseconds: 250);
    _elapsed = Duration.zero;
    _ticker?.cancel();
    _ticker = Timer.periodic(tick, (_) {
      if (!mounted || _phase != _Phase.running) return;
      _elapsed += tick;
      final t = _elapsed.inMilliseconds / 1000;
      setState(() => _progress = _cap * (1 - math.exp(-t / _tau)));
    });
    setState(() {
      _phase = _Phase.running;
      _progress = 0;
      _error = null;
    });
    _run();
  }

  Future<void> _run() async {
    try {
      final outcome = await widget.work();
      Telemetry.event(FoxEvent.processingSucceeded, {
        "parsed_count": outcome.parsedCount,
        "confidence": outcome.confidence ?? "unknown",
        "seconds": _clock.elapsed.inSeconds,
        "attempt": _attempt,
      });
      if (!mounted) return;
      _ticker?.cancel();
      setState(() {
        _outcome = outcome;
        _progress = 1;
        _phase = _Phase.done;
      });
      await Future<void>.delayed(const Duration(milliseconds: 1100));
      if (mounted) widget.onDone();
    } catch (e) {
      final message = e.toString().replaceFirst("Exception: ", "").trim();
      Telemetry.event(FoxEvent.processingFailed, {
        "reason": _FailedView.isRecognition(message)
            ? "recognition"
            : message.contains("Нет связи")
            ? "network"
            : "server",
        "seconds": _clock.elapsed.inSeconds,
        "attempt": _attempt,
      });
      if (!mounted) return;
      _ticker?.cancel();
      setState(() {
        _phase = _Phase.failed;
        _error = message;
      });
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  /// 0 file sent · 1 values read · 2 catalogue match · 3 plan built.
  int get _activeStage {
    if (_phase == _Phase.done) return 4;
    if (_progress < 0.18) return 0;
    if (_progress < 0.5) return 1;
    if (_progress < 0.78) return 2;
    return 3;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Leaving mid-request would drop the result on the floor.
      canPop: _phase != _Phase.running,
      child: Scaffold(
        backgroundColor: FoxTokens.bgNeutral,
        body: SafeArea(
          child: AnimatedSwitcher(
            duration: FoxMotion.quick,
            child: _phase == _Phase.failed
                ? _FailedView(
                    key: const ValueKey("failed"),
                    fileName: widget.fileName,
                    sizeBytes: widget.sizeBytes,
                    error: _error ?? "",
                    onRetry: _start,
                    onPickAnother: widget.onPickAnother,
                    onSupport: widget.onSupport,
                  )
                : _progressView(),
          ),
        ),
      ),
    );
  }

  Widget _progressView() {
    final stage = _activeStage;
    final parsed = _outcome?.parsedCount;
    final steps = [
      (
        title: stage > 0 ? "Файл загружен" : "Загружаем файл",
        detail: "${widget.fileName} · ${formatFileSize(widget.sizeBytes)}",
      ),
      (
        title: "Извлекаем текст и значения",
        detail: parsed != null
            ? "$parsed из $_expectedTotal антигенов"
            : "Таблицы IgG из отчёта FOX",
      ),
      (
        title: "Сверяем со справочником",
        detail: "Сопоставление названий и семейств",
      ),
      (
        title: "Строим план по зонам",
        detail: "Автоматически, по результатам теста",
      ),
    ];

    return ListView(
      key: const ValueKey("progress"),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      children: [
        Center(child: _ProgressRing(value: _progress)),
        const SizedBox(height: 28),
        Text(
          _phase == _Phase.done ? "Отчёт готов" : "Распознаём ваш отчёт",
          textAlign: TextAlign.center,
          style: FoxType.h4.copyWith(
            color: FoxTokens.textPrimary,
            fontSize: 28,
            height: 32 / 28,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _phase == _Phase.done
              ? "Открываем результаты"
              : "Обычно занимает 1–2 минуты. "
                    "Не закрывайте приложение, пока идёт разбор",
          textAlign: TextAlign.center,
          style: FoxType.bodyS.copyWith(
            color: FoxTokens.textSecondary,
            height: 21 / 16,
          ),
        ),
        const SizedBox(height: 28),
        FoxCard(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
          child: Column(
            children: [
              for (var i = 0; i < steps.length; i++) ...[
                if (i > 0)
                  const Divider(height: 1, color: FoxTokens.borderLight),
                FoxFadeSlide(
                  delay: Duration(milliseconds: 80 * i),
                  offset: 12,
                  child: _StageRow(
                    title: steps[i].title,
                    detail: steps[i].detail,
                    state: i < stage
                        ? _StageState.done
                        : i == stage
                        ? _StageState.active
                        : _StageState.pending,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 28),
        FoxCard(
          tone: FoxCardTone.green,
          padding: const EdgeInsets.all(16),
          radius: 18,
          child: Text(
            "План строится автоматически и откроется сразу. "
            "Проверка нутрициологом — по желанию, из профиля.",
            style: FoxType.caption.copyWith(
              color: FoxTokens.zoneGreen,
              height: 20 / 14,
            ),
          ),
        ),
      ],
    );
  }
}

String formatFileSize(int bytes) {
  if (bytes <= 0) return "PDF";
  if (bytes < 1024 * 1024) return "${(bytes / 1024).ceil()} КБ";
  final mb = bytes / (1024 * 1024);
  return "${mb.toStringAsFixed(1).replaceAll(".", ",")} МБ";
}

class _ProgressRing extends StatelessWidget {
  const _ProgressRing({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(end: value),
    duration: FoxMotion.progress,
    curve: FoxMotion.easeOut,
    builder: (context, v, _) => SizedBox(
      width: 168,
      height: 168,
      child: CustomPaint(
        painter: _RingPainter(v),
        child: Center(
          child: Text(
            "${(v * 100).round()}%",
            style: FoxType.h2.copyWith(color: FoxTokens.textPrimary),
          ),
        ),
      ),
    ),
  );
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.value);

  final double value;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 14.0;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: (size.width - stroke) / 2,
    );
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = FoxTokens.bgGrey.withValues(alpha: 0.7);
    canvas.drawArc(rect, 0, 2 * math.pi, false, track);
    if (value <= 0) return;
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = FoxTokens.accentLime;
    canvas.drawArc(rect, -math.pi / 2, 2 * math.pi * value, false, arc);
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.value != value;
}

enum _StageState { done, active, pending }

class _StageRow extends StatelessWidget {
  const _StageRow({
    required this.title,
    required this.detail,
    required this.state,
  });

  final String title;
  final String detail;
  final _StageState state;

  @override
  Widget build(BuildContext context) {
    final pending = state == _StageState.pending;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _StageMark(key: ValueKey(state), state: state),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: FoxType.bodyS.copyWith(
                    color: pending
                        ? FoxTokens.textSecondary
                        : FoxTokens.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  detail,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: FoxType.caption.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StageMark extends StatelessWidget {
  const _StageMark({super.key, required this.state});

  final _StageState state;

  @override
  Widget build(BuildContext context) {
    final (bg, child) = switch (state) {
      _StageState.done => (
        FoxTokens.zoneGreenBg,
        const Icon(Icons.check_rounded, size: 16, color: FoxTokens.zoneGreen),
      ),
      _StageState.active => (FoxTokens.accentLime, _dot(FoxTokens.textPrimary)),
      _StageState.pending => (FoxTokens.bgGrey, _dot(FoxTokens.textSecondary)),
    };
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      child: child,
    );
  }

  static Widget _dot(Color color) => Container(
    width: 8,
    height: 8,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

/// S1 «Ошибка распознавания», plus the network variant Figma does not draw.
class _FailedView extends StatelessWidget {
  const _FailedView({
    super.key,
    required this.fileName,
    required this.sizeBytes,
    required this.error,
    required this.onRetry,
    required this.onPickAnother,
    this.onSupport,
  });

  final String fileName;
  final int sizeBytes;
  final String error;
  final VoidCallback onRetry;
  final VoidCallback onPickAnother;
  final void Function(String question)? onSupport;

  /// The server answers with a sentence when it read the file and found it
  /// wanting. Anything else means the file never got a verdict.
  bool get _isRecognition => isRecognition(error);

  static bool isRecognition(String error) =>
      error.contains("Распознано") ||
      error.contains("извлечь текст") ||
      error.contains("антиген") ||
      error.contains("отчёт FOX") ||
      error.contains("парсинга");

  @override
  Widget build(BuildContext context) {
    final recognition = _isRecognition;
    final title = recognition ? "Распознали не всё" : "Файл не загрузился";
    final lead = recognition
        ? "$error План по такому отчёту мы не строим."
        : (error.isNotEmpty
              ? error
              : "Проверьте интернет и попробуйте ещё раз.");

    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: (constraints.maxHeight - 32).clamp(0, double.infinity),
          ),
          child: IntrinsicHeight(
            child: Column(
              children: [
                const Spacer(),
                Container(
                  width: 76,
                  height: 76,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: FoxTokens.zoneRedBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    recognition
                        ? Icons.warning_amber_rounded
                        : Icons.wifi_off_rounded,
                    size: 32,
                    color: FoxTokens.zoneRed,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: FoxType.h4.copyWith(
                    color: FoxTokens.textPrimary,
                    fontSize: 28,
                    height: 31 / 28,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  lead.trim(),
                  textAlign: TextAlign.center,
                  style: FoxType.bodyS.copyWith(
                    color: FoxTokens.textSecondary,
                    height: 21 / 16,
                  ),
                ),
                const SizedBox(height: 18),
                FoxCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 17,
                    vertical: 6,
                  ),
                  radius: 18,
                  child: Column(
                    children: [
                      _Kv("Файл", fileName),
                      _Kv("Размер", formatFileSize(sizeBytes)),
                      const _Kv("Формат", "PDF"),
                    ],
                  ),
                ),
                const Spacer(),
                const SizedBox(height: 32),
                FoxButton(
                  label: recognition ? "Загрузить другой файл" : "Повторить",
                  onPressed: recognition ? onPickAnother : onRetry,
                ),
                const SizedBox(height: 16),
                if (recognition && onSupport != null)
                  FoxButton(
                    label: "Написать в поддержку",
                    kind: FoxButtonKind.outline,
                    onPressed: () =>
                        onSupport!("Не получается загрузить отчёт FOX: $error"),
                  )
                else
                  FoxButton(
                    label: "Выбрать другой файл",
                    kind: FoxButtonKind.outline,
                    onPressed: onPickAnother,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Kv extends StatelessWidget {
  const _Kv(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Text(
          label,
          style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: FoxType.caption.copyWith(color: FoxTokens.textPrimary),
          ),
        ),
      ],
    ),
  );
}
