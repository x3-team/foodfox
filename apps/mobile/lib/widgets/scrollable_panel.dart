import "dart:math" show max, min;

import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";

const listVisibleRows = 7;
const listRowHeight = 68.0;
const listRowGap = 8.0;

double scrollListViewportHeight(BuildContext context, {int visibleRows = listVisibleRows}) {
  final target = visibleRows * listRowHeight + (visibleRows - 1) * listRowGap;
  final maxFromScreen = MediaQuery.sizeOf(context).height * 0.42;
  return min(target, max(320.0, maxFromScreen));
}

/// ~7 rows on screen; fixed height so search empty state does not jump layout.
class ScrollablePanel extends StatelessWidget {
  const ScrollablePanel({
    super.key,
    required this.itemCount,
    required this.child,
    this.emptyMessage,
  });

  final int itemCount;
  final Widget child;
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    final scrollable = itemCount > listVisibleRows;
    final height = scrollListViewportHeight(context);
    final isEmpty = itemCount == 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (scrollable)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              "$itemCount ${_productLabel(itemCount)} · прокрутите список ↓",
              style: const TextStyle(fontSize: 12, color: FoxColors.muted),
            ),
          ),
        Stack(
          children: [
            Container(
              height: height,
              decoration: BoxDecoration(
                color: FoxColors.surface.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: FoxColors.border.withValues(alpha: 0.7)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                          child: Text(
                            emptyMessage ?? "Нет элементов",
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 15, color: FoxColors.muted),
                          ),
                        ),
                      )
                    : scrollable
                        ? Scrollbar(
                            thumbVisibility: true,
                            radius: const Radius.circular(8),
                            child: child,
                          )
                        : child,
              ),
            ),
            if (scrollable)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 28,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          FoxColors.surface,
                          FoxColors.surface.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  String _productLabel(int n) {
    final mod10 = n % 10;
    final mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return "продуктов";
    if (mod10 == 1) return "продукт";
    if (mod10 >= 2 && mod10 <= 4) return "продукта";
    return "продуктов";
  }
}
