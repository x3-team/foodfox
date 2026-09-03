import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/compact_product_chips.dart";
import "package:foodfox/widgets/list_pagination.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/week_selector.dart";

class PlanScreen extends StatefulWidget {
  const PlanScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  PlanData? _planMeta;
  List<PlanWeekItem> _weekTabs = [];
  final Map<int, PlanWeekItem> _loadedWeeks = {};
  var _loading = false;
  var _weekLoading = false;
  var _selectedWeek = 1;
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
        _weekTabs = data.weekTabs;
        _currentWeek = data.currentWeek;
        _selectedWeek = data.currentWeek.clamp(1, 8);
        _loadedWeeks.clear();
        if (data.plan != null && data.plan!.weeks.isNotEmpty) {
          final w = data.plan!.weeks.first;
          _loadedWeeks[w.weekNumber] = w;
        }
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectWeek(int week) async {
    if (_selectedWeek == week && _loadedWeeks.containsKey(week)) return;
    setState(() => _selectedWeek = week);

    if (_loadedWeeks.containsKey(week)) return;

    setState(() => _weekLoading = true);
    try {
      final data = await widget.api.fetchPlan(week: week);
      if (!mounted) return;
      final loaded = data.plan?.weeks.firstOrNull;
      if (loaded != null) {
        setState(() => _loadedWeeks[week] = loaded);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst("Exception: ", ""))),
        );
      }
    } finally {
      if (mounted) setState(() => _weekLoading = false);
    }
  }

  List<PlanWeekItem> get _selectorWeeks {
    if (_weekTabs.isNotEmpty) {
      return _weekTabs.map((tab) {
        return _loadedWeeks[tab.weekNumber] ??
            PlanWeekItem(
              weekNumber: tab.weekNumber,
              phase: tab.phase,
              days: const [],
            );
      }).toList();
    }
    return _loadedWeeks.values.toList();
  }

  @override
  Widget build(BuildContext context) {
    final week = _loadedWeeks[_selectedWeek];
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
                  ? NetworkErrorPanel(
                      error: _error!,
                      onRetry: () => _loader.sync(active: true, force: true),
                    )
                  : _planMeta == null
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
                              "Старт: ${_planMeta!.startedAt} · Сейчас неделя $_currentWeek из 8",
                              style: const TextStyle(color: FoxColors.muted),
                            ),
                            const SizedBox(height: 12),
                            WeekSelector(
                              weeks: _selectorWeeks,
                              currentWeek: _currentWeek,
                              selectedWeek: _selectedWeek,
                              onSelect: _selectWeek,
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
                            if (_weekLoading)
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 24),
                                child: Center(child: CircularProgressIndicator()),
                              )
                            else if (summary != null) ...[
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

extension _FirstOrNull<E> on List<E> {
  E? get firstOrNull => isEmpty ? null : first;
}
