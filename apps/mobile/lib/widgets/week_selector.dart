import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";

enum WeekStatus { past, current, future }

WeekStatus weekStatus(int week, int currentWeek) {
  if (week < currentWeek) return WeekStatus.past;
  if (week == currentWeek) return WeekStatus.current;
  return WeekStatus.future;
}

class WeekSelector extends StatelessWidget {
  const WeekSelector({
    super.key,
    required this.weeks,
    required this.currentWeek,
    required this.selectedWeek,
    required this.onSelect,
  });

  final List<PlanWeekItem> weeks;
  final int currentWeek;
  final int selectedWeek;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final pillWidth = MediaQuery.sizeOf(context).width * 0.26;

    return Stack(
      children: [
        SizedBox(
          height: 58,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(right: 20),
            itemCount: weeks.length,
            separatorBuilder: (context, index) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final w = weeks[index];
              final active = w.weekNumber == selectedWeek;
              final status = weekStatus(w.weekNumber, currentWeek);
              final isCurrent = status == WeekStatus.current;

              return SizedBox(
                width: pillWidth,
                child: Material(
                  color: active ? FoxColors.primary : FoxColors.surface,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isCurrent && !active ? FoxColors.primary : FoxColors.border,
                      width: isCurrent && !active ? 1.5 : 1,
                    ),
                  ),
                  child: InkWell(
                    onTap: () => onSelect(w.weekNumber),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "${status == WeekStatus.past && !active ? "✓ " : ""}Нед. ${w.weekNumber}",
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: active ? Colors.white : FoxColors.text,
                            ),
                          ),
                          Text(
                            w.phase,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: active ? Colors.white.withValues(alpha: 0.85) : FoxColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        Positioned(
          right: 0,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Container(
              width: 24,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    FoxColors.bg.withValues(alpha: 0),
                    FoxColors.bg,
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

String? phaseBannerText(int currentWeek, int selectedWeek) {
  if (selectedWeek != currentWeek) return null;
  if (currentWeek == 5) {
    return "Элиминация завершена — началась стабилизация (нед. 5–6).";
  }
  if (currentWeek == 7) {
    return "Финальная фаза — расширение (нед. 7–8).";
  }
  if (currentWeek == 8) {
    return "Последняя неделя плана.";
  }
  if (currentWeek <= 4) {
    return "Листайте плашки вправо — всего 8 недель.";
  }
  return null;
}
