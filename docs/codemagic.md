# Сборка iOS в Codemagic

iPhone-версия FoodFox для TestFlight собирается в Codemagic на Mac mini M2. Бесплатно дают 500 минут в месяц. Настройки лежат в `codemagic.yaml` в корне репозитория, единственный процесс **iOS → TestFlight** (`ios-testflight`) запускает `scripts/ios-release.sh` и собирает `.ipa` из `apps/mobile`.

Сборки запускаются только вручную: в `codemagic.yaml` нет `triggering`, поэтому push и PR ничего не запускают. Подписью занимается сам скрипт (`scripts/asc-signing.rb`) через ключ App Store Connect API:

- регистрирует App ID `guru.yuri.foodfox`, если его ещё нет;
- создаёт собственный сертификат Apple Distribution для FoodFox (один раз, дальше берёт его же) и профиль «FoodFox App Store». Другие сертификаты и профили команды, например у Diggo, не трогает;
- Team ID берёт из сертификата, отдельно задавать не нужно.

Разделы Codemagic «Code signing identities» и «App Store Connect integration» не нужны.

## Что сделать один раз

1. **Ключ App Store Connect API.** Подойдёт тот же Team key, что для Diggo, если FoodFox будет в том же аккаунте разработчика. Если нужен новый: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → «+», роль Admin или App Manager. Скачать `.p8` (скачивается один раз), записать Key ID и Issuer ID.
2. **Запись приложения в App Store Connect.** Apps → «+» → New App: платформа iOS, имя FoodFox, язык русский, Bundle ID `guru.yuri.foodfox`, SKU любой (например `foodfox`). Если Bundle ID нет в списке, его можно создать в developer.apple.com → Identifiers или просто запустить первую сборку: скрипт зарегистрирует его сам, а загрузка в TestFlight остановится с понятной ошибкой, пока записи нет.
3. **Приложение в Codemagic.** Зайти на codemagic.io через GitHub. Add application → GitHub → `x3-team/foodfox`. Если репозитория нет в списке, дай приложению Codemagic в GitHub доступ к нему. Тип проекта: Flutter App, настройка через `codemagic.yaml`.
4. **Секреты.** В приложении открыть Environment variables и создать группу `foodfox_apple` с переменными (все с галкой Secure):
   - `ASC_KEY_ID`: ID ключа App Store Connect API;
   - `ASC_ISSUER_ID`: Issuer ID;
   - `ASC_KEY_P8`: текст файла `AuthKey_….p8` целиком, от `-----BEGIN PRIVATE KEY-----` до `-----END PRIVATE KEY-----`;
   - по желанию `APPLE_TEAM_ID`, если Team ID нужно задать явно.

   В чат эти значения не присылать.

## Как запустить

Start new build → ветка (`main` после мержа) → процесс «iOS → TestFlight». Номер сборки: 2000 + номер запуска в Codemagic, он растёт сам. Версия берётся из файла `VERSION`. Готовый `.ipa` лежит в Artifacts, а в TestFlight сборка появляется после обработки у Apple (обычно 10–30 минут).

Чтобы только собрать и подписать, без загрузки, добавь при запуске переменную `FOX_UPLOAD=false`.

Время: первая сборка около 20 минут (Flutter и CocoaPods без кэша), дальше быстрее. 500 минут хватит примерно на 25–35 сборок в месяц.

## Если сборка упала

- `HTTP 401` на первых шагах: неверный Key ID, Issuer ID или текст `.p8`.
- `HTTP 403` при создании сертификата или App ID: у ключа роль ниже App Manager.
- Ошибка про лимит сертификатов: в developer.apple.com → Certificates у команды уже максимум Apple Distribution. Нужно отозвать ненужный.
- `no App Store Connect app for guru.yuri.foodfox`: не создана запись приложения (шаг 2).

Запасной путь: GitHub workflow `.github/workflows/ios-testflight.yml` (облачный `macos-latest`, тоже только ручной запуск). Ему нужны свои секреты в GitHub, см. комментарий в начале файла.
