# Figma — Fox приложение

**Файл:** [Fox приложение](https://www.figma.com/design/DSXq09GRmYROMmX9SIrWlm/Fox-приложение)

## Текущее содержимое файла

В файле сейчас одна страница — **MVP Screens** (`0:1`), первый черновик v1:

| Экран | Node ID | Route |
|-------|---------|-------|
| 01 Upload | `1:2` | `/upload` |
| 02 Results | `1:28` | `/results` |
| 03 Recipes | `1:69` | `/recipes` |
| 04 Chat | `1:103` | `/chat` |

Логотип в шапках макетов — текстовый слой с эмодзи 🦊; в коде он перерисован
вектором, см. [DESIGN-REFERENCES.md](DESIGN-REFERENCES.md#логотип).

> Страницы **MVP v2** с pixel-perfect захватами (`9:2`, `22:2`, `25:2`, `26:2`, `27:2`)
> в файле больше нет — код ушёл вперёд макетов. Перед синхронизацией сверяйтесь
> с реальной структурой через `get_metadata`.

### Как обновить макеты из кода

```bash
cd apps/web
NEXT_PUBLIC_FIGMA_CAPTURE=1 npm run dev -- -p 3000
# Получить captureId через Figma MCP generate_figma_design (fileKey DSXq09GRmYROMmX9SIrWlm, nodeId 9:2)
npx tsx scripts/figma-capture-one.ts /upload <CAPTURE_ID>
```

## Устаревшие макеты

- **MVP v2 placeholders** (`14:53`, `14:10`, `14:111`, `14:80`) — ручная сборка через use_figma, можно скрыть
- **MVP Screens** (v1) — первый черновик, можно удалить

## Design tokens

| Token | Value |
|-------|-------|
| `bg` | `#F7F9F4` |
| `primary` | `#256029` |
| `surface` | `#FFFFFF` |
| `text` | `#1C1C1E` |
| `text-muted` | `#6B7280` |

Референсы: [DESIGN-REFERENCES.md](DESIGN-REFERENCES.md)
