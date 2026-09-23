import "package:flutter/material.dart";

import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";

/// Wraps a tap target with the standard press feedback (scale 0.98).
class FoxPressable extends StatefulWidget {
  const FoxPressable({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.98,
    this.borderRadius,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final BorderRadius? borderRadius;

  @override
  State<FoxPressable> createState() => _FoxPressableState();
}

class _FoxPressableState extends State<FoxPressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: enabled ? (_) => setState(() => _down = true) : null,
      onTapUp: enabled ? (_) => setState(() => _down = false) : null,
      onTapCancel: enabled ? () => setState(() => _down = false) : null,
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _down ? widget.scale : 1,
        duration: _down ? FoxMotion.press : FoxMotion.release,
        curve: FoxMotion.easeOut,
        child: widget.child,
      ),
    );
  }
}

enum FoxButtonKind { primary, accent, outline, text }

enum FoxButtonSize { large, small }

class FoxButton extends StatelessWidget {
  const FoxButton({
    super.key,
    required this.label,
    this.onPressed,
    this.kind = FoxButtonKind.primary,
    this.size = FoxButtonSize.large,
    this.trailingIcon,
    this.leadingIcon,
    this.loading = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final FoxButtonKind kind;
  final FoxButtonSize size;
  final IconData? trailingIcon;
  final IconData? leadingIcon;
  final bool loading;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    final large = size == FoxButtonSize.large;

    late Color bg;
    late Color fg;
    Border? border;
    switch (kind) {
      case FoxButtonKind.primary:
        bg = FoxTokens.bgGreen;
        fg = FoxTokens.textInverted;
      case FoxButtonKind.accent:
        bg = FoxTokens.accentLime;
        fg = FoxTokens.textPrimary;
      case FoxButtonKind.outline:
        bg = Colors.transparent;
        fg = FoxTokens.textPrimary;
        border = Border.all(color: FoxTokens.borderLight);
      case FoxButtonKind.text:
        bg = Colors.transparent;
        fg = FoxTokens.zoneGreen;
    }

    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          ),
          const SizedBox(width: 10),
        ] else if (leadingIcon != null) ...[
          Icon(leadingIcon, size: large ? 20 : 18, color: fg),
          const SizedBox(width: 10),
        ],
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: FoxType.button.copyWith(
              color: fg,
              fontSize: large ? 16 : 14,
            ),
          ),
        ),
        if (trailingIcon != null && !loading) ...[
          const SizedBox(width: 10),
          Icon(trailingIcon, size: large ? 18 : 16, color: fg),
        ],
      ],
    );

    return Opacity(
      opacity: disabled && !loading ? 0.4 : 1,
      child: FoxPressable(
        onTap: disabled ? null : onPressed,
        child: AnimatedContainer(
          duration: FoxMotion.quick,
          curve: FoxMotion.easeOut,
          padding: EdgeInsets.symmetric(
            horizontal: large ? 28 : 18,
            vertical: large ? 18 : 12,
          ),
          decoration: BoxDecoration(
            color: bg,
            border: border,
            borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
          ),
          child: content,
        ),
      ),
    );
  }
}

enum FoxCardTone { light, dark, grey, green, red, yellow }

class FoxCard extends StatelessWidget {
  const FoxCard({
    super.key,
    required this.child,
    this.tone = FoxCardTone.light,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.radius = FoxTokens.radiusCard,
  });

  final Widget child;
  final FoxCardTone tone;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final double radius;

  @override
  Widget build(BuildContext context) {
    late Color bg;
    var bordered = false;
    switch (tone) {
      case FoxCardTone.light:
        bg = FoxTokens.bgCard;
        bordered = true;
      case FoxCardTone.dark:
        bg = FoxTokens.bgGreen;
      case FoxCardTone.grey:
        bg = FoxTokens.bgGrey;
      case FoxCardTone.green:
        bg = FoxTokens.zoneGreenBg;
      case FoxCardTone.red:
        bg = FoxTokens.zoneRedBg;
      case FoxCardTone.yellow:
        bg = FoxTokens.zoneYellowBg;
    }

    final box = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(radius),
        border: bordered ? Border.all(color: FoxTokens.borderLight) : null,
      ),
      child: child,
    );

    return onTap == null ? box : FoxPressable(onTap: onTap, child: box);
  }
}

class FoxChip extends StatelessWidget {
  const FoxChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
    this.onDark = false,
    this.leading,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final bool onDark;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    if (onDark) {
      bg = selected
          ? FoxTokens.accentLime
          : Colors.white.withValues(alpha: 0.1);
      fg = selected ? FoxTokens.textPrimary : FoxTokens.textInverted;
    } else {
      bg = selected ? FoxTokens.bgGreen : FoxTokens.bgCard;
      fg = selected ? FoxTokens.textInverted : FoxTokens.textPrimary;
    }

    return FoxPressable(
      onTap: onTap,
      child: AnimatedContainer(
        duration: FoxMotion.quick,
        curve: FoxMotion.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
          border: !onDark && !selected
              ? Border.all(color: FoxTokens.borderLight)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: 7)],
            Text(label, style: FoxType.label.copyWith(color: fg)),
          ],
        ),
      ),
    );
  }
}

class FoxZoneDot extends StatelessWidget {
  const FoxZoneDot({super.key, required this.color, this.size = 9});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

class FoxStatusBadge extends StatelessWidget {
  const FoxStatusBadge({
    super.key,
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(11, 6, 13, 6),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(FoxTokens.radiusChip),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        FoxZoneDot(color: foreground, size: 7),
        const SizedBox(width: 7),
        Text(
          label,
          style: FoxType.captionS.copyWith(
            color: foreground,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    ),
  );
}

class FoxListRow extends StatelessWidget {
  const FoxListRow({
    super.key,
    required this.title,
    this.subtitle,
    this.hint,
    this.trailing,
    this.onTap,
    this.showChevron = true,
  });

  final String title;
  final String? subtitle;
  final String? hint;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;

  @override
  Widget build(BuildContext context) => FoxCard(
    onTap: onTap,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    radius: 16,
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: FoxType.bodyS.copyWith(
                  color: FoxTokens.textPrimary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 3),
                Text(
                  subtitle!,
                  style: FoxType.captionS.copyWith(
                    color: FoxTokens.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (hint != null)
          Text(
            hint!,
            style: FoxType.captionS.copyWith(color: FoxTokens.textSecondary),
          ),
        ?trailing,
        if (showChevron) ...[
          const SizedBox(width: 8),
          const Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: Color(0xFF8A8C84),
          ),
        ],
      ],
    ),
  );
}

class FoxInput extends StatelessWidget {
  const FoxInput({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.helper,
    this.error,
    this.keyboardType,
    this.obscure = false,
    this.onChanged,
    this.autofocus = false,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final String? helper;
  final String? error;
  final TextInputType? keyboardType;
  final bool obscure;
  final ValueChanged<String>? onChanged;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final hasError = error != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: FoxType.captionS.copyWith(
            color: FoxTokens.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscure,
          onChanged: onChanged,
          autofocus: autofocus,
          style: FoxType.bodyS.copyWith(color: FoxTokens.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: FoxType.bodyS.copyWith(color: FoxTokens.textSecondary),
            filled: true,
            fillColor: FoxTokens.bgCard,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 18,
              vertical: 16,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: hasError ? FoxTokens.zoneRed : FoxTokens.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: hasError ? FoxTokens.zoneRed : FoxTokens.textPrimary,
                width: 1.5,
              ),
            ),
          ),
        ),
        if (helper != null || hasError) ...[
          const SizedBox(height: 6),
          Text(
            error ?? helper!,
            style: FoxType.captionS.copyWith(
              color: hasError ? FoxTokens.zoneRed : FoxTokens.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}

class FoxProgressBar extends StatelessWidget {
  const FoxProgressBar({
    super.key,
    required this.value,
    this.onDark = false,
    this.height = 6,
  });

  final double value;
  final bool onDark;
  final double height;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(100),
    child: Container(
      height: height,
      color: onDark ? Colors.white.withValues(alpha: 0.15) : FoxTokens.bgGrey,
      child: Align(
        alignment: Alignment.centerLeft,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: value.clamp(0, 1)),
          duration: FoxMotion.progress,
          curve: FoxMotion.easeOut,
          builder: (context, v, _) => FractionallySizedBox(
            widthFactor: v == 0 ? 0.001 : v,
            child: Container(color: FoxTokens.accentLime),
          ),
        ),
      ),
    ),
  );
}

/// Screen title used across the app (Manrope Light, tight tracking).
class FoxScreenTitle extends StatelessWidget {
  const FoxScreenTitle({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: FoxType.h3.copyWith(
          color: FoxTokens.textPrimary,
          fontSize: 30,
          height: 34 / 30,
        ),
      ),
      if (subtitle != null) ...[
        const SizedBox(height: 6),
        Text(
          subtitle!,
          style: FoxType.caption.copyWith(
            color: FoxTokens.textSecondary,
            height: 20 / 14,
          ),
        ),
      ],
    ],
  );
}

Color foxZoneForeground(String zone) => switch (zone) {
  "green" => FoxTokens.zoneGreen,
  "yellow" => FoxTokens.zoneYellow,
  _ => FoxTokens.zoneRed,
};

Color foxZoneBackground(String zone) => switch (zone) {
  "green" => FoxTokens.zoneGreenBg,
  "yellow" => FoxTokens.zoneYellowBg,
  _ => FoxTokens.zoneRedBg,
};
