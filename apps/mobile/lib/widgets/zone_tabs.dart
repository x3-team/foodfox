import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/theme/fox_theme.dart";

class ZoneTabs extends StatelessWidget {
  const ZoneTabs({
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
    return Row(
      children: Zone.values.map((zone) {
        final isActive = active == zone;
        final color = switch (zone) {
          Zone.green => FoxColors.green,
          Zone.yellow => FoxColors.yellow,
          Zone.red => FoxColors.red,
        };
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: zone != Zone.red ? 8 : 0,
            ),
            child: Material(
              color: isActive ? color : FoxColors.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: isActive
                    ? BorderSide.none
                    : const BorderSide(color: FoxColors.border),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => onChanged(zone),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive ? Colors.white70 : color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        switch (zone) {
                          Zone.green => "Зелёные",
                          Zone.yellow => "Жёлтые",
                          Zone.red => "Красные",
                        },
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isActive ? Colors.white : FoxColors.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "${counts.forZone(zone)}",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isActive ? Colors.white : FoxColors.text,
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
    );
  }
}

class ZoneDot extends StatelessWidget {
  const ZoneDot({super.key, required this.zone});

  final Zone zone;

  @override
  Widget build(BuildContext context) {
    final color = switch (zone) {
      Zone.green => FoxColors.green,
      Zone.yellow => FoxColors.yellow,
      Zone.red => FoxColors.red,
    };
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
