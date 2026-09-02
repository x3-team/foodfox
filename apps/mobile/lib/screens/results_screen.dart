import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/list_pagination.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/paginated_string_section.dart";
import "package:foodfox/widgets/zone_tabs.dart";

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({
    super.key,
    required this.api,
    this.reloadToken = 0,
    this.onAskBot,
  });

  final FoodFoxApi api;
  final int reloadToken;
  final void Function(String question)? onAskBot;

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  Zone _zone = Zone.green;
  var _loading = true;
  String? _error;
  List<ResultItem> _results = [];
  ZoneCounts _counts = ZoneCounts(green: 0, yellow: 0, red: 0);
  var _visibleCount = listInitialCount;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant ResultsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reloadToken != widget.reloadToken) _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.fetchResults();
      if (!mounted) return;
      setState(() {
        _results = data.results;
        _counts = data.counts;
        _visibleCount = listInitialCount;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _onZoneChanged(Zone zone) {
    setState(() {
      _zone = zone;
      _visibleCount = listInitialCount;
    });
  }

  void _loadMore(int total) {
    if (_visibleCount >= total) return;
    setState(() => _visibleCount = bumpVisibleCount(_visibleCount, total));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _results.where((r) => r.zone == _zone).toList();
    final visible = filtered.take(_visibleCount).toList();
    final hasMore = _visibleCount < filtered.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageHeader(
          title: "Мои результаты",
          subtitle: "Продукты по зонам IgG — зелёные можно без ограничений",
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: FoxColors.primary,
            child: IncrementalScrollLoader(
              itemCount: filtered.length,
              onLoadMore: () => _loadMore(filtered.length),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                children: [
                  ZoneTabs(
                    active: _zone,
                    counts: _counts,
                    onChanged: _onZoneChanged,
                  ),
                  const SizedBox(height: 16),
                  if (_loading)
                    ...List.generate(
                      3,
                      (_) => Container(
                        height: 56,
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: FoxColors.border.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    )
                  else if (_error != null)
                    Text(_error!, style: const TextStyle(color: FoxColors.red))
                  else if (filtered.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: foxCardDecoration,
                      child: const Text(
                        "Пока нет данных по этой зоне. Загрузите отчёт FOX.",
                        textAlign: TextAlign.center,
                        style: TextStyle(color: FoxColors.muted),
                      ),
                    )
                  else ...[
                    if (filtered.length > listInitialCount)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          "Показано ${visible.length} из ${filtered.length}",
                          style: const TextStyle(fontSize: 13, color: FoxColors.muted),
                        ),
                      ),
                    ...visible.map(
                      (item) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: foxCardDecoration,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                ZoneDot(zone: item.zone),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    item.foxName,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w500,
                                      color: FoxColors.text,
                                    ),
                                  ),
                                ),
                                Text(
                                  formatValue(item.valueUgMl, item.isFloorValue),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: FoxColors.muted,
                                  ),
                                ),
                              ],
                            ),
                            if (widget.onAskBot != null) ...[
                              const SizedBox(height: 8),
                              GestureDetector(
                                onTap: () =>
                                    widget.onAskBot!("Можно ли ${item.foxName}?"),
                                child: const Text(
                                  "Спросить бота →",
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: FoxColors.primary,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    if (hasMore)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          "Прокрутите вниз — подгрузим ещё",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: FoxColors.muted),
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
