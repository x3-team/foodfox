import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:speech_to_text/speech_to_text.dart";

class VoiceInputButton extends StatefulWidget {
  const VoiceInputButton({
    super.key,
    required this.onTranscript,
    required this.disabled,
    this.onListeningChanged,
  });

  final ValueChanged<String> onTranscript;
  final bool disabled;
  final ValueChanged<bool>? onListeningChanged;

  @override
  State<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends State<VoiceInputButton> {
  final SpeechToText _speech = SpeechToText();
  bool _ready = false;
  bool _listening = false;

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    final ready = await _speech.initialize(
      onError: (_) {
        if (mounted) {
          setState(() => _listening = false);
          widget.onListeningChanged?.call(false);
        }
      },
      onStatus: (status) {
        if (status == "done" || status == "notListening") {
          if (mounted) {
            setState(() => _listening = false);
            widget.onListeningChanged?.call(false);
          }
        }
      },
    );
    if (mounted) setState(() => _ready = ready);
  }

  Future<void> _toggle() async {
    if (widget.disabled || !_ready) {
      if (!_ready && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Голосовой ввод недоступен на этом устройстве")),
        );
      }
      return;
    }

    if (_listening) {
      await _speech.stop();
      if (mounted) {
        setState(() => _listening = false);
        widget.onListeningChanged?.call(false);
      }
      return;
    }

    final locales = await _speech.locales();
    String? ruLocale;
    for (final locale in locales) {
      if (locale.localeId.startsWith("ru")) {
        ruLocale = locale.localeId;
        break;
      }
    }
    final started = await _speech.listen(
      onResult: (result) {
        if (result.finalResult && result.recognizedWords.trim().isNotEmpty) {
          widget.onTranscript(result.recognizedWords.trim());
        }
      },
      listenOptions: SpeechListenOptions(
        localeId: ruLocale,
        listenMode: ListenMode.confirmation,
      ),
    );
    if (mounted) {
      setState(() => _listening = started);
      widget.onListeningChanged?.call(started);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _listening ? FoxColors.red.withValues(alpha: 0.12) : FoxColors.bg,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: widget.disabled ? null : _toggle,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Icon(
            _listening ? Icons.mic_rounded : Icons.mic_none_rounded,
            color: _listening ? FoxColors.red : FoxColors.primary,
            size: 22,
          ),
        ),
      ),
    );
  }
}
