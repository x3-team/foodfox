import "dart:async";

import "package:flutter/material.dart";

import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/utils/network_errors.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screens 10–12 — the AI assistant. It only ever sees this client's report,
/// plan phase and allowed products; the context is assembled server-side.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.api, this.initialMessage});

  final FoodFoxApi api;
  final String? initialMessage;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const _suggestions = [
    "Можно ли мне творог?",
    "Почему исключили молочное?",
    "Что приготовить на завтрак?",
    "Когда можно вернуть яйца?",
  ];

  final _controller = TextEditingController();
  final _scroll = ScrollController();
  bool _loading = false;
  bool _sending = false;
  Object? _error;
  List<ChatMessage> _messages = [];
  late final LazyTabLoader _loader = LazyTabLoader(onLoad: _loadOnce);

  @override
  void initState() {
    super.initState();
    _loader.sync(active: true);
  }

  @override
  void didUpdateWidget(covariant ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.initialMessage;
    if (next != null && next != oldWidget.initialMessage) _send(next);
  }

  Future<void> _loadOnce() async {
    await _load();
    final text = widget.initialMessage?.trim();
    if (text != null && text.isNotEmpty) await _send(text);
  }

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final messages = await widget.api.fetchMessages();
      unawaited(widget.api.markChatRead());
      if (!mounted) return;
      setState(() {
        _messages = messages;
        _loading = false;
      });
      _toBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty || _sending) return;
    _controller.clear();
    setState(() {
      _sending = true;
      _messages = [
        ..._messages,
        ChatMessage(
          id: "tmp",
          role: "user",
          messageType: "chat",
          content: text,
        ),
      ];
    });
    _toBottom();

    try {
      final messages = await widget.api.sendChat(text);
      if (!mounted) return;
      setState(() {
        _messages = messages;
        _sending = false;
      });
      _toBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      try {
        final messages = await widget.api.fetchMessages();
        if (!mounted) return;
        setState(() => _messages = messages);
        _toBottom();
        if (messages.isNotEmpty && !messages.last.isUser) return;
      } catch (_) {
        // fall through to the snackbar below
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(formatNetworkError(e))));
    }
  }

  void _toBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: FoxMotion.base,
        curve: FoxMotion.easeOut,
      );
    });
  }

  bool get _isFresh => _messages.where((m) => m.isUser).isEmpty && !_sending;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _ChatHeader(),
        const Divider(height: 1, color: FoxTokens.borderLight),
        Expanded(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: FoxTokens.bgGreen),
                )
              : _error != null
              ? NetworkErrorPanel(
                  error: _error!,
                  onRetry: () => _loader.sync(active: true, force: true),
                )
              : _buildThread(),
        ),
        _Composer(controller: _controller, sending: _sending, onSend: _send),
      ],
    );
  }

  Widget _buildThread() {
    final items = <Widget>[];

    for (final m in _messages) {
      items.add(_Bubble(message: m));
      items.add(const SizedBox(height: 12));
    }
    if (_sending) {
      items.add(const _TypingBubble());
      items.add(const SizedBox(height: 8));
      items.add(
        Text(
          "Помощник сверяется с вашим планом…",
          style: FoxType.captionS.copyWith(color: FoxTokens.textSecondary),
        ),
      );
      items.add(const SizedBox(height: 12));
    }

    if (_isFresh) {
      items.add(const SizedBox(height: 4));
      items.add(
        Text(
          "Частые вопросы",
          style: FoxType.captionS.copyWith(
            color: FoxTokens.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
      items.add(const SizedBox(height: 10));
      items.addAll(
        foxStagger([
          for (final q in _suggestions)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _SuggestionRow(text: q, onTap: () => _send(q)),
            ),
        ], offset: 10),
      );
      items.add(const SizedBox(height: 8));
      items.add(const _SafetyNote());
    }

    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
      children: items,
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(24, 6, 24, 14),
    child: Row(
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: FoxTokens.accentLime,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.auto_awesome,
            size: 20,
            color: FoxTokens.textPrimary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Помощник FOX",
                style: FoxType.bodyS.copyWith(
                  color: FoxTokens.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  const FoxZoneDot(color: FoxTokens.zoneGreen, size: 7),
                  const SizedBox(width: 6),
                  Text(
                    "видит ваш отчёт и план",
                    style: FoxType.captionS.copyWith(
                      color: FoxTokens.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final user = message.isUser;
    final reminder = message.isReminder;

    return FoxFadeSlide(
      offset: 12,
      duration: FoxMotion.base,
      child: Align(
        alignment: user ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.8,
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              color: user
                  ? FoxTokens.bgGreen
                  : reminder
                  ? FoxTokens.zoneGreenBg
                  : FoxTokens.bgCard,
              border: user || reminder
                  ? null
                  : Border.all(color: FoxTokens.borderLight),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(user ? 20 : 6),
                topRight: Radius.circular(user ? 6 : 20),
                bottomLeft: const Radius.circular(20),
                bottomRight: const Radius.circular(20),
              ),
            ),
            child: Text(
              message.content,
              style: FoxType.bodyS.copyWith(
                height: 21 / 16,
                color: user
                    ? FoxTokens.textInverted
                    : reminder
                    ? FoxTokens.zoneGreen
                    : FoxTokens.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: FoxTokens.bgCard,
        border: Border.all(color: FoxTokens.borderLight),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(6),
          topRight: Radius.circular(20),
          bottomLeft: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
      ),
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              Opacity(
                // 160 ms phase offset between the dots.
                opacity: _dotOpacity((_c.value + i * 0.133) % 1),
                child: const FoxZoneDot(
                  color: FoxTokens.textSecondary,
                  size: 8,
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );

  double _dotOpacity(double t) {
    final wave = t < 0.5 ? t * 2 : (1 - t) * 2;
    return 0.28 + 0.72 * wave;
  }
}

class _SuggestionRow extends StatelessWidget {
  const _SuggestionRow({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FoxCard(
    onTap: onTap,
    radius: 16,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    child: Row(
      children: [
        Expanded(
          child: Text(
            text,
            style: FoxType.bodyS.copyWith(color: FoxTokens.textPrimary),
          ),
        ),
        const Icon(
          Icons.north_east_rounded,
          size: 16,
          color: Color(0xFF8A8C84),
        ),
      ],
    ),
  );
}

class _SafetyNote extends StatelessWidget {
  const _SafetyNote();

  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.grey,
    radius: 14,
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    child: Text(
      "Помощник опирается только на ваш отчёт. Он не ставит диагноз "
      "и не заменяет нутрициолога.",
      style: FoxType.captionS.copyWith(
        color: FoxTokens.textSecondary,
        height: 17 / 12,
      ),
    ),
  );
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final void Function([String?]) onSend;

  @override
  Widget build(BuildContext context) => Container(
    color: FoxTokens.bgNeutral,
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 10, 24, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: FoxTokens.bgCard,
                  borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
                  border: Border.all(color: FoxTokens.borderLight),
                ),
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 4,
                  style: FoxType.bodyS.copyWith(color: FoxTokens.textPrimary),
                  decoration: InputDecoration(
                    hintText: "Спросите про продукт или план…",
                    hintStyle: FoxType.bodyS.copyWith(
                      color: FoxTokens.textSecondary,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                  ),
                  onSubmitted: (_) => onSend(),
                ),
              ),
            ),
            const SizedBox(width: 10),
            FoxPressable(
              onTap: sending ? null : () => onSend(),
              child: AnimatedContainer(
                duration: FoxMotion.quick,
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: sending ? FoxTokens.bgGrey : FoxTokens.accentLime,
                  shape: BoxShape.circle,
                ),
                child: sending
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: FoxTokens.textSecondary,
                        ),
                      )
                    : const Icon(
                        Icons.arrow_upward_rounded,
                        size: 22,
                        color: FoxTokens.textPrimary,
                      ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
