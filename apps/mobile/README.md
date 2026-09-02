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
flutter build apk --debug \
  --dart-define=FOX_API_BASE=https://foodfox.yuri.guru \
  --dart-define=FOX_BASIC_USER=demo \
  --dart-define=FOX_BASIC_PASS=FoodFox2026!
```

APK: `build/app/outputs/flutter-apk/app-debug.apk`

Установка на телефон: скопировать APK → «Разрешить из неизвестных источников» → установить.

## CI

GitHub Actions: `.github/workflows/android-apk.yml` — на push собирает debug APK как artifact.

## Release APK (подпись)

```bash
flutter build apk --release \
  --dart-define=FOX_API_BASE=https://foodfox.yuri.guru \
  ...
```

Для Google Play нужен keystore — настроить в `android/app/build.gradle.kts`.

## Дизайн

Токены из Figma / web: `#F7F9F4` bg, `#256029` primary — см. `lib/theme/fox_theme.dart`.
