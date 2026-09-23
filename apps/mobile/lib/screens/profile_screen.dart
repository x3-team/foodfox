import "package:flutter/material.dart";

import "package:foodfox/models/models.dart";
import "package:foodfox/services/auth_store.dart";
import "package:foodfox/services/foodfox_api.dart";
import "package:foodfox/theme/fox_motion.dart";
import "package:foodfox/theme/fox_tokens.dart";
import "package:foodfox/widgets/ui/fox_ui.dart";

/// Screen 09 — profile, nutritionist link and privacy controls.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.api,
    required this.store,
    required this.onSignOut,
    this.onUploadReport,
  });

  final FoodFoxApi api;
  final AuthStore store;
  final VoidCallback onSignOut;
  final VoidCallback? onUploadReport;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  UserProfile? _user;
  ClientProfile? _client;
  String? _phone;
  bool _biometrics = false;
  bool _biometricsAvailable = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final phone = await widget.store.phone;
    final bio = await widget.store.biometricsEnabled;
    final available = await widget.store.biometricsAvailable();
    try {
      final me = await widget.api.fetchMe();
      if (!mounted) return;
      setState(() {
        _user = me.user;
        _client = me.profile;
        _phone = phone;
        _biometrics = bio;
        _biometricsAvailable = available;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _phone = phone;
        _biometrics = bio;
        _biometricsAvailable = available;
      });
    }
  }

  String get _prettyPhone {
    final p = _phone;
    if (p == null || p.length != 11) return "";
    return "+7 ${p.substring(1, 4)} ${p.substring(4, 7)}-"
        "${p.substring(7, 9)}-${p.substring(9)}";
  }

  @override
  Widget build(BuildContext context) {
    final week = _client?.currentWeek ?? 1;

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
      children: foxStagger([
        const FoxScreenTitle(title: "Профиль"),
        const SizedBox(height: 18),
        FoxCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: FoxTokens.bgGrey,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  _initials(_user?.displayName ?? "К"),
                  style: FoxType.bodyM.copyWith(
                    color: FoxTokens.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _user?.displayName ?? "Клиент",
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      [
                        if (_prettyPhone.isNotEmpty) _prettyPhone,
                        if (_client?.hasReport ?? false) "Неделя $week",
                      ].join(" · "),
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _NutritionistCard(),
        const SizedBox(height: 16),
        FoxListRow(
          title: "История отчётов",
          hint: (_client?.hasReport ?? false) ? "1 отчёт" : "нет",
          onTap: widget.onUploadReport,
        ),
        const SizedBox(height: 8),
        const FoxListRow(title: "Дневник симптомов", hint: "ведётся"),
        const SizedBox(height: 8),
        const FoxListRow(title: "Обучение", hint: "6 уроков"),
        const SizedBox(height: 8),
        FoxCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          radius: 16,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Вход по биометрии",
                      style: FoxType.bodyS.copyWith(
                        color: FoxTokens.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _biometricsAvailable
                          ? "Face ID или отпечаток вместо пин-кода"
                          : "Недоступно на этом устройстве",
                      style: FoxType.captionS.copyWith(
                        color: FoxTokens.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _biometrics && _biometricsAvailable,
                onChanged: _biometricsAvailable
                    ? (v) async {
                        await widget.store.setBiometricsEnabled(v);
                        if (mounted) setState(() => _biometrics = v);
                      }
                    : null,
                activeThumbColor: FoxTokens.accentLime,
                activeTrackColor: FoxTokens.bgGreen,
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        const FoxListRow(title: "Согласия и данные", hint: "152-ФЗ"),
        const SizedBox(height: 18),
        FoxButton(
          label: "Выйти",
          kind: FoxButtonKind.outline,
          onPressed: widget.onSignOut,
        ),
        const SizedBox(height: 16),
        Text(
          "IgG — не диагноз аллергии и не замена базовой диагностики. "
          "Интерпретация — со специалистом.",
          textAlign: TextAlign.center,
          style: FoxType.captionS.copyWith(
            color: FoxTokens.textSecondary,
            height: 17 / 12,
          ),
        ),
      ]),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r"\s+"));
    if (parts.isEmpty || parts.first.isEmpty) return "К";
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first)
        .toUpperCase();
  }
}

class _NutritionistCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => FoxCard(
    tone: FoxCardTone.dark,
    padding: const EdgeInsets.all(18),
    radius: 22,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.medical_services_outlined,
                size: 22,
                color: FoxTokens.textInverted,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Нутрициолог",
                    style: FoxType.bodyS.copyWith(
                      color: FoxTokens.textInverted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    "Подключите специалиста — он посмотрит план "
                    "и добавит комментарии",
                    style: FoxType.captionS.copyWith(
                      color: FoxTokens.textInvertedSecondary,
                      height: 17 / 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        FoxButton(
          label: "Подключить специалиста",
          kind: FoxButtonKind.accent,
          size: FoxButtonSize.small,
          onPressed: () {},
        ),
      ],
    ),
  );
}
