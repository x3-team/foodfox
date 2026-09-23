import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";

class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.isUser,
    required this.content,
    this.isReminder = false,
  });

  final bool isUser;
  final String content;
  final bool isReminder;

  @override
  Widget build(BuildContext context) {
    if (isReminder) {
      return Align(
        alignment: Alignment.center,
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: FoxColors.reminder,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: FoxColors.primaryMuted),
          ),
          child: Text(
            content,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: FoxColors.primaryDark,
            ),
          ),
        ),
      );
    }

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser ? FoxColors.primary : FoxColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: isUser ? null : Border.all(color: FoxColors.border),
        ),
        child: Text(
          content,
          style: TextStyle(
            fontSize: 15,
            height: 1.45,
            color: isUser ? Colors.white : FoxColors.text,
          ),
        ),
      ),
    );
  }
}
