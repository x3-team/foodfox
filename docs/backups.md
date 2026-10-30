# Резервные копии FoodFox

Скрипт `deploy/vps/backup.sh` запускается cron-ом каждую ночь в 00:30 UTC (03:30 МСК). Расписание ставит `deploy/vps/update.sh` при деплое (строка с пометкой `# foodfox-backup` в crontab пользователя деплоя). Статус виден в админке: «Система → Резервные копии» (только администратор).

## Что копируется

| Что | Откуда | В копии |
| --- | --- | --- |
| База Postgres целиком | контейнер `foodfox-postgres`, `pg_dump -Fc` | `db.dump` |
| Медиатека админки | `FOX_MEDIA_DIR` (`/var/www/foodfox-data/media`) | `media/` |
| Сканы документов партнёров (уже зашифрованы `FOX_PD_KEY`) | `FOX_PD_DIR` (`/var/www/foodfox/data/partner-pd`) | `partner-pd/` |
| PDF отчётов клиентов | `REPORT_STORAGE_DIR` (`/var/www/foodfox/data/reports`) | `reports/` |

Копии лежат в `FOX_BACKUP_DIR` (`/var/www/foodfox-data/backups/<ГГГГ-ММ-ДД_ЧЧММСС>/`), лог в `backup.log` там же. Файлы копируются через `rsync --link-dest`: файл, который не менялся, — жёсткая ссылка на прошлую копию и места не занимает. Копии старше 14 дней (`FOX_BACKUP_DAYS`) удаляются, последние 3 удачные остаются всегда.

**Ключ `FOX_PD_KEY` в копию не входит.** Без него сканы партнёров не расшифровать: храните ключ отдельно (менеджер паролей).

## Копия на другой сервер

Копия на том же диске не спасёт при потере VPS. Настройте rclone (`rclone config`, например S3-хранилище) и задайте в `apps/web/.env`:

```
FOX_BACKUP_RCLONE_REMOTE=backup:foodfox
```

## Ручной запуск

```
bash /var/www/foodfox/deploy/vps/backup.sh
```

Ничего не перезапускает и не блокирует запись в базу.

## Восстановление

База (в пустую базу `foodfox_restore`, затем проверить и переключить):

```
B=/var/www/foodfox-data/backups/<папка>
docker exec foodfox-postgres createdb -U foodfox foodfox_restore
docker exec -i foodfox-postgres pg_restore -U foodfox -d foodfox_restore --no-owner < $B/db.dump
```

Восстановить поверх рабочей базы (остановите сайт и приложение: `pm2 stop foodfox foodfox-site`):

```
docker exec -i foodfox-postgres pg_restore -U foodfox -d foodfox --clean --if-exists --no-owner < $B/db.dump
```

Файлы:

```
rsync -a $B/media/ /var/www/foodfox-data/media/
rsync -a $B/partner-pd/ /var/www/foodfox/data/partner-pd/
rsync -a $B/reports/ /var/www/foodfox/data/reports/
```
