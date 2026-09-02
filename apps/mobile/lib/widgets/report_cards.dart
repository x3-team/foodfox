import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/zone_donut.dart";

String zoneShortLabel(Zone zone) => switch (zone) {
      Zone.green => "Зелёные",
      Zone.yellow => "Жёлтые",
      Zone.red => "Красные",
    };

String zoneFullLabel(Zone zone) => switch (zone) {
      Zone.green => "Зелёная зона",
      Zone.yellow => "Жёлтая зона",
      Zone.red => "Красная зона",
    };

String zoneHint(Zone zone) => switch (zone) {
      Zone.green => "Можно без ограничений",
      Zone.yellow => "Ротация раз в 4 дня",
      Zone.red => "Временная элиминация",
    };

int percentOf(int value, int total) => total <= 0 ? 0 : ((value / total) * 100).round();

/// Bar length is relative to the zone's own range so items stay comparable
/// against their neighbours instead of every red item rendering as a full bar.
double intensityFraction(double? value, Zone zone, double max) {
  if (value == null) return 0.08;

  final double fraction = switch (zone) {
    Zone.green => value / 10,
    Zone.yellow => (value - 10) / 10,
    Zone.red => (value - 20) / (max - 20 < 1 ? 1 : max - 20),
  };

  return fraction.clamp(0.08, 1.0);
}

double maxResultValue(List<ResultItem> results) {
  var max = 21.0;
  for (final r in results) {
    if ((r.valueUgMl ?? 0) > max) max = r.valueUgMl!;
  }
  return max;
}

List<ResultItem> topTriggers(List<ResultItem> results, {int limit = 5}) {
  final red = results.where((r) => r.zone == Zone.red && r.valueUgMl != null).toList()
    ..sort((a, b) => (b.valueUgMl ?? 0).compareTo(a.valueUgMl ?? 0));
  return red.take(limit).toList();
}

String summaryHeadline(ZoneCounts counts) {
  final total = counts.green + counts.yellow + counts.red;
  if (total == 0) return "Загрузите отчёт FOX, чтобы увидеть свои зоны";
  final greenPct = percentOf(counts.green, total);
  if (counts.red == 0) {
    return "Отличный результат: выраженных реакций нет, $greenPct% продуктов доступны свободно";
  }
  return "$greenPct% продуктов доступны без ограничений, ${counts.red} — под временной элиминацией";
}

class ReportSummary extends StatelessWidget {
  const ReportSummary({super.key, required this.counts, required this.onSelectZone});

  final ZoneCounts counts;
  final ValueChanged<Zone> onSelectZone;

  @override
  Widget build(BuildContext context) {
    final total = counts.green + counts.yellow + counts.red;

    return Container(
      decoration: foxCardDecoration,
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(
              children: [
                ZoneDonut(counts: counts),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    children: Zone.values.map((zone) {
                      final value = counts.forZone(zone);
                      return InkWell(
                        onTap: () => onSelectZone(zone),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: zoneColor(zone),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      zoneShortLabel(zone),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: FoxColors.text,
                                        height: 1.2,
                                      ),
                                    ),
                                    Text(
                                      zoneHint(zone),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: FoxColors.muted,
                                        height: 1.2,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    "$value",
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: FoxColors.text,
                                      height: 1.1,
                                    ),
                                  ),
                                  Text(
                                    "${percentOf(value, total)}%",
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: FoxColors.muted,
                                      height: 1.1,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: double.infinity,
            color: FoxColors.primarySoft.withValues(alpha: 0.6),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Text(
              summaryHeadline(counts),
              style: const TextStyle(
                fontSize: 13,
                color: FoxColors.primaryDark,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class TopTriggers extends StatelessWidget {
  const TopTriggers({super.key, required this.items});

  final List<ResultItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: foxCardDecoration,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Главные триггеры",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: FoxColors.text),
              ),
              Text("µg/ml IgG", style: TextStyle(fontSize: 12, color: FoxColors.muted)),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            "Самые высокие реакции — их убираем первыми",
            style: TextStyle(fontSize: 12, color: FoxColors.muted, height: 1.3),
          ),
          const SizedBox(height: 10),
          ...items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFEF2F2),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      "${index + 1}",
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: FoxColors.red,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.foxName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14, color: FoxColors.text),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.valueUgMl!.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: FoxColors.red,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class ZoneSegments extends StatelessWidget {
  const ZoneSegments({
    super.key,
    required this.active,
    required this.counts,
    required this.onChanged,
  });

  final Zone active;
  final ZoneCounts counts;
  final ValueChanged<Zone> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: foxCardDecoration,
      padding: const EdgeInsets.all(6),
      child: Row(
        children: Zone.values.map((zone) {
          final isActive = active == zone;
          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: zone != Zone.red ? 6 : 0),
              child: Material(
                color: isActive ? zoneColor(zone) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => onChanged(zone),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      children: [
                        Text(
                          "${counts.forZone(zone)}",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            height: 1,
                            color: isActive ? Colors.white : FoxColors.text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          zoneShortLabel(zone),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            height: 1,
                            color: isActive
                                ? Colors.white.withValues(alpha: 0.85)
                                : FoxColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class ResultRow extends StatelessWidget {
  const ResultRow({
    super.key,
    required this.item,
    required this.max,
    this.onAskBot,
  });

  final ResultItem item;
  final double max;
  final void Function(String question)? onAskBot;

  @override
  Widget build(BuildContext context) {
    final fraction = intensityFraction(item.valueUgMl, item.zone, max);
    final color = zoneColor(item.zone);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: foxCardDecoration,
      child: Row(
        children: [
          Container(
            width: 4,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.25 + fraction * 0.75),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.foxName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: FoxColors.text,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: fraction,
                          minHeight: 4,
                          backgroundColor: FoxColors.border,
                          valueColor: AlwaysStoppedAnimation(color),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      formatValue(item.valueUgMl, item.isFloorValue),
                      style: const TextStyle(fontSize: 12, color: FoxColors.muted),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (onAskBot != null)
            TextButton(
              onPressed: () => onAskBot!("Можно ли ${item.foxName}?"),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                "Спросить",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: FoxColors.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
