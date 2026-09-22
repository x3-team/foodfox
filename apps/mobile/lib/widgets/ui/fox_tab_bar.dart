import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_icons.dart";

class FoxTab {
  const FoxTab({required this.kind, required this.label, this.badge = 0});

  final FoxIconKind kind;
  final String label;
  final int badge;
}

/// Bottom navigation matching the Figma `App/Tab bar` component.
class FoxTabBar extends StatelessWidget {
  const FoxTabBar({
    super.key,
    required this.tabs,
    required this.index,
    required this.onSelect,
  });

  final List<FoxTab> tabs;
  final int index;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: FoxTokens.bgCard,
        border: Border(top: BorderSide(color: FoxTokens.borderLight)),
      ),
      padding: EdgeInsets.only(top: 12, bottom: bottomInset > 0 ? 10 : 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: _TabItem(
                tab: tabs[i],
                active: i == index,
                onTap: () => onSelect(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _TabItem extends StatefulWidget {
  const _TabItem({
    required this.tab,
    required this.active,
    required this.onTap,
  });

  final FoxTab tab;
  final bool active;
  final VoidCallback onTap;

  @override
  State<_TabItem> createState() => _TabItemState();
}

class _TabItemState extends State<_TabItem>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pop = AnimationController(
    vsync: this,
    duration: FoxMotion.quick,
    lowerBound: 0,
    upperBound: 1,
  );

  @override
  void didUpdateWidget(covariant _TabItem oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _pop.forward(from: 0);
  }

  @override
  void dispose() {
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color =
        widget.active ? FoxTokens.textPrimary : const Color(0xFF8A8C84);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: _pop,
              builder: (context, child) {
                // 1 → 1.08 → 1 pop when the tab becomes active.
                final t = _pop.value;
                final scale = 1 + 0.08 * (t < 0.5 ? t * 2 : (1 - t) * 2);
                return Transform.scale(scale: scale, child: child);
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  FoxIcon(
                    kind: widget.tab.kind,
                    color: color,
                    filled: widget.active,
                  ),
                  if (widget.tab.badge > 0)
                    Positioned(
                      right: -4,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: FoxTokens.zoneRed,
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          widget.tab.badge > 9 ? "9+" : "${widget.tab.badge}",
                          style: FoxType.captionS.copyWith(
                            color: FoxTokens.textInverted,
                            fontSize: 10,
                            height: 1.2,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 5),
            AnimatedDefaultTextStyle(
              duration: FoxMotion.quick,
              style: FoxType.captionS.copyWith(
                fontSize: 11,
                color: color,
                fontWeight:
                    widget.active ? FontWeight.w500 : FontWeight.w400,
                fontVariations: [
                  FontVariation("wght", widget.active ? 500 : 400),
                ],
              ),
              child: Text(widget.tab.label),
            ),
          ],
        ),
      ),
    );
  }
}
