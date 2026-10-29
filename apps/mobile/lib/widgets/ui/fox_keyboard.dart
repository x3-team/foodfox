import "package:flutter/material.dart";

/// Drops focus from whatever text field holds it, which hides the keyboard.
void foxDismissKeyboard() => FocusManager.instance.primaryFocus?.unfocus();

/// Passed as `onTapOutside` to every text field: on iOS and Android Flutter
/// keeps the field focused when the user taps elsewhere, so the keyboard
/// otherwise stays up over the content and the tab bar.
void foxTapOutside(PointerDownEvent _) => foxDismissKeyboard();

/// App-wide keyboard dismissal, mounted once around the navigator.
///
/// * A tap on empty space (no button or field under it) drops focus.
/// * Dragging any scroll view drops focus, i.e. `keyboardDismissBehavior:
///   onDrag` for every list without repeating it on each one. Drags inside a
///   text field's own scrollable (a multi-line composer) are left alone.
class FoxKeyboardDismiss extends StatelessWidget {
  const FoxKeyboardDismiss({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.translucent,
    onTap: foxDismissKeyboard,
    child: NotificationListener<ScrollUpdateNotification>(
      onNotification: (n) {
        if (n.dragDetails != null &&
            FocusManager.instance.primaryFocus?.context != null &&
            n.context?.findAncestorWidgetOfExactType<EditableText>() == null) {
          foxDismissKeyboard();
        }
        return false;
      },
      child: child,
    ),
  );
}

/// Drops focus whenever a route is pushed or popped, so a field on the screen
/// being left never keeps the keyboard up over the next one.
class FoxUnfocusOnNavigate extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      foxDismissKeyboard();

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) =>
      foxDismissKeyboard();

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) =>
      foxDismissKeyboard();
}
