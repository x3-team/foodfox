# FoodFox — Android (Flutter)

Нативное Android-приложение: те же 4 экрана, что и веб, API — `https://foodfox.yuri.guru`.

## Экраны

| Вкладка | Функция |
|---------|---------|
| Отчёт | PDF FOX → upload |
| Результаты | зоны 🟢🟡🔴 |
| Рецепты | неделя плана |
| Чат | Heli-бот |

## Локальная сборка APK

```bash
# Flutter 3.x + Android SDK
cd apps/mobile
flutter pub get
cp android/key.properties.example android/key.properties
flutter build apk --debug \
  --dart-define=FOX_API_BASE=https://foodfox.yuri.guru \
  --dart-define=FOX_BASIC_USER=demo \
  --dart-define=FOX_BASIC_PASS=FoodFox2026!
```

APK: `build/app/outputs/flutter-apk/app-debug.apk`

Установка на телефон: скопировать APK → «Разрешить из неизвестных источников» → установить.

**Обновление:** CI подписывает APK общим demo-keystore. Если раньше стояла сборка с другой подписью, Android покажет «конфликтует с другим пакетом» — удалите FoodFox и установите заново. Дальнейшие APK из GitHub Actions будут обновляться без удаления.

## Версия

Semver в корне `VERSION`, сборка — суффикс `+N` в `pubspec.yaml`. Обновление:

```bash
bash scripts/bump-version.sh build   # только номер сборки
bash scripts/bump-version.sh patch   # 0.2.0 → 0.2.1
```

Номер виден на экране входа. CI автоматически бампит сборку и называет artifact `foodfox-0.2.0 (N)-debug.apk`.

## CI

GitHub Actions: `.github/workflows/android-apk.yml` — на push в `apps/mobile/` собирает debug APK.

## Release APK (подпись)

```bash
flutter build apk --release \
  --dart-define=FOX_API_BASE=https://foodfox.yuri.guru \
  ...
```

Для Google Play нужен keystore — настроить в `android/app/build.gradle.kts`.

## Дизайн

Токены из Figma / web: `#F7F9F4` bg, `#256029` primary — см. `lib/theme/fox_theme.dart`.

## iOS / TestFlight

iOS project lives in `ios/` (bundle id `guru.yuri.foodfox`, display name "FoodFox").
Build & upload run on GitHub Actions (macOS): workflow **iOS TestFlight**
(`.github/workflows/ios-testflight.yml`), manual `workflow_dispatch` only.

Required repo secrets:

| Secret | Value |
|---|---|
| `APPSTORE_ISSUER_ID` | Issuer ID from App Store Connect API page |
| `APPSTORE_KEY_ID` | API Key ID |
| `APPSTORE_PRIVATE_KEY` | full text of `AuthKey_<KEY_ID>.p8` |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10 chars) |

Create the key: App Store Connect → Users and Access → Integrations → App Store Connect API →
Team Keys → "+" (role App Manager) → Generate; copy Issuer ID + Key ID, download the .p8 (one-time).
Before the first upload, create the App ID `guru.yuri.foodfox` and the app record in App Store Connect.
Signing is automatic (Xcode cloud-managed via the API key); no certificate/profile secrets needed.
