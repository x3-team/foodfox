import "package:flutter/material.dart";

import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// «Подключить специалиста»: the client's requests to a live specialist and
/// the answers. Staff reply from the admin (/admin/support).
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key, required this.api});

  final FoodFoxApi api;

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

const _topics = <String, String>{
  "report": "Отчёт и результаты",
  "plan": "План питания",
  "tech": "Приложение",
  "other": "Другое",
};

const _statuses = <String, String>{
  "new": "Отправлено",
  "in_progress": "Специалист отвечает",
  "waiting": "Есть ответ",
  "closed": "Закрыто",
};

class _SupportScreenState extends State<SupportScreen> {
  List<Map<String, dynamic>>? _tickets;
  String? _error;
  String _topic = "plan";
  bool _sending = false;
  final _text = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final tickets = await widget.api.fetchSupportTickets();
      if (!mounted) return;
      setState(() {
        _tickets = tickets;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = "$e");
    }
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.length < 2 || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.api.createSupportTicket(_topic, text);
      _text.clear();
      if (!mounted) return;
      FocusScope.of(context).unfocus();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Отправили. Специалист ответит здесь же"),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("$e".replaceFirst("Exception: ", ""))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _open(Map<String, dynamic> ticket) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _TicketScreen(api: widget.api, id: "${ticket["id"]}"),
      ),
    );
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final tickets = _tickets;
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      appBar: AppBar(
        backgroundColor: FoxTokens.bgNeutral,
        surfaceTintColor: Colors.transparent,
        title: Text("Специалист", style: FoxType.h4),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Text(
              "Задайте вопрос нутрициологу или поддержке. "
              "Ответим в течение дня, ответ придёт сюда.",
              style: FoxType.bodyS.copyWith(color: FoxTokens.textSecondary),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in _topics.entries)
                  FoxChip(
                    label: entry.value,
                    selected: _topic == entry.key,
                    onTap: () => setState(() => _topic = entry.key),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            _MessageField(controller: _text, hint: "Ваш вопрос"),
            const SizedBox(height: 12),
            FoxButton(
              label: _sending ? "Отправляем…" : "Отправить",
              onPressed: _sending ? null : _send,
            ),
            const SizedBox(height: 28),
            if (_error != null)
              Text(
                _error!.replaceFirst("Exception: ", ""),
                style: FoxType.captionS.copyWith(color: FoxTokens.zoneRed),
              )
            else if (tickets == null)
              const Center(child: CircularProgressIndicator())
            else if (tickets.isNotEmpty) ...[
              Text("Мои обращения", style: FoxType.h4),
              const SizedBox(height: 10),
              for (final t in tickets) ...[
                FoxCard(
                  onTap: () => _open(t),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "${t["subject"]}",
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: FoxType.bodyS.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "${_topics[t["topic"]] ?? ""} · "
                              "${_statuses[t["status"]] ?? ""}",
                              style: FoxType.captionS.copyWith(
                                color: FoxTokens.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if ((t["unread"] as num? ?? 0) > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: FoxTokens.accentLime,
                            borderRadius: BorderRadius.circular(
                              FoxTokens.radiusChip,
                            ),
                          ),
                          child: Text(
                            "${t["unread"]}",
                            style: FoxType.captionS.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _TicketScreen extends StatefulWidget {
  const _TicketScreen({required this.api, required this.id});

  final FoodFoxApi api;
  final String id;

  @override
  State<_TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<_TicketScreen> {
  Map<String, dynamic>? _ticket;
  String? _error;
  bool _sending = false;
  final _text = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final ticket = await widget.api.fetchSupportTicket(widget.id);
      if (!mounted) return;
      setState(() {
        _ticket = ticket;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = "$e".replaceFirst("Exception: ", ""));
    }
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.length < 2 || _sending) return;
    setState(() => _sending = true);
    try {
      final ticket = await widget.api.replySupportTicket(widget.id, text);
      _text.clear();
      if (!mounted) return;
      setState(() => _ticket = ticket);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("$e".replaceFirst("Exception: ", ""))),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = _ticket;
    final messages =
        (ticket?["messages"] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    return Scaffold(
      backgroundColor: FoxTokens.bgNeutral,
      appBar: AppBar(
        backgroundColor: FoxTokens.bgNeutral,
        surfaceTintColor: Colors.transparent,
        title: Text(
          _topics[ticket?["topic"]] ?? "Обращение",
          style: FoxType.h4,
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _error != null
                ? Center(child: Text(_error!))
                : ticket == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    children: [
                      for (final m in messages) _Bubble(message: m),
                    ],
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: _MessageField(controller: _text, hint: "Сообщение"),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    style: IconButton.styleFrom(
                      backgroundColor: FoxTokens.bgGreen,
                      foregroundColor: FoxTokens.textInverted,
                    ),
                    icon: const Icon(Icons.arrow_upward_rounded),
                    tooltip: "Отправить",
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final Map<String, dynamic> message;

  @override
  Widget build(BuildContext context) {
    final mine = message["author"] == "client";
    final time = DateTime.tryParse("${message["createdAt"]}")?.toLocal();
    final stamp = time == null
        ? ""
        : "${time.day.toString().padLeft(2, "0")}.${time.month.toString().padLeft(2, "0")} "
              "${time.hour.toString().padLeft(2, "0")}:${time.minute.toString().padLeft(2, "0")}";
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.8,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: mine ? FoxTokens.bgGreen : FoxTokens.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: mine ? null : Border.all(color: FoxTokens.borderLight),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!mine)
              Text(
                "${message["staffName"] ?? "Специалист"}",
                style: FoxType.captionS.copyWith(
                  color: FoxTokens.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            Text(
              "${message["body"]}",
              style: FoxType.bodyS.copyWith(
                color: mine ? FoxTokens.textInverted : FoxTokens.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              stamp,
              style: FoxType.captionS.copyWith(
                color: mine
                    ? FoxTokens.textInvertedSecondary
                    : FoxTokens.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageField extends StatelessWidget {
  const _MessageField({required this.controller, required this.hint});

  final TextEditingController controller;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      minLines: 1,
      maxLines: 5,
      maxLength: 4000,
      textCapitalization: TextCapitalization.sentences,
      style: FoxType.bodyS.copyWith(color: FoxTokens.textPrimary),
      decoration: InputDecoration(
        hintText: hint,
        counterText: "",
        hintStyle: FoxType.bodyS.copyWith(color: FoxTokens.textSecondary),
        filled: true,
        fillColor: FoxTokens.bgCard,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 14,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: FoxTokens.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: FoxTokens.textPrimary,
            width: 1.5,
          ),
        ),
      ),
    );
  }
}
