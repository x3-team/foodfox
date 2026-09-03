import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/compact_product_chips.dart";
import "package:foodfox/widgets/list_pagination.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/week_selector.dart";

class PlanScreen extends StatefulWidget {
  const PlanScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  PlanData? _plan;
  var _loading = true;
  var _selectedWeek = 1;
  var _currentWeek = 1;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.fetchPlan();
      setState(() {
        _plan = data.plan;
        _currentWeek = data.currentWeek;
        if (data.plan != null && data.plan!.weeks.isNotEmpty) {
          _selectedWeek = data.currentWeek.clamp(1, 8);
        }
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    PlanWeekItem? week;
    if (_plan != null) {
      for (final w in _plan!.weeks) {
        if (w.weekNumber == _selectedWeek) {
          week = w;
          break;
        }
      }
    }
    final summary = week?.days.isNotEmpty == true ? week!.days.first : null;
    final banner = phaseBannerText(_currentWeek, _selectedWeek);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageHeader(
          title: "План питания",
          subtitle: "8 недель: 4 элиминация → 2 стабилизация → 2 расширение",
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Text(_error!))
                  : _plan == null
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.all(24),
                            child: Text(
                              "Загрузите PDF-отчёт FOX на вкладке «Отчёт»",
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      : ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: foxCardDecoration,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    "Персональный план на 8 недель",
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  for (final block in planProtocol)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 6),
                                      child: RichText(
                                        text: TextSpan(
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: FoxColors.text,
                                            height: 1.35,
                                          ),
                                          children: [
                                            TextSpan(
                                              text: "Нед. ${block.weeks} ",
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                                color: FoxColors.primary,
                                              ),
                                            ),
                                            TextSpan(
                                              text: "${block.phase} — ${block.detail}",
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              "Старт: ${_plan!.startedAt} · Сейчас неделя $_currentWeek из 8",
                              style: const TextStyle(color: FoxColors.muted),
                            ),
                            const SizedBox(height: 12),
                            WeekSelector(
                              weeks: _plan!.weeks,
                              currentWeek: _currentWeek,
                              selectedWeek: _selectedWeek,
                              onSelect: (w) => setState(() => _selectedWeek = w),
                            ),
                            if (banner != null)
                              Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: FoxColors.primarySoft,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  banner,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: FoxColors.primaryDark,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            if (summary != null) ...[
                              const SizedBox(height: 16),
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "Неделя $_selectedWeek: ${week!.phase}",
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      CompactProductChips(
                                        items: summary.allowed,
                                        label: "Можно",
                                        tone: ChipTone.green,
                                        previewCount: 8,
                                      ),
                                      const SizedBox(height: 8),
                                      CompactProductChips(
                                        items: summary.forbidden,
                                        label: "Исключить",
                                        tone: ChipTone.red,
                                        previewCount: 8,
                                        collapsedByDefault: summary.forbidden.length > 8,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
        ),
      ],
    );
  }
}
