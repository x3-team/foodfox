import "dart:async";

import "package:flutter/material.dart";

import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 04 — the FOX report broken down by zones.
class ResultsScreen extends StatefulWidget {
  const ResultsScreen({
    super.key,
    required this.api,
    this.reloadToken = 0,
    this.onAskBot,
    this.onOpenPlan,
    this.onUpload,
  });

  final FoodFoxApi api;
  final int reloadToken;
  final void Function(String question)? onAskBot;
  final VoidCallback? onOpenPlan;
  final VoidCallback? onUpload;

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  /// null = «Все», otherwise the selected zone.
  Zone? _zone;
  var _loading = false;
  Object? _error;
  List<ResultItem> _results = [];
  ZoneCounts _counts = ZoneCounts(green: 0, yellow: 0, red: 0);
  final _searchController = TextEditingController();
  var _query = "";
  Timer? _debounce;
  late final LazyTabLoader _loader = LazyTabLoader(onLoad: () => _load());

  @override
  void initState() {
    super.initState();
    _loader.sync(active: true, reloadToken: widget.reloadToken);
    _searchController.addListener(() {
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 200), () {
        if (!mounted || _searchController.text == _query) return;
        setState(() => _query = _searchController.text);
      });
    });
  }

  @override
  void didUpdateWidget(covariant ResultsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reloadToken != widget.reloadToken) _load(force: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({bool force = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.fetchResults(force: force);
      if (!mounted) return;
      setState(() {
        _results = data.results;
        _counts = data.counts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  List<ResultItem> get _filtered {
    final q = _query.trim().toLowerCase();
    final list = _results.where((r) {
      if (_zone != null && r.zone != _zone) return false;
      if (q.isEmpty) return true;
      return r.foxName.toLowerCase().contains(q);
    }).toList();

    list.sort((a, b) {
      final byZone = _zoneRank(b.zone).compareTo(_zoneRank(a.zone));
      if (byZone != 0) return byZone;
      return (b.valueUgMl ?? 0).compareTo(a.valueUgMl ?? 0);
    });
    return list;
  }

  int _zoneRank(Zone z) => switch (z) {
    Zone.red => 2,
    Zone.yellow => 1,
    Zone.green => 0,
  };

  @override
  Widget build(BuildContext context) {
    final total = _counts.green + _counts.yellow + _counts.red;

    return RefreshIndicator(
      onRefresh: () => _load(force: true),
      color: FoxTokens.bgGreen,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        children: [
          _Header(onDownload: widget.onUpload),
          const SizedBox(height: 18),
          if (_loading && total == 0)
            ...List.generate(
              4,
              (i) => Container(
                height: i == 0 ? 168 : 68,
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: FoxTokens.bgGrey.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            )
          else if (_error != null)
            NetworkErrorPanel(
              error: _error!,
              onRetry: () => _loader.sync(active: true, force: true),
            )
          else if (total == 0)
            _EmptyState(onUpload: widget.onUpload)
          else ...[
            FoxFadeSlide(
              child: _Summary(counts: _counts, total: total),
            ),
            const SizedBox(height: 18),
            FoxFadeSlide(
              delay: FoxMotion.stagger,
              child: _SearchField(controller: _searchController),
            ),
            const SizedBox(height: 18),
            FoxFadeSlide(
              delay: FoxMotion.stagger * 2,
              child: _ZoneFilters(
                counts: _counts,
                total: total,
                selected: _zone,
                onSelect: (z) => setState(() => _zone = z),
              ),
            ),
            const SizedBox(height: 18),
            ..._buildRows(),
          ],
        ],
      ),
    );
  }

  List<Widget> _buildRows() {
    final rows = _filtered;
    if (rows.isEmpty) {
      return [
        FoxCard(
          tone: FoxCardTone.grey,
          child: Text(
            _query.isEmpty
                ? "В этой зоне нет продуктов"
                : "Ничего не найдено по «$_query»",
            textAlign: TextAlign.center,
            style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
          ),
        ),
      ];
    }

    // Long lists render without the entrance animation to stay smooth.
    final animate = rows.length <= 12;
    return [
      for (var i = 0; i < rows.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: animate
              ? FoxFadeSlide(
                  delay: FoxMotion.stagger * (i > 6 ? 6 : i),
                  offset: 10,
                  child: _ProductRow(item: rows[i], onAskBot: widget.onAskBot),
                )
              : _ProductRow(item: rows[i], onAskBot: widget.onAskBot),
        ),
    ];
  }
}

class _Header extends StatelessWidget {
  const _Header({this.onDownload});

  final VoidCallback? onDownload;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      const Expanded(
        child: FoxScreenTitle(
          title: "Мои результаты",
          subtitle: "FOX Food Xplorer",
        ),
      ),
      if (onDownload != null)
        FoxPressable(
          onTap: onDownload,
          child: Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: FoxTokens.bgCard,
              shape: BoxShape.circle,
              border: Border.all(color: FoxTokens.borderLight),
            ),
            child: const Icon(
              Icons.file_upload_outlined,
              size: 19,
              color: FoxTokens.textPrimary,
            ),
          ),
        ),
    ],
  );
}

class _Summary extends StatelessWidget {
  const _Summary({required this.counts, required this.total});

  final ZoneCounts counts;
  final int total;

  @override
  Widget build(BuildContext context) {
    final segments = <({double fraction, Color color})>[
      (fraction: counts.green / total, color: const Color(0xFFA3C644)),
      (fraction: counts.yellow / total, color: const Color(0xFFE8B44A)),
      (fraction: counts.red / total, color: const Color(0xFFC0563C)),
    ];

    return FoxCard(
      tone: FoxCardTone.dark,
      padding: const EdgeInsets.all(20),
      radius: FoxTokens.radiusHero,
      child: Row(
        children: [
          SizedBox(
            width: 104,
            height: 104,
            child: Stack(
              alignment: Alignment.center,
              children: [
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: FoxMotion.ring,
                  curve: FoxMotion.easeOut,
                  builder: (context, v, _) => CustomPaint(
                    size: const Size.square(104),
                    painter: FoxRingPainter(
                      segments: segments,
                      progress: v,
                      strokeWidth: 13,
                    ),
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FoxCountUp(
                      value: total,
                      style: FoxType.h4.copyWith(
                        color: FoxTokens.textInverted,
                        fontSize: 26,
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      "антигенов",
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.textInvertedSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final row in [
                  (counts.green, "Зелёная", const Color(0xFFA3C644)),
                  (counts.yellow, "Жёлтая", const Color(0xFFE8B44A)),
                  (counts.red, "Красная", const Color(0xFFC0563C)),
                ]) ...[
                  Row(
                    children: [
                      FoxZoneDot(color: row.$3),
                      const SizedBox(width: 10),
                      Text(
                        "${row.$1}",
                        style: FoxType.bodyS.copyWith(
                          color: FoxTokens.textInverted,
                          fontSize: 17,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        row.$2,
                        style: FoxType.captionS.copyWith(
                          color: FoxTokens.textInvertedSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  if (row.$2 != "Красная") const SizedBox(height: 12),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: FoxTokens.bgCard,
      borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
      border: Border.all(color: FoxTokens.borderLight),
    ),
    child: TextField(
      controller: controller,
      style: FoxType.bodyS.copyWith(color: FoxTokens.textPrimary),
      decoration: InputDecoration(
        hintText: "Поиск продукта",
        hintStyle: FoxType.bodyS.copyWith(color: FoxTokens.textSecondary),
        prefixIcon: const Icon(
          Icons.search_rounded,
          size: 20,
          color: FoxTokens.textSecondary,
        ),
        border: InputBorder.none,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 14,
        ),
      ),
    ),
  );
}

class _ZoneFilters extends StatelessWidget {
  const _ZoneFilters({
    required this.counts,
    required this.total,
    required this.selected,
    required this.onSelect,
  });

  final ZoneCounts counts;
  final int total;
  final Zone? selected;
  final ValueChanged<Zone?> onSelect;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(
      children: [
        FoxChip(
          label: "Все $total",
          selected: selected == null,
          onTap: () => onSelect(null),
        ),
        for (final z in Zone.values) ...[
          const SizedBox(width: 8),
          _ZoneChip(
            zone: z,
            count: counts.forZone(z),
            selected: selected == z,
            onTap: () => onSelect(z),
          ),
        ],
      ],
    ),
  );
}

class _ZoneChip extends StatelessWidget {
  const _ZoneChip({
    required this.zone,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final Zone zone;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = foxZoneForeground(zone.name);
    final bg = foxZoneBackground(zone.name);

    return FoxPressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: FoxMotion.quick,
        curve: FoxMotion.easeOut,
        padding: const EdgeInsets.fromLTRB(14, 9, 16, 9),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
          border: selected ? Border.all(color: fg, width: 1.5) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            FoxZoneDot(color: fg, size: 8),
            const SizedBox(width: 7),
            Text("$count", style: FoxType.label.copyWith(color: fg)),
          ],
        ),
      ),
    );
  }
}

class _ProductRow extends StatelessWidget {
  const _ProductRow({required this.item, this.onAskBot});

  final ResultItem item;
  final void Function(String question)? onAskBot;

  @override
  Widget build(BuildContext context) {
    final fg = foxZoneForeground(item.zone.name);

    return FoxCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      radius: 16,
      onTap: onAskBot == null
          ? null
          : () => onAskBot!("Можно ли мне ${item.foxName.toLowerCase()}?"),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.foxName,
                  style: FoxType.bodyS.copyWith(
                    color: FoxTokens.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _zoneLabel(item.zone),
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            item.isFloorValue
                ? "≤5"
                : (item.valueUgMl ?? 0).toStringAsFixed(1).replaceAll(".", ","),
            style: FoxType.bodyS.copyWith(
              color: fg,
              fontWeight: FontWeight.w500,
              fontSize: 15,
            ),
          ),
          const SizedBox(width: 10),
          FoxZoneDot(color: fg, size: 10),
        ],
      ),
    );
  }

  String _zoneLabel(Zone zone) => switch (zone) {
    Zone.green => "Зелёная зона · без ограничений",
    Zone.yellow => "Жёлтая зона · ротация раз в 4 дня",
    Zone.red => "Красная зона · элиминация",
  };
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({this.onUpload});

  final VoidCallback? onUpload;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      const SizedBox(height: 40),
      Container(
        width: 76,
        height: 76,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: FoxTokens.bgGrey,
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.description_outlined,
          size: 32,
          color: FoxTokens.textSecondary,
        ),
      ),
      const SizedBox(height: 18),
      Text(
        "Пока нет отчёта",
        textAlign: TextAlign.center,
        style: FoxType.h4.copyWith(color: FoxTokens.textPrimary),
      ),
      const SizedBox(height: 8),
      Text(
        "Загрузите PDF из лаборатории — распознаем 285 антигенов "
        "и соберём персональный протокол",
        textAlign: TextAlign.center,
        style: FoxType.bodyS.copyWith(
          color: FoxTokens.textSecondary,
          height: 21 / 16,
        ),
      ),
      const SizedBox(height: 28),
      if (onUpload != null)
        FoxButton(
          label: "Загрузить отчёт FOX",
          kind: FoxButtonKind.accent,
          onPressed: onUpload,
        ),
    ],
  );
}
