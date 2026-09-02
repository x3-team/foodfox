import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/list_pagination.dart";

enum WeekStatus { past, current, future }

WeekStatus weekStatus(int week, int currentWeek) {
  if (week < currentWeek) return WeekStatus.past;
  if (week == currentWeek) return WeekStatus.current;
  return WeekStatus.future;
}

class WeekSelector extends StatelessWidget {
  const WeekSelector({
    super.key,
    required this.currentWeek,
    required this.selectedWeek,
    required this.onSelect,
  });

  final int currentWeek;
  final int selectedWeek;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final group in planProtocol) ...[
          Text(
            "${group.phase} · нед. ${group.weeks}",
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: FoxColors.muted,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _weeksForGroup(group.weeks).map((weekNumber) {
              final active = weekNumber == selectedWeek;
              final status = weekStatus(weekNumber, currentWeek);
              final label = switch (status) {
                WeekStatus.past => "пройдена",
                WeekStatus.current => "сейчас",
                WeekStatus.future => "далее",
              };

              return FilterChip(
                label: Text(
                  "${status == WeekStatus.past && !active ? "✓ " : ""}Нед. $weekNumber · $label",
                ),
                selected: active,
                onSelected: (_) => onSelect(weekNumber),
                selectedColor: FoxColors.primary,
                checkmarkColor: Colors.white,
                labelStyle: TextStyle(
                  color: active ? Colors.white : FoxColors.text,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
                side: status == WeekStatus.current && !active
                    ? const BorderSide(color: FoxColors.primary, width: 1.5)
                    : BorderSide(color: FoxColors.border),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  List<int> _weeksForGroup(String range) {
    final parts = range.split("–");
    final start = int.parse(parts[0]);
    final end = int.parse(parts[1]);
    return [for (var w = start; w <= end; w++) w];
  }
}

String? phaseBannerText(int currentWeek, int selectedWeek) {
  if (selectedWeek != currentWeek) return null;
  if (currentWeek == 5) {
    return "Элиминация завершена — началась стабилизация (нед. 5–6).";
  }
  if (currentWeek == 7) {
    return "Финальная фаза — расширение (нед. 7–8), жёлтая зона по ротации.";
  }
  if (currentWeek == 8) {
    return "Последняя неделя плана.";
  }
  if (currentWeek <= 4) {
    return "Сейчас элиминация — нед. $currentWeek из 4. Дальше откроются нед. 5–8.";
  }
  return null;
}
