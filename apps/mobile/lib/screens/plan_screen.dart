import "package:flutter/material.dart";

import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 05 — the current phase, the four-step timeline and today's rotation.
class PlanScreen extends StatefulWidget {
  const PlanScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  PlanData? _planMeta;
  final Map<int, PlanWeekItem> _loadedWeeks = {};
  var _loading = false;
  var _currentWeek = 1;
  Object? _error;
  late final LazyTabLoader _loader = LazyTabLoader(onLoad: _load);

  @override
  void initState() {
    super.initState();
    _loader.sync(active: true);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.fetchPlan();
      if (!mounted) return;
      setState(() {
        _planMeta = data.plan;
        _currentWeek = data.currentWeek;
        _loadedWeeks.clear();
        final week = data.plan?.weeks.firstOrNull;
        if (week != null) _loadedWeeks[week.weekNumber] = week;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  PlanDayItem? get _today {
    final week = _loadedWeeks[_currentWeek] ?? _loadedWeeks.values.firstOrNull;
    if (week == null || week.days.isEmpty) return null;
    for (final day in week.days) {
      if (day.isToday) return day;
    }
    return week.days.first;
  }

  @override
  Widget build(BuildContext context) {
    final today = _today;
    final step = _planStep(_currentWeek);
    final shownWeek = _currentWeek.clamp(1, 6);

    return RefreshIndicator(
      onRefresh: _load,
      color: FoxTokens.bgGreen,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          if (_loading && _planMeta == null)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(
                child: CircularProgressIndicator(color: FoxTokens.bgGreen),
              ),
            )
          else if (_error != null)
            NetworkErrorPanel(
              error: _error!,
              onRetry: () => _loader.sync(active: true, force: true),
            )
          else if (_planMeta == null)
            const _EmptyPlan()
          else
            ...foxStagger([
              const FoxScreenTitle(title: "Мой план"),
              const SizedBox(height: 18),
              _PhaseCard(step: step, week: shownWeek),
              const SizedBox(height: 16),
              _Timeline(current: step.index),
              if (today != null) ...[
                ..._dairyCards(today.forbidden),
                const SizedBox(height: 16),
                _Rotation(foods: today.allowed),
              ],
            ]),
        ],
      ),
    );
  }

  List<Widget> _dairyCards(List<String> forbidden) {
    final dairy = forbidden.where(_isDairy).toList();
    if (dairy.isEmpty) return const [];
    final hasBosD8 = dairy.any(
      (name) => name.toLowerCase().contains("bos d 8"),
    );
    final body = hasBosD8
        ? "Bos d 8 в красной зоне. На этапе элиминации уберите молоко, "
              "творог и продукты с казеином."
        : "В красной зоне: ${dairy.take(4).join(", ")}. "
              "Уберите их, пока идёт элиминация.";
    return [
      const SizedBox(height: 16),
      FoxCard(
        tone: FoxCardTone.red,
        padding: const EdgeInsets.all(16),
        radius: 18,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.info_outline_rounded,
              size: 18,
              color: FoxTokens.zoneRed,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                body,
                style: FoxType.bodyS.copyWith(
                  color: FoxTokens.zoneRed,
                  height: 22 / 16,
                ),
              ),
            ),
          ],
        ),
      ),
    ];
  }
}

class _PhaseCard extends StatelessWidget {
  const _PhaseCard({required this.step, required this.week});

  final _PlanStep step;
  final int week;

  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.dark,
    padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
    radius: 24,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              "ШАГ ${step.index + 1} · ТЕКУЩИЙ",
              style: FoxType.captionS.copyWith(
                color: FoxTokens.accentLime,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.6,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(100),
              ),
              child: Text(
                "$week / 6 нед",
                style: FoxType.captionS.copyWith(
                  color: FoxTokens.textInverted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          step.title,
          style: FoxType.h4.copyWith(color: FoxTokens.textInverted),
        ),
        const SizedBox(height: 6),
        Text(
          step.detail,
          style: FoxType.caption.copyWith(
            color: FoxTokens.textInvertedSecondary,
            height: 20 / 14,
          ),
        ),
        const SizedBox(height: 16),
        FoxProgressBar(value: week / 6, onDark: true),
      ],
    ),
  );
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.current});

  final int current;

  @override
  Widget build(BuildContext context) => FoxCard(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
    child: Column(
      children: [
        for (var i = 0; i < _steps.length; i++)
          _StepRow(
            step: _steps[i],
            state: i < current
                ? _StepState.done
                : i == current
                ? _StepState.current
                : _StepState.upcoming,
            last: i == _steps.length - 1,
          ),
      ],
    ),
  );
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.step, required this.state, required this.last});

  final _PlanStep step;
  final _StepState state;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final active = state != _StepState.upcoming;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                const SizedBox(height: 14),
                _StepMark(state: state),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      color: state == _StepState.done
                          ? FoxTokens.zoneGreen
                          : FoxTokens.borderLight,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.title,
                    style: FoxType.bodyS.copyWith(
                      color: active
                          ? FoxTokens.textPrimary
                          : FoxTokens.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    step.span,
                    style: FoxType.captionS.copyWith(
                      color: FoxTokens.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepMark extends StatelessWidget {
  const _StepMark({required this.state});

  final _StepState state;

  @override
  Widget build(BuildContext context) {
    final color = switch (state) {
      _StepState.done => FoxTokens.zoneGreen,
      _StepState.current => FoxTokens.accentLime,
      _StepState.upcoming => FoxTokens.bgGrey,
    };
    return Container(
      width: 18,
      height: 18,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: state == _StepState.upcoming ? FoxTokens.bgGrey : color,
        shape: BoxShape.circle,
        border: state == _StepState.current
            ? Border.all(color: FoxTokens.bgGreen, width: 2)
            : null,
      ),
      child: state == _StepState.done
          ? const Icon(Icons.check_rounded, size: 12, color: Colors.white)
          : null,
    );
  }
}

class _Rotation extends StatelessWidget {
  const _Rotation({required this.foods});

  final List<String> foods;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        "Сегодня в ротации",
        style: FoxType.bodyS.copyWith(
          color: FoxTokens.textPrimary,
          fontWeight: FontWeight.w500,
        ),
      ),
      const SizedBox(height: 10),
      if (foods.isEmpty)
        Text(
          "На сегодня ротация ещё не собрана.",
          style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
        )
      else
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [for (final food in foods.take(12)) FoxChip(label: food)],
        ),
    ],
  );
}

class _EmptyPlan extends StatelessWidget {
  const _EmptyPlan();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.only(top: 48),
    child: Column(
      children: [
        FoxScreenTitle(
          title: "Мой план",
          subtitle: "Появится после загрузки PDF-отчёта FOX",
        ),
      ],
    ),
  );
}

enum _StepState { done, current, upcoming }

class _PlanStep {
  const _PlanStep(this.index, this.title, this.span, this.detail);

  final int index;
  final String title;
  final String span;
  final String detail;
}

const _steps = [
  _PlanStep(
    0,
    "Элиминация",
    "4–6 недель",
    "Убираем красную зону и держим ротацию зелёных продуктов.",
  ),
  _PlanStep(
    1,
    "Реинтродукция",
    "с 5–6 недели",
    "Возвращаем продукты по одному и смотрим на самочувствие.",
  ),
  _PlanStep(
    2,
    "Жёлтая зона",
    "при необходимости",
    "Добавляем жёлтую зону, если элиминация прошла спокойно.",
  ),
  _PlanStep(
    3,
    "Повторный тест",
    "через ~6 месяцев",
    "Сверяем IgG и решаем, что остаётся в рационе.",
  ),
];

_PlanStep _planStep(int week) {
  if (week <= 4) return _steps[0];
  if (week <= 6) return _steps[1];
  if (week <= 8) return _steps[2];
  return _steps[3];
}

bool _isDairy(String name) {
  final value = name.toLowerCase();
  return value.contains("молок") ||
      value.contains("творог") ||
      value.contains("казеин") ||
      value.contains("bos d") ||
      value.contains("сыр");
}

extension _FirstOrNull<E> on List<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
