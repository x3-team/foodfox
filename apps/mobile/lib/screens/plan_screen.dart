import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/list_pagination.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/paginated_string_section.dart";

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
      final plan = await widget.api.fetchPlan();
      setState(() {
        _plan = plan;
        if (plan != null && plan.weeks.isNotEmpty) {
          _selectedWeek = plan.weeks.first.weekNumber;
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
                                    "Структура 8 недель",
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
                              "Старт: ${_plan!.startedAt}",
                              style: const TextStyle(color: FoxColors.muted),
                            ),
                            const SizedBox(height: 12),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: _plan!.weeks.map((w) {
                                  final active = w.weekNumber == _selectedWeek;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 8),
                                    child: ChoiceChip(
                                      label: Text("Нед. ${w.weekNumber} · ${w.phase}"),
                                      selected: active,
                                      onSelected: (_) =>
                                          setState(() => _selectedWeek = w.weekNumber),
                                    ),
                                  );
                                }).toList(),
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
                                      const Text(
                                        "МОЖНО",
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: FoxColors.green,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      PaginatedStringSection(items: summary.allowed),
                                      const SizedBox(height: 12),
                                      const Text(
                                        "ИСКЛЮЧИТЬ",
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: FoxColors.red,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      PaginatedStringSection(
                                        items: summary.forbidden,
                                        textColor: FoxColors.text,
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
