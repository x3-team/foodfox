import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/report_cards.dart";
import "package:foodfox/widgets/scrollable_panel.dart";

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({
    super.key,
    required this.api,
    this.reloadToken = 0,
    this.onAskBot,
    this.onOpenPlan,
  });

  final FoodFoxApi api;
  final int reloadToken;
  final void Function(String question)? onAskBot;
  final VoidCallback? onOpenPlan;

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  Zone _zone = Zone.green;
  var _loading = true;
  String? _error;
  List<ResultItem> _results = [];
  ZoneCounts _counts = ZoneCounts(green: 0, yellow: 0, red: 0);
  final _searchController = TextEditingController();
  var _query = "";

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
    setState(() => _zone = zone);
  }

  List<ResultItem> _filteredForZone() {
    final q = _query.trim().toLowerCase();
    final inZone = _results.where((r) {
      if (r.zone != _zone) return false;
      if (q.isEmpty) return true;
      return r.foxName.toLowerCase().contains(q);
    }).toList();

    if (_zone == Zone.green) {
      inZone.sort((a, b) => a.foxName.compareTo(b.foxName));
    } else {
      inZone.sort((a, b) => (b.valueUgMl ?? 0).compareTo(a.valueUgMl ?? 0));
    }
    return inZone;
  }

  @override
  Widget build(BuildContext context) {
    final total = _counts.green + _counts.yellow + _counts.red;
    final filtered = _filteredForZone();
    final scaleMax = maxResultValue(_results);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageHeader(
          title: "Отчёт FOX",
          subtitle: "Ваши IgG-реакции по зонам",
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            color: FoxColors.primary,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              children: [
                if (_loading)
                  ...List.generate(
                    4,
                    (i) => Container(
                      height: i == 0 ? 200 : 64,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: FoxColors.border.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  )
                else if (_error != null)
                  Text(_error!, style: const TextStyle(color: FoxColors.red))
                else if (total == 0)
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: foxCardDecoration,
                    child: const Column(
                      children: [
                        Text(
                          "Отчёт пока не загружен",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: 8),
                        Text(
                          "Загрузите PDF FOX на вкладке «Отчёт» — разберём 286 антигенов по зонам.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: FoxColors.muted, height: 1.4),
                        ),
                      ],
                    ),
                  )
                else ...[
                  ReportSummary(counts: _counts, onSelectZone: _onZoneChanged),
                  const SizedBox(height: 12),
                  if (widget.onOpenPlan != null || widget.onAskBot != null)
                    Row(
                      children: [
                        if (widget.onOpenPlan != null)
                          Expanded(
                            child: FilledButton(
                              onPressed: widget.onOpenPlan,
                              style: FilledButton.styleFrom(
                                backgroundColor: FoxColors.primary,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: const Text("Открыть план"),
                            ),
                          ),
                        if (widget.onOpenPlan != null && widget.onAskBot != null)
                          const SizedBox(width: 8),
                        if (widget.onAskBot != null)
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () =>
                                  widget.onAskBot!("Что мне важно знать по моему отчёту?"),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: FoxColors.primary,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                side: const BorderSide(color: FoxColors.border),
                              ),
                              child: const Text("Спросить бота"),
                            ),
                          ),
                      ],
                    ),
                  const SizedBox(height: 12),
                  TopTriggers(items: topTriggers(_results)),
                  const SizedBox(height: 12),
                  ZoneSegments(
                    active: _zone,
                    counts: _counts,
                    onChanged: _onZoneChanged,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        zoneFullLabel(_zone),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: FoxColors.text,
                        ),
                      ),
                      Text(
                        zoneHint(_zone),
                        style: const TextStyle(fontSize: 12, color: FoxColors.muted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: "Поиск продукта…",
                      prefixIcon: const Icon(Icons.search, size: 20, color: FoxColors.muted),
                      filled: true,
                      fillColor: FoxColors.surface,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: FoxColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: FoxColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: FoxColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ScrollablePanel(
                    itemCount: filtered.length,
                    emptyMessage: _query.isEmpty
                        ? "Нет продуктов в этой зоне"
                        : "Ничего не найдено по «$_query»",
                    child: filtered.isEmpty
                        ? const SizedBox.shrink()
                        : ListView.builder(
                            padding: const EdgeInsets.all(4),
                            physics: filtered.length > listVisibleRows
                                ? const ClampingScrollPhysics()
                                : const NeverScrollableScrollPhysics(),
                            shrinkWrap: filtered.length <= listVisibleRows,
                            itemCount: filtered.length,
                            itemBuilder: (context, index) => ResultRow(
                              item: filtered[index],
                              max: scaleMax,
                              onAskBot: widget.onAskBot,
                            ),
                          ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
