# Мониторинг FoodFox: краши, аналитика, ошибки API

## Что выбрали

| Задача | Инструмент | Где код |
|---|---|---|
| Краши и ошибки приложения (iOS, Android, Dart) | **AppMetrica** (Яндекс) | `apps/mobile/lib/services/telemetry.dart` |
| Продуктовая аналитика и воронка нового пользователя | **AppMetrica**, тот же SDK | события `FoxEvent` там же |
| Ошибки бэкенда/API | **JSON-лог в PM2 + GlitchTip** на нашем VPS (протокол Sentry) | `apps/web/src/lib/monitoring.ts`, `deploy/vps/glitchtip/` |

Связка между ними: приложение шлёт в каждом запросе заголовок `X-Request-Id`, сервер пишет его в лог и в GlitchTip и возвращает обратно. Ошибка API в AppMetrica содержит тот же `request_id`, так что один сбой находится с обеих сторон.

Без ключей ничего не включается: сборка без `FOX_APPMETRICA_KEY` ничего не отправляет, сервер без `FOX_ERRORS_DSN` только пишет лог.

## Сравнение

| | AppMetrica | Firebase Crashlytics + Google Analytics | Sentry (облако) | GlitchTip (свой сервер) |
|---|---|---|---|---|
| Бесплатно | краши, ошибки, события, воронки, профили; жёсткие лимиты не публикуются | Crashlytics и Analytics без лимита | Developer: 5 тыс. ошибок в месяц, 1 пользователь | без лимитов, платим только за сервер (256–512 МБ RAM) |
| Работа из РФ | российский сервис, данные в РФ, интерфейс на русском, нормально для 152-ФЗ | SDK работает, но это трансграничная передача данных в Google, биллинг из РФ недоступен, риск ограничений | карты РФ не принимают, были блокировки аккаунтов и провайдерами, риск потерять доступ | данные на нашем VPS, внешних зависимостей нет |
| Дашборд | воронки, удержание, версии, краши с группировкой в одном месте | Crashlytics отличный, воронки в GA4 через «Исследования», неудобно | лучший разбор ошибок, продуктовой аналитики нет | как Sentry, попроще |
| Flutter | официальный плагин `appmetrica_plugin` 4.1, Dart-ошибки и нативные краши, dSYM через helper | FlutterFire, нужны `google-services.json` и `GoogleService-Info.plist`, плагин Gradle | лучший Flutter SDK | через Sentry SDK, но без символикации dSYM |

Почему так:

- **Приложение → AppMetrica.** Один SDK закрывает и краши, и воронку, бесплатно, работает из РФ, данные остаются в РФ. Firebase сильнее в крашах, но это вторая система для аналитики через GA4, трансграничная передача и риски Google в РФ. Sentry для мобильных крашей лучший, но не оплачивается из РФ и не даёт продуктовой аналитики.
- **API → GlitchTip на VPS.** AppMetrica серверные ошибки не принимает. GlitchTip говорит по протоколу Sentry, лёгкий (all-in-one без Valkey), стоит на том же сервере, данные никуда не уходят. Если когда-нибудь захотим Sentry, меняется только `FOX_ERRORS_DSN`, код тот же.
- Сервер уже пишет свои продуктовые события в таблицу `analytics_events` (регистрация, загрузка отчёта, чат). Это вторая, серверная правда для воронки, её можно сверять с AppMetrica.

## Ключи, которые нужно завести

В чат значения не присылать.

1. **AppMetrica → API key приложения.** appmetrica.yandex.ru → «Добавить приложение» → FoodFox (одно приложение на iOS и Android). Ключ из «Настройки» → «Основные».
   - GitHub: Settings → Secrets and variables → Actions → **Variables** → `FOX_APPMETRICA_KEY` (это не секрет, ключ всё равно лежит в приложении). Нужен Android-сборке и запасной iOS-сборке.
   - Codemagic: группа `foodfox_apple` → `FOX_APPMETRICA_KEY`.
2. **AppMetrica → Post API key** (там же, «Настройки» → «Основные», ключ для загрузки dSYM).
   - Codemagic: группа `foodfox_apple` → `APPMETRICA_POST_API_KEY`, галка Secure.
3. **GlitchTip на VPS** (`deploy/vps/glitchtip/.env`, образец `.env.example`):
   - `SECRET_KEY` (`openssl rand -hex 32`), `POSTGRES_PASSWORD` (`openssl rand -hex 16`);
   - поддомен `errors.foodfox.yuri.guru`: DNS-запись, nginx на `127.0.0.1:8010`, сертификат;
   - по желанию `EMAIL_URL` (SMTP), чтобы приходили письма о новых ошибках.
4. **`FOX_ERRORS_DSN`** — DSN проекта из GlitchTip (Project → Settings → Client Keys). Положить в `apps/web/.env` на VPS. `update.sh` при деплое печатает, задан он или нет.
5. По желанию **`FOX_ENV`** в `apps/web/.env` (`production`/`staging`), чтобы разделять окружения в GlitchTip.

## Что делается при сборке

- **Версия и сборка.** AppMetrica сама берёт версию и номер сборки из приложения (`0.3.9 (17)` и т.п.), краши и события фильтруются по ним. Сервер помечает события `release = foodfox-web@<VERSION>+<build>`.
- **iOS dSYM.** `scripts/ios-release.sh` после архивации:
  - всегда кладёт `dSYMs-<версия>-<сборка>.zip` в артефакты Codemagic (`apps/mobile/build/ios-release-dsyms/`);
  - если задан `APPMETRICA_POST_API_KEY`, отправляет dSYM в AppMetrica утилитой `helper` из пода `AppMetricaCrashes`. Сбой отправки сборку не валит; zip можно загрузить руками: AppMetrica → «Настройки» → «Крэши» → iOS.
- **Android.** Код приложения на Dart, Dart-стеки приходят читаемыми (сборка без `--obfuscate`). Если когда-нибудь включим обфускацию, нужно будет грузить символы отдельно.
- Сборки сами по себе ничего не запускают: Codemagic только вручную, как и раньше.

## События воронки

Воронка нового пользователя в AppMetrica («Воронки» → новая, шаги по событиям):

`signin_completed` → `upload_opened` → `upload_file_chosen` → `processing_started` → `processing_succeeded` → `results_viewed` (has_report = true) → `plan_viewed` / `chat_message_sent`

Для новых пользователей фильтр «Новые пользователи» или сегмент по дате установки. Демо-сессии помечены переменной окружения `demo = 1`, их стоит исключать.

| Событие | Когда | Параметры |
|---|---|---|
| `screen_view` | открыт экран или вкладка | `screen`: onboarding, auth_phone, auth_sms, auth_pin_create, auth_pin_confirm, results, plan, chat, recipes, profile, upload, processing, recipe_detail |
| `onboarding_start` | «Начать» на онбординге | |
| `otp_requested` / `otp_request_failed` | запрос SMS-кода | `offline_demo`; `reason`: network, rate_limited, other |
| `otp_verified` / `otp_failed` | проверка кода | `reason`: wrong_code, rate_limited, network, other |
| `signin_completed` | PIN создан, вход завершён | `demo` |
| `unlocked` | вход по PIN или биометрии | `method`: pin, biometric |
| `signed_out` | выход | |
| `upload_opened` | открыт экран загрузки | `from`: results, plan, profile |
| `upload_photo_asked` | нажали «Камера»/«Галерея» (фото пока не распознаём) | `source` |
| `upload_rejected` | файл не подошёл | `reason`: too_big, not_pdf, unreadable, picker_failed |
| `upload_file_chosen` | выбран PDF | `size`: <1MB, 1-5MB, 5-10MB, >10MB |
| `processing_started` / `processing_retry` | начата обработка / «Повторить» | `attempt` |
| `processing_succeeded` | отчёт разобран | `parsed_count`, `confidence`, `seconds`, `attempt` |
| `processing_failed` | ошибка обработки | `reason`: recognition, network, server; `seconds`, `attempt` |
| `results_viewed` | загружены результаты | `has_report` |
| `plan_viewed` | открыт план | `from`: tab, или откуда пришли |
| `chat_opened` | открыт помощник | `from`: tab, results, plan, upload_support |
| `ask_assistant` | вопрос помощнику с другого экрана | `from` |
| `chat_message_sent` | сообщение помощнику отправлено | `preset`: подсказка или свой текст |
| `recipe_opened` | открыт рецепт | |
| `api_network_error` | запрос не прошёл после повторов | `error`: тип исключения |

Ошибки (раздел «Крэши и ошибки»): необработанные Dart-ошибки, нативные краши, ответы API 5xx с группой `api <код> <метод> <путь>` и `request_id`.

## Чего в событиях нет

Телефона, имени, e-mail, текста чата, имён файлов, значений и зон отчёта. `Telemetry.cleanParams` отбрасывает строки длиннее 40 символов и всё, похожее на номер или адрес почты, так что ошибка в месте вызова не пропустит персональные данные. На сервере в GlitchTip уходят маршрут, тип и текст ошибки (цифры длиннее 9 знаков и e-mail вырезаются), `request_id`, версия; UUID клиента пишется только в локальный лог. Местоположение и рекламный идентификатор в AppMetrica выключены.

Перед публикацией обновить: App Store Connect → App Privacy (Crash Data, Product Interaction, Other Diagnostic Data; не связаны с личностью, не для трекинга), Google Play → Data safety (Crash logs, Diagnostics, App interactions), политику конфиденциальности (упомянуть AppMetrica).

## Как поставить GlitchTip

```bash
cd /var/www/foodfox/deploy/vps/glitchtip
cp .env.example .env && nano .env      # SECRET_KEY, POSTGRES_PASSWORD
docker compose up -d
```

Nginx: `errors.foodfox.yuri.guru` → `proxy_pass http://127.0.0.1:8010`, сертификат через certbot. Зарегистрировать первого пользователя, создать организацию и проект (платформа Node.js), затем `ENABLE_USER_REGISTRATION=false` в `.env` и `docker compose up -d`. DSN проекта → `FOX_ERRORS_DSN` в `apps/web/.env`, перезапуск через `deploy/vps/update.sh`.

Проверка: `curl -X POST https://foodfox.yuri.guru/api/auth/otp/request -H 'content-type: application/json' -d 'x'` даёт 500, событие появляется в GlitchTip с маршрутом `POST /api/auth/otp/request`.
