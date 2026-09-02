import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/list_pagination.dart";

class PaginatedStringSection extends StatefulWidget {
  const PaginatedStringSection({
    super.key,
    required this.items,
    this.textColor = FoxColors.text,
  });

  final List<String> items;
  final Color textColor;

  @override
  State<PaginatedStringSection> createState() => _PaginatedStringSectionState();
}

class _PaginatedStringSectionState extends State<PaginatedStringSection> {
  var _visible = listInitialCount;

  @override
  void didUpdateWidget(covariant PaginatedStringSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items != widget.items) {
      _visible = listInitialCount;
    }
  }

  void _loadMore() {
    setState(() {
      _visible = (_visible + listStepCount).clamp(0, widget.items.length);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return const Text("—", style: TextStyle(color: FoxColors.text));
    }

    final shown = widget.items.take(_visible).toList();
    final hasMore = _visible < widget.items.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...shown.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              item,
              style: TextStyle(fontSize: 14, color: widget.textColor, height: 1.35),
            ),
          ),
        ),
        if (widget.items.length > listInitialCount)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              "Показано ${shown.length} из ${widget.items.length}",
              style: const TextStyle(fontSize: 12, color: FoxColors.muted),
            ),
          ),
        if (hasMore)
          TextButton(
            onPressed: _loadMore,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              "Показать ещё 5",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: FoxColors.primary),
            ),
          ),
      ],
    );
  }
}

/// Scroll parent must wrap [child]; loads more when user scrolls near the bottom.
class IncrementalScrollLoader extends StatefulWidget {
  const IncrementalScrollLoader({
    super.key,
    required this.itemCount,
    required this.onLoadMore,
    required this.child,
  });

  final int itemCount;
  final VoidCallback onLoadMore;
  final Widget child;

  @override
  State<IncrementalScrollLoader> createState() => _IncrementalScrollLoaderState();
}

class _IncrementalScrollLoaderState extends State<IncrementalScrollLoader> {
  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.pixels >= n.metrics.maxScrollExtent - 120) {
          widget.onLoadMore();
        }
        return false;
      },
      child: widget.child,
    );
  }
}

int bumpVisibleCount(int current, int total) {
  return (current + listStepCount).clamp(0, total);
}
