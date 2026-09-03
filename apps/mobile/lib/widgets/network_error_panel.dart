import "package:flutter/material.dart";
import "package:foodfox/theme/fox_theme.dart";
import "package:foodfox/utils/network_errors.dart";

class NetworkErrorPanel extends StatelessWidget {
  const NetworkErrorPanel({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 40, color: FoxColors.muted),
            const SizedBox(height: 12),
            Text(
              formatNetworkError(error),
              textAlign: TextAlign.center,
              style: const TextStyle(color: FoxColors.text, height: 1.4),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              child: const Text("Повторить"),
            ),
          ],
        ),
      ),
    );
  }
}
