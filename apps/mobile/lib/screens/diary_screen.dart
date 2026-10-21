import "dart:async";

import "package:flutter/material.dart";

import "package:foodfox/models/diary.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/services/telemetry.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/utils/network_errors.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/ui/fox_keyboard.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 14 — symptom diary: today's entry, history as a list or a calendar,
/// and how wellbeing goes across the phases of the plan.
///
/// Figma has the entry card (wellbeing, five symptoms, save) and the recent
/// list. Drawn here in the same style: the plan week badge, the optional
/// «Что ели» and «Заметка» rows, the calendar, the day sheet, the red-zone
/// hint and the per-phase summary (docs/DIARY.md).
///
/// Entries are health data: the server keeps them encrypted, and analytics
/// get only the fact that one was saved.
class DiaryScreen extends StatefulWidget {
  const DiaryScreen({
    super.key,
    required this.api,
    this.from = "profile",
    this.clock,
  });

  final FoodFoxApi api;

  /// Where the diary was opened from, for analytics: `profile` or `chat`.
  final String from;

  /// Stands in for [DateTime.now] in tests.
  final DateTime Function()? clock;

  @override
  State<DiaryScreen> createState() => _DiaryScreenState();
}

class _DiaryScreenState extends State<DiaryScreen> {
  DiaryData? _data;
  Object? _error;
  bool _loading = true;
  bool _calendar = false;
  bool _showAll = false;
  late DateTime _month;

  DateTime get _now => widget.clock?.call() ?? DateTime.now();
  String get _today => diaryDayKey(_now);

  @override
  void initState() {
    super.initState();
    _month = DateTime(_now.year, _now.month);
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _data == null;
      _error = null;
    });
    try {
      final data = await widget.api.fetchDiary();
      if (!mounted) return;
      setState(() {
        _data = data;
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

  Future<DiaryEntry> _save(DiaryDraft draft) async {
    final entry = await widget.api.saveDiaryEntry(draft);
    // The fact of an entry, never what is in it.
    Telemetry.event(FoxEvent.diaryEntrySaved, {"from": widget.from});
    if (mounted) _replace(entry);
    return entry;
  }

  void _replace(DiaryEntry entry) {
    final data = _data;
    if (data == null) return;
    final entries = [entry, ...data.entries.where((e) => e.date != entry.date)]
      ..sort((a, b) => b.date.compareTo(a.date));
    setState(() => _data = DiaryData(context: data.context, entries: entries));
  }

  Future<void> _delete(String date) async {
    try {
      await widget.api.deleteDiaryEntry(date);
      final data = _data;
      if (!mounted || data == null) return;
      setState(
        () => _data = DiaryData(
          context: data.context,
          entries: data.entries.where((e) => e.date != date).toList(),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(formatNetworkError(e))));
    }
  }

  bool _editable(String date) {
    final ctx = _data?.context;
    final window = ctx?.editWindowDays ?? 30;
    final oldest = diaryDayKey(_now.subtract(Duration(days: window)));
    return date.compareTo(oldest) >= 0 && date.compareTo(_today) <= 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      body: SafeArea(child: _body()),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: FoxTokens.bgGreen),
      );
    }
    final data = _data;
    if (data == null) {
      return Column(
        children: [
          _BackRow(onTap: () => Navigator.of(context).maybePop()),
          Expanded(
            child: NetworkErrorPanel(error: _error ?? "", onRetry: _load),
          ),
        ],
      );
    }

    final ctx = data.context;
    final today = data.entryOn(_today);
    final history = _showAll ? data.entries : data.entries.take(7).toList();

    return RefreshIndicator(
      color: FoxTokens.bgGreen,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          _BackRow(onTap: () => Navigator.of(context).maybePop()),
          ...foxStagger([
            const FoxScreenTitle(
              title: "Дневник",
              subtitle: "Отмечайте самочувствие — нутрициолог видит динамику",
            ),
            if (ctx.weekNumber != null && ctx.phase != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: FoxStatusBadge(
                  label: "Неделя ${ctx.weekNumber} · ${ctx.phase}",
                  foreground: FoxTokens.zoneGreen,
                  background: FoxTokens.zoneGreenBg,
                ),
              ),
            ],
            const SizedBox(height: 16),
            FoxCard(
              key: const ValueKey("diary-today"),
              padding: const EdgeInsets.all(18),
              child: DiaryEntryForm(
                date: _today,
                initial: today,
                question: "Как сегодня самочувствие?",
                suggestions: ctx.foodSuggestions,
                onSave: _save,
              ),
            ),
            if (today != null && today.redFoods.isNotEmpty) ...[
              const SizedBox(height: 12),
              _RedFoodsHint(entry: today),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _calendar ? "Календарь" : "Последние записи",
                    style: FoxType.label.copyWith(
                      color: FoxTokens.textSecondary,
                    ),
                  ),
                ),
                _ViewToggle(
                  calendar: _calendar,
                  onChanged: (v) => setState(() => _calendar = v),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_calendar)
              _DiaryCalendar(
                month: _month,
                today: _today,
                entries: {for (final e in data.entries) e.date: e},
                canGoBack: _month.isAfter(DateTime(_now.year, _now.month - 3)),
                canGoForward: _month.isBefore(DateTime(_now.year, _now.month)),
                isEditable: _editable,
                onMonth: (m) => setState(() => _month = m),
                onDay: (date) => _openDay(date, data.entryOn(date)),
              )
            else if (data.entries.isEmpty)
              const _EmptyHistory()
            else ...[
              for (final e in history) ...[
                _HistoryRow(entry: e, onTap: () => _openDay(e.date, e)),
                const SizedBox(height: 8),
              ],
              if (!_showAll && data.entries.length > history.length)
                FoxButton(
                  label: "Показать все записи",
                  kind: FoxButtonKind.text,
                  size: FoxButtonSize.small,
                  onPressed: () => setState(() => _showAll = true),
                ),
            ],
            if (_phaseGroups(data.entries).isNotEmpty) ...[
              const SizedBox(height: 16),
              _PhaseSummary(groups: _phaseGroups(data.entries)),
            ],
          ]),
        ],
      ),
    );
  }

  /// Entries per plan phase, in plan order.
  Map<String, List<DiaryEntry>> _phaseGroups(List<DiaryEntry> entries) {
    final groups = <String, List<DiaryEntry>>{};
    final ordered = [...entries]
      ..sort((a, b) => (a.weekNumber ?? 0).compareTo(b.weekNumber ?? 0));
    for (final e in ordered) {
      final phase = e.phase;
      if (phase == null || phase.isEmpty) continue;
      groups.putIfAbsent(phase, () => []).add(e);
    }
    return groups;
  }

  Future<void> _openDay(String date, DiaryEntry? entry) async {
    final editable = _editable(date);
    if (entry == null) {
      if (editable) await _openEditor(date, null);
      return;
    }
    final action = await showModalBottomSheet<_DayAction>(
      context: context,
      backgroundColor: FoxTokens.bgNeutral,
      isScrollControlled: true,
      shape: _sheetShape,
      builder: (_) => _DaySheet(entry: entry, editable: editable),
    );
    if (!mounted) return;
    switch (action) {
      case _DayAction.edit:
        await _openEditor(date, entry);
      case _DayAction.delete:
        if (await _confirmDelete(date)) await _delete(date);
      case null:
        break;
    }
  }

  Future<void> _openEditor(String date, DiaryEntry? entry) {
    final isToday = date == _today;
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: FoxTokens.bgNeutral,
      isScrollControlled: true,
      shape: _sheetShape,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SheetHandle(),
                const SizedBox(height: 16),
                Text(
                  isToday ? "Сегодня" : diaryLongDate(date),
                  style: FoxType.h4.copyWith(color: FoxTokens.textPrimary),
                ),
                const SizedBox(height: 16),
                DiaryEntryForm(
                  date: date,
                  initial: entry,
                  question: isToday
                      ? "Как сегодня самочувствие?"
                      : "Как было самочувствие?",
                  // Today's plan does not describe another day's meals.
                  suggestions: isToday
                      ? _data?.context.foodSuggestions ?? const []
                      : const [],
                  onSave: (draft) async {
                    final saved = await _save(draft);
                    if (sheetContext.mounted) {
                      Timer(const Duration(milliseconds: 700), () {
                        if (sheetContext.mounted) {
                          Navigator.of(sheetContext).maybePop();
                        }
                      });
                    }
                    return saved;
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<bool> _confirmDelete(String date) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: FoxTokens.bgCard,
        title: Text(
          "Удалить запись за ${diaryLongDate(date)}?",
          style: FoxType.bodyM.copyWith(color: FoxTokens.textPrimary),
        ),
        content: Text(
          "Запись исчезнет и у нутрициолога.",
          style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text("Отмена"),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text("Удалить", style: TextStyle(color: FoxTokens.zoneRed)),
          ),
        ],
      ),
    );
    return ok ?? false;
  }
}

const _sheetShape = RoundedRectangleBorder(
  borderRadius: BorderRadius.vertical(
    top: Radius.circular(FoxTokens.radiusHero),
  ),
);

Color _wellbeingFg(Wellbeing w) => switch (w) {
  Wellbeing.bad => FoxTokens.zoneRed,
  Wellbeing.soSo => FoxTokens.zoneYellow,
  Wellbeing.good => FoxTokens.zoneGreen,
};

Color _wellbeingBg(Wellbeing w) => switch (w) {
  Wellbeing.bad => FoxTokens.zoneRedBg,
  Wellbeing.soSo => FoxTokens.zoneYellowBg,
  Wellbeing.good => FoxTokens.zoneGreenBg,
};

/// The entry card of the Figma screen, reused in the sheet for other days.
class DiaryEntryForm extends StatefulWidget {
  const DiaryEntryForm({
    super.key,
    required this.date,
    required this.question,
    required this.onSave,
    this.initial,
    this.suggestions = const [],
  });

  final String date;
  final String question;
  final DiaryEntry? initial;
  final List<String> suggestions;
  final Future<DiaryEntry> Function(DiaryDraft draft) onSave;

  @override
  State<DiaryEntryForm> createState() => _DiaryEntryFormState();
}

class _DiaryEntryFormState extends State<DiaryEntryForm> {
  Wellbeing? _wellbeing;
  final _symptoms = <Symptom>{};
  final _foods = <String>[];
  final _note = TextEditingController();
  final _food = TextEditingController();
  bool _showFoods = false;
  bool _showNote = false;
  bool _saving = false;
  bool _justSaved = false;
  bool _hasEntry = false;
  Timer? _savedTimer;

  @override
  void initState() {
    super.initState();
    final e = widget.initial;
    if (e != null) {
      _hasEntry = true;
      _wellbeing = e.wellbeing;
      _symptoms.addAll(e.symptoms);
      _foods.addAll(e.foods.map((f) => f.name));
      _note.text = e.note ?? "";
      _showFoods = _foods.isNotEmpty;
      _showNote = _note.text.isNotEmpty;
    }
  }

  @override
  void dispose() {
    _savedTimer?.cancel();
    _note.dispose();
    _food.dispose();
    super.dispose();
  }

  void _toggleFood(String name) {
    setState(() {
      if (!_foods.remove(name)) _foods.add(name);
    });
  }

  void _addFood() {
    final name = _food.text.trim().replaceAll(RegExp(r"\s+"), " ");
    if (name.isEmpty) return;
    final known = _foods.any((f) => f.toLowerCase() == name.toLowerCase());
    setState(() {
      if (!known && _foods.length < 20) _foods.add(name);
      _food.clear();
    });
  }

  Future<void> _submit() async {
    final wellbeing = _wellbeing;
    if (wellbeing == null || _saving) return;
    foxDismissKeyboard();
    if (_food.text.trim().isNotEmpty) _addFood();
    setState(() => _saving = true);
    try {
      await widget.onSave(
        DiaryDraft(
          date: widget.date,
          wellbeing: wellbeing,
          symptoms: _symptoms,
          note: _note.text,
          foods: List.of(_foods),
        ),
      );
      if (!mounted) return;
      setState(() {
        _saving = false;
        _justSaved = true;
        _hasEntry = true;
      });
      _savedTimer?.cancel();
      _savedTimer = Timer(const Duration(milliseconds: 1600), () {
        if (mounted) setState(() => _justSaved = false);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(formatNetworkError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final suggestions = widget.suggestions;
    final custom = _foods.where((f) => !suggestions.contains(f)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                widget.question,
                style: FoxType.bodyS.copyWith(
                  color: FoxTokens.textPrimary,
                  fontWeight: FontWeight.w500,
                  fontVariations: const [FontVariation("wght", 500)],
                ),
              ),
            ),
            if (_hasEntry && !_justSaved)
              Text(
                "записано",
                style: FoxType.captionS.copyWith(color: FoxTokens.zoneGreen),
              ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            for (final w in Wellbeing.values) ...[
              if (w != Wellbeing.bad) const SizedBox(width: 8),
              Expanded(
                child: _WellbeingTile(
                  wellbeing: w,
                  selected: _wellbeing == w,
                  onTap: () => setState(() => _wellbeing = w),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 14),
        Text(
          "Симптомы",
          style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final s in Symptom.values)
              _ToggleChip(
                label: s.label,
                selected: _symptoms.contains(s),
                onTap: () => setState(() {
                  if (!_symptoms.remove(s)) _symptoms.add(s);
                }),
              ),
          ],
        ),
        const SizedBox(height: 14),
        _OptionalSection(
          title: "Что ели",
          open: _showFoods,
          count: _foods.length,
          onOpen: () => setState(() => _showFoods = true),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (suggestions.isNotEmpty) ...[
                Text(
                  "Из плана на сегодня",
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final f in suggestions)
                    _ToggleChip(
                      label: f,
                      selected: _foods.contains(f),
                      onTap: () => _toggleFood(f),
                    ),
                  for (final f in custom)
                    _ToggleChip(
                      label: f,
                      selected: true,
                      removable: true,
                      onTap: () => _toggleFood(f),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              _InlineField(
                controller: _food,
                hint: "Добавить продукт",
                maxLength: 60,
                onSubmitted: (_) => _addFood(),
                trailing: FoxPressable(
                  onTap: _addFood,
                  child: const Padding(
                    padding: EdgeInsets.all(10),
                    child: Icon(
                      Icons.add_rounded,
                      size: 20,
                      color: FoxTokens.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        _OptionalSection(
          title: "Заметка",
          open: _showNote,
          onOpen: () => setState(() => _showNote = true),
          child: _InlineField(
            controller: _note,
            hint: "Например: вздутие вечером после ужина",
            maxLength: 500,
            multiline: true,
          ),
        ),
        const SizedBox(height: 16),
        AnimatedSwitcher(
          duration: FoxMotion.quick,
          child: _justSaved
              ? const _SavedBar(key: ValueKey("saved"))
              : FoxButton(
                  key: const ValueKey("save"),
                  label: _hasEntry ? "Обновить запись" : "Сохранить запись",
                  loading: _saving,
                  onPressed: _wellbeing == null ? null : _submit,
                ),
        ),
      ],
    );
  }
}

/// One of the three wellbeing tiles. Selection fills in 160 ms (Figma note).
class _WellbeingTile extends StatelessWidget {
  const _WellbeingTile({
    required this.wellbeing,
    required this.selected,
    required this.onTap,
  });

  final Wellbeing wellbeing;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: wellbeing.label,
    excludeSemantics: true,
    child: FoxPressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: FoxMotion.easeOut,
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? FoxTokens.accentLime : _wellbeingBg(wellbeing),
          borderRadius: BorderRadius.circular(14),
          // Always there, so selecting does not shift the row.
          border: Border.all(
            color: selected ? FoxTokens.textPrimary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Text(
          wellbeing.label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: FoxType.label.copyWith(
            color: selected ? FoxTokens.textPrimary : _wellbeingFg(wellbeing),
          ),
        ),
      ),
    ),
  );
}

/// Symptom and food chip as drawn in Figma: grey off, dark green on.
class _ToggleChip extends StatelessWidget {
  const _ToggleChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.removable = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool removable;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: label,
    excludeSemantics: true,
    child: FoxPressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: FoxMotion.easeOut,
        padding: EdgeInsets.fromLTRB(13, 8, removable ? 9 : 13, 8),
        decoration: BoxDecoration(
          color: selected ? FoxTokens.bgGreen : FoxTokens.bgGrey,
          borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: FoxType.caption.copyWith(
                  fontSize: 13,
                  color: selected
                      ? FoxTokens.textInverted
                      : FoxTokens.textPrimary,
                ),
              ),
            ),
            if (removable) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.close_rounded,
                size: 14,
                color: selected
                    ? FoxTokens.textInvertedSecondary
                    : FoxTokens.textSecondary,
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

/// «+ Что ели · необязательно»: folded until asked for, so the card stays as
/// short as the Figma one for people who only tap wellbeing.
class _OptionalSection extends StatelessWidget {
  const _OptionalSection({
    required this.title,
    required this.open,
    required this.onOpen,
    required this.child,
    this.count = 0,
  });

  final String title;
  final bool open;
  final VoidCallback onOpen;
  final Widget child;
  final int count;

  @override
  Widget build(BuildContext context) {
    if (!open) {
      return Semantics(
        button: true,
        label: "$title, необязательно",
        excludeSemantics: true,
        child: FoxPressable(
          onTap: onOpen,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                const Icon(
                  Icons.add_rounded,
                  size: 18,
                  color: FoxTokens.zoneGreen,
                ),
                const SizedBox(width: 6),
                Text(
                  title,
                  style: FoxType.label.copyWith(color: FoxTokens.zoneGreen),
                ),
                const SizedBox(width: 6),
                Text(
                  "необязательно",
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          count > 0 ? "$title · $count" : title,
          style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
        ),
        const SizedBox(height: 10),
        child,
      ],
    );
  }
}

class _InlineField extends StatelessWidget {
  const _InlineField({
    required this.controller,
    required this.hint,
    required this.maxLength,
    this.multiline = false,
    this.onSubmitted,
    this.trailing,
  });

  final TextEditingController controller;
  final String hint;
  final int maxLength;
  final bool multiline;
  final ValueChanged<String>? onSubmitted;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    onTapOutside: foxTapOutside,
    minLines: multiline ? 2 : 1,
    maxLines: multiline ? 5 : 1,
    maxLength: maxLength,
    textInputAction: multiline ? TextInputAction.newline : TextInputAction.done,
    textCapitalization: TextCapitalization.sentences,
    onSubmitted: onSubmitted,
    style: FoxType.caption.copyWith(color: FoxTokens.textPrimary),
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: FoxType.caption.copyWith(color: FoxTokens.textPlaceholder),
      // The limit is enforced; the counter would only add noise.
      counterText: "",
      isDense: true,
      filled: true,
      fillColor: FoxTokens.bgNeutral,
      suffixIcon: trailing,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: FoxTokens.borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: FoxTokens.textPrimary, width: 1.5),
      ),
    ),
  );
}

/// Replaces the save button for a moment: the tick draws in over 300 ms.
class _SavedBar extends StatelessWidget {
  const _SavedBar({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 15),
    decoration: BoxDecoration(
      color: FoxTokens.accentLime,
      borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: FoxMotion.reduced(context)
              ? Duration.zero
              : const Duration(milliseconds: 300),
          curve: FoxMotion.easeOut,
          builder: (context, t, _) =>
              CustomPaint(size: const Size(20, 20), painter: _TickPainter(t)),
        ),
        const SizedBox(width: 10),
        Text(
          "Запись сохранена",
          style: FoxType.button.copyWith(color: FoxTokens.textPrimary),
        ),
      ],
    ),
  );
}

class _TickPainter extends CustomPainter {
  _TickPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.18, size.height * 0.52)
      ..lineTo(size.width * 0.42, size.height * 0.75)
      ..lineTo(size.width * 0.84, size.height * 0.28);
    final paint = Paint()
      ..color = FoxTokens.textPrimary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final metric in path.computeMetrics()) {
      canvas.drawPath(metric.extractPath(0, metric.length * progress), paint);
    }
  }

  @override
  bool shouldRepaint(_TickPainter old) => old.progress != progress;
}

/// Shown under today's card when the client noted a food from their red zone.
class _RedFoodsHint extends StatelessWidget {
  const _RedFoodsHint({required this.entry});

  final DiaryEntry entry;

  @override
  Widget build(BuildContext context) {
    final names = entry.redFoods.map((f) => f.name).join(", ");
    final elimination = entry.phase == "Элиминация";
    return FoxCard(
      tone: FoxCardTone.red,
      radius: 16,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 5),
            child: FoxZoneDot(color: FoxTokens.zoneRed, size: 8),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              "$names — в красной зоне по вашему отчёту. "
              "${elimination ? "На этапе элиминации такие продукты исключаем." : "Следите, как вы себя чувствуете после них."}",
              style: FoxType.captionS.copyWith(
                color: FoxTokens.zoneRed,
                height: 17 / 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ViewToggle extends StatelessWidget {
  const _ViewToggle({required this.calendar, required this.onChanged});

  final bool calendar;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(3),
    decoration: BoxDecoration(
      color: FoxTokens.bgCard,
      borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
      border: Border.all(color: FoxTokens.borderLight),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _segment("Список", !calendar, () => onChanged(false)),
        _segment("Календарь", calendar, () => onChanged(true)),
      ],
    ),
  );

  Widget _segment(String label, bool on, VoidCallback onTap) => Semantics(
    button: true,
    selected: on,
    label: label,
    excludeSemantics: true,
    child: FoxPressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: FoxMotion.quick,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: on ? FoxTokens.bgGreen : Colors.transparent,
          borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
        ),
        child: Text(
          label,
          style: FoxType.captionS.copyWith(
            color: on ? FoxTokens.textInverted : FoxTokens.textSecondary,
            fontWeight: FontWeight.w500,
            fontVariations: const [FontVariation("wght", 500)],
          ),
        ),
      ),
    ),
  );
}

/// A row of «Последние записи», as in Figma.
class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.entry, required this.onTap});

  final DiaryEntry entry;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label:
        "${diaryLongDate(entry.date)}, ${entry.wellbeing.label}, "
        "${entry.symptomsSummary}",
    excludeSemantics: true,
    child: FoxCard(
      onTap: onTap,
      radius: 16,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      child: Row(
        children: [
          FoxZoneDot(color: _wellbeingFg(entry.wellbeing)),
          const SizedBox(width: 10),
          Text(
            diaryShortDate(entry.date),
            style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
          ),
          const SizedBox(width: 10),
          Text(
            entry.wellbeing.label,
            style: FoxType.caption.copyWith(
              fontSize: 13,
              color: FoxTokens.textSecondary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              entry.symptomsSummary,
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: FoxType.captionS.copyWith(color: FoxTokens.textSecondary),
            ),
          ),
          if (entry.redFoods.isNotEmpty) ...[
            const SizedBox(width: 8),
            const FoxZoneDot(color: FoxTokens.zoneRed, size: 6),
          ],
        ],
      ),
    ),
  );
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.grey,
    radius: 16,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    child: Text(
      "Записей пока нет. Отметка занимает пару касаний — "
      "по ним видно, как план влияет на самочувствие.",
      style: FoxType.captionS.copyWith(
        color: FoxTokens.textSecondary,
        height: 17 / 12,
      ),
    ),
  );
}

class _DiaryCalendar extends StatelessWidget {
  const _DiaryCalendar({
    required this.month,
    required this.today,
    required this.entries,
    required this.canGoBack,
    required this.canGoForward,
    required this.isEditable,
    required this.onMonth,
    required this.onDay,
  });

  final DateTime month;
  final String today;
  final Map<String, DiaryEntry> entries;
  final bool canGoBack;
  final bool canGoForward;
  final bool Function(String date) isEditable;
  final ValueChanged<DateTime> onMonth;
  final ValueChanged<String> onDay;

  static const _weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  @override
  Widget build(BuildContext context) {
    final first = DateTime(month.year, month.month);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final lead = first.weekday - 1;
    final cells = lead + daysInMonth;
    final rows = (cells / 7).ceil();

    return FoxCard(
      key: const ValueKey("diary-calendar"),
      radius: 16,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 14),
      child: Column(
        children: [
          Row(
            children: [
              _MonthArrow(
                icon: Icons.chevron_left_rounded,
                label: "Предыдущий месяц",
                onTap: canGoBack
                    ? () => onMonth(DateTime(month.year, month.month - 1))
                    : null,
              ),
              Expanded(
                child: Text(
                  "${diaryMonthsNominative[month.month - 1]} ${month.year}",
                  textAlign: TextAlign.center,
                  style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
                ),
              ),
              _MonthArrow(
                icon: Icons.chevron_right_rounded,
                label: "Следующий месяц",
                onTap: canGoForward
                    ? () => onMonth(DateTime(month.year, month.month + 1))
                    : null,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              for (final w in _weekdays)
                Expanded(
                  child: Text(
                    w,
                    textAlign: TextAlign.center,
                    style: FoxType.captionS.copyWith(
                      color: FoxTokens.textSecondary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          for (var r = 0; r < rows; r++)
            Row(
              children: [
                for (var c = 0; c < 7; c++)
                  Expanded(child: _cell(r * 7 + c - lead + 1, daysInMonth)),
              ],
            ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (final w in Wellbeing.values.reversed) ...[
                FoxZoneDot(color: _wellbeingFg(w), size: 7),
                const SizedBox(width: 5),
                Text(
                  w.label,
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
                if (w != Wellbeing.bad) const SizedBox(width: 14),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _cell(int day, int daysInMonth) {
    if (day < 1 || day > daysInMonth) return const SizedBox(height: 42);
    final date = diaryDayKey(DateTime(month.year, month.month, day));
    final entry = entries[date];
    final isToday = date == today;
    final future = date.compareTo(today) > 0;
    final tappable = entry != null || isEditable(date);

    final Color fg;
    if (entry != null) {
      fg = _wellbeingFg(entry.wellbeing);
    } else if (future) {
      fg = FoxTokens.textPlaceholder;
    } else {
      fg = FoxTokens.textPrimary;
    }

    final label = entry == null
        ? diaryLongDate(date)
        : "${diaryLongDate(date)}, ${entry.wellbeing.label}";

    return Semantics(
      button: tappable,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: tappable ? () => onDay(date) : null,
        child: SizedBox(
          height: 42,
          child: Center(
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: entry == null ? null : _wellbeingBg(entry.wellbeing),
                shape: BoxShape.circle,
                border: isToday
                    ? Border.all(color: FoxTokens.textPrimary, width: 1.5)
                    : null,
              ),
              child: Text(
                "$day",
                style: FoxType.caption.copyWith(
                  color: fg,
                  fontWeight: entry != null || isToday
                      ? FontWeight.w500
                      : FontWeight.w400,
                  fontVariations: [
                    FontVariation("wght", entry != null || isToday ? 500 : 400),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MonthArrow extends StatelessWidget {
  const _MonthArrow({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    enabled: onTap != null,
    label: label,
    excludeSemantics: true,
    child: FoxPressable(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(
          icon,
          size: 22,
          color: onTap == null ? FoxTokens.bgGrey : FoxTokens.textPrimary,
        ),
      ),
    ),
  );
}

/// How wellbeing went in each phase of the plan the client has notes for.
class _PhaseSummary extends StatelessWidget {
  const _PhaseSummary({required this.groups});

  final Map<String, List<DiaryEntry>> groups;

  @override
  Widget build(BuildContext context) => FoxCard(
    radius: 16,
    padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Самочувствие по фазам плана",
          style: FoxType.label.copyWith(color: FoxTokens.textPrimary),
        ),
        for (final MapEntry(key: phase, value: entries) in groups.entries) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Text(
                  phase,
                  style: FoxType.caption.copyWith(color: FoxTokens.textPrimary),
                ),
              ),
              Text(
                _records(entries.length),
                style: FoxType.captionS.copyWith(
                  color: FoxTokens.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  for (final w in Wellbeing.values.reversed)
                    if (entries.any((e) => e.wellbeing == w))
                      Expanded(
                        flex: entries.where((e) => e.wellbeing == w).length,
                        child: Container(color: _wellbeingFg(w)),
                      ),
                ],
              ),
            ),
          ),
        ],
      ],
    ),
  );

  static String _records(int n) {
    final mod10 = n % 10;
    final mod100 = n % 100;
    final word = mod10 == 1 && mod100 != 11
        ? "запись"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "записи"
        : "записей";
    return "$n $word";
  }
}

enum _DayAction { edit, delete }

class _DaySheet extends StatelessWidget {
  const _DaySheet({required this.entry, required this.editable});

  final DiaryEntry entry;
  final bool editable;

  @override
  Widget build(BuildContext context) {
    final phase = entry.weekNumber != null && entry.phase != null
        ? "Неделя ${entry.weekNumber} · ${entry.phase}"
        : null;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SheetHandle(),
            const SizedBox(height: 16),
            Text(
              diaryLongDate(entry.date),
              style: FoxType.h4.copyWith(color: FoxTokens.textPrimary),
            ),
            if (phase != null) ...[
              const SizedBox(height: 4),
              Text(
                phase,
                style: FoxType.caption.copyWith(color: FoxTokens.textSecondary),
              ),
            ],
            const SizedBox(height: 14),
            FoxStatusBadge(
              label: entry.wellbeing.label,
              foreground: _wellbeingFg(entry.wellbeing),
              background: _wellbeingBg(entry.wellbeing),
            ),
            const SizedBox(height: 14),
            _SheetLine(
              title: "Симптомы",
              body: entry.symptoms.isEmpty
                  ? "Без симптомов"
                  : entry.symptoms.map((s) => s.label).join(", "),
            ),
            if (entry.foods.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                "Что ели",
                style: FoxType.captionS.copyWith(
                  color: FoxTokens.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [for (final f in entry.foods) _FoodChip(food: f)],
              ),
              if (entry.redFoods.isNotEmpty) ...[
                const SizedBox(height: 10),
                _RedFoodsHint(entry: entry),
              ],
            ],
            if (entry.note != null) ...[
              const SizedBox(height: 12),
              _SheetLine(title: "Заметка", body: entry.note!),
            ],
            const SizedBox(height: 20),
            if (editable)
              FoxButton(
                label: "Изменить",
                onPressed: () => Navigator.of(context).pop(_DayAction.edit),
              ),
            const SizedBox(height: 8),
            FoxButton(
              label: "Удалить запись",
              kind: FoxButtonKind.text,
              onPressed: () => Navigator.of(context).pop(_DayAction.delete),
            ),
          ],
        ),
      ),
    );
  }
}

class _SheetLine extends StatelessWidget {
  const _SheetLine({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: FoxType.captionS.copyWith(
          color: FoxTokens.textSecondary,
          fontWeight: FontWeight.w500,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        body,
        style: FoxType.bodyS.copyWith(
          color: FoxTokens.textPrimary,
          height: 21 / 16,
        ),
      ),
    ],
  );
}

/// A food in the day sheet with the dot of its zone from the client's report.
class _FoodChip extends StatelessWidget {
  const _FoodChip({required this.food});

  final DiaryFood food;

  @override
  Widget build(BuildContext context) {
    final zone = food.zone;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: zone == null ? FoxTokens.bgGrey : foxZoneBackground(zone),
        borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (zone != null) ...[
            FoxZoneDot(color: foxZoneForeground(zone), size: 7),
            const SizedBox(width: 6),
          ],
          Text(
            food.name,
            style: FoxType.caption.copyWith(
              fontSize: 13,
              color: zone == null
                  ? FoxTokens.textPrimary
                  : foxZoneForeground(zone),
            ),
          ),
        ],
      ),
    );
  }
}

class _SheetHandle extends StatelessWidget {
  const _SheetHandle();

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 40,
      height: 4,
      decoration: BoxDecoration(
        color: FoxTokens.bgGrey,
        borderRadius: BorderRadius.circular(2),
      ),
    ),
  );
}

class _BackRow extends StatelessWidget {
  const _BackRow({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 8),
    child: Align(
      alignment: Alignment.centerLeft,
      child: Semantics(
        button: true,
        label: "Назад",
        excludeSemantics: true,
        child: FoxPressable(
          onTap: onTap,
          child: const SizedBox(
            width: 40,
            height: 40,
            child: Icon(
              Icons.arrow_back_rounded,
              size: 22,
              color: FoxTokens.textPrimary,
            ),
          ),
        ),
      ),
    ),
  );
}
