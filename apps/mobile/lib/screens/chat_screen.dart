import "dart:async";

import "package:flutter/material.dart";
import "package:foodfox/models/models.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/utils/lazy_tab_loader.dart";
import "package:foodfox/utils/network_errors.dart";
import "package:foodfox/widgets/chat_bubble.dart";
import "package:foodfox/widgets/network_error_panel.dart";
import "package:foodfox/widgets/page_header.dart";
import "package:foodfox/widgets/voice_input_button.dart";

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    required this.api,
    this.initialMessage,
  });

  final FoodFoxApi api;
  final String? initialMessage;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _loading = false;
  bool _sending = false;
  bool _voiceListening = false;
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
    if (widget.initialMessage != null &&
        widget.initialMessage != oldWidget.initialMessage) {
      _controller.text = widget.initialMessage!;
      _send();
    }
  }

  Future<void> _loadOnce() async {
    await _load();
    await _maybeSendInitial();
  }

  Future<void> _maybeSendInitial() async {
    final text = widget.initialMessage?.trim();
    if (text == null || text.isEmpty || _sending) return;
    _controller.text = text;
    _send();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
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
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    _controller.clear();
    setState(() {
      _sending = true;
      _messages = [
        ..._messages,
        ChatMessage(id: "tmp", role: "user", messageType: "chat", content: text),
      ];
    });
    _scrollToBottom();
    try {
      final messages = await widget.api.sendChat(text);
      if (!mounted) return;
      setState(() {
        _messages = messages;
        _sending = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      try {
        final messages = await widget.api.fetchMessages();
        if (!mounted) return;
        setState(() => _messages = messages);
        _scrollToBottom();
        if (messages.isNotEmpty && !messages.last.isUser) return;
      } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(formatNetworkError(e))),
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _sendVoice(String text) async {
    _controller.text = text;
    await _send();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const PageHeader(
          title: "Чат",
          subtitle: "Бот-нутрициолог ответит по вашему плану и зонам",
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: FoxColors.primary))
              : _error != null
                  ? NetworkErrorPanel(
                      error: _error!,
                      onRetry: () => _loader.sync(active: true, force: true),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      itemCount: _messages.length + (_sending ? 1 : 0) + (_voiceListening ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (_voiceListening && index == _messages.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Center(
                              child: Text(
                                "🎤 Слушаю…",
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: FoxColors.red,
                                ),
                              ),
                            ),
                          );
                        }
                        if (_sending && index == _messages.length + (_voiceListening ? 1 : 0)) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          );
                        }
                        final msg = _messages[index];
                        return ChatBubble(
                          isUser: msg.isUser,
                          isReminder: msg.isReminder,
                          content: msg.content,
                        );
                      },
                    ),
        ),
        Material(
          color: FoxColors.surface,
          elevation: 8,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: _voiceListening ? "Говорите…" : "Напишите или скажите сообщение…",
                        filled: true,
                        fillColor: FoxColors.bg,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: FoxColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: FoxColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: FoxColors.primary),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  VoiceInputButton(
                    disabled: _sending,
                    onTranscript: _sendVoice,
                    onListeningChanged: (listening) {
                      setState(() => _voiceListening = listening);
                    },
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: FoxColors.primary,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _sending ? null : _send,
                      child: const Padding(
                        padding: EdgeInsets.all(12),
                        child: Icon(Icons.send_rounded, color: Colors.white, size: 22),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
