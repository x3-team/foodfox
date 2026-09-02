import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/widgets/list_pagination.dart";

enum ChipTone { green, red, yellow }

class CompactProductChips extends StatefulWidget {
  const CompactProductChips({
    super.key,
    required this.items,
    required this.label,
    required this.tone,
    this.previewCount = 6,
    this.collapsedByDefault = false,
  });

  final List<String> items;
  final String label;
  final ChipTone tone;
  final int previewCount;
  final bool collapsedByDefault;

  @override
  State<CompactProductChips> createState() => _CompactProductChipsState();
}

class _CompactProductChipsState extends State<CompactProductChips> {
  late var _open = !widget.collapsedByDefault || widget.items.length <= widget.previewCount;
  var _visible = listInitialCount;

  @override
  void didUpdateWidget(covariant CompactProductChips oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.items != widget.items) {
      _open = !widget.collapsedByDefault || widget.items.length <= widget.previewCount;
      _visible = listInitialCount;
    }
  }

  (Color bg, Color fg, Color ring) _colors() {
    switch (widget.tone) {
      case ChipTone.green:
        return (const Color(0xFFECFDF5), const Color(0xFF065F46), const Color(0xFFA7F3D0));
      case ChipTone.red:
        return (const Color(0xFFFEF2F2), const Color(0xFF991B1B), const Color(0xFFFECACA));
      case ChipTone.yellow:
        return (const Color(0xFFFFFBEB), const Color(0xFF92400E), const Color(0xFFFDE68A));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: FoxColors.bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text("${widget.label}: нет данных", style: const TextStyle(color: FoxColors.muted)),
      );
    }

    final colors = _colors();
    final shown = widget.items.take(_visible).toList();
    final hasMore = _visible < widget.items.length;
    final countLabel = _productCountLabel(widget.items.length);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: FoxColors.border),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _open = !_open),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.label.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: FoxColors.muted,
                            letterSpacing: 0.4,
                          ),
                        ),
                        if (!_open) ...[
                          const SizedBox(height: 4),
                          Text(
                            "$countLabel · нажмите, чтобы раскрыть",
                            style: const TextStyle(fontSize: 13, color: FoxColors.muted),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: colors.$1,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: colors.$3),
                    ),
                    child: Text(
                      "${widget.items.length}",
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colors.$2),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(_open ? Icons.expand_less : Icons.expand_more, size: 18, color: FoxColors.muted),
                ],
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 112),
                    child: SingleChildScrollView(
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          ...shown.map(
                            (item) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: colors.$1,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: colors.$3),
                              ),
                              child: Text(
                                item,
                                style: TextStyle(fontSize: 12, color: colors.$2, height: 1.3),
                                softWrap: true,
                              ),
                            ),
                          ),
                          if (hasMore)
                            ActionChip(
                              label: Text("+${widget.items.length - _visible}"),
                              onPressed: () => setState(
                                () => _visible = bumpVisibleCount(_visible, widget.items.length),
                              ),
                              backgroundColor: FoxColors.primarySoft,
                              labelStyle: const TextStyle(
                                color: FoxColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class CompactDayDetails extends StatelessWidget {
  const CompactDayDetails({
    super.key,
    required this.allowed,
    required this.forbidden,
    this.rotation = const [],
  });

  final List<String> allowed;
  final List<String> forbidden;
  final List<String> rotation;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CompactProductChips(items: allowed, label: "Можно", tone: ChipTone.green),
        const SizedBox(height: 8),
        CompactProductChips(
          items: forbidden,
          label: "Исключить",
          tone: ChipTone.red,
          collapsedByDefault: forbidden.length > 5,
        ),
        if (rotation.isNotEmpty) ...[
          const SizedBox(height: 8),
          CompactProductChips(items: rotation, label: "Ротация", tone: ChipTone.yellow, previewCount: 4),
        ],
      ],
    );
  }
}

String _productCountLabel(int n) {
  final mod10 = n % 10;
  final mod100 = n % 100;
  if (mod10 == 1 && mod100 != 11) return "$n продукт";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "$n продукта";
  return "$n продуктов";
}
