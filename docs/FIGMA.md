# Figma — Fox приложение

**Файл:** [Fox приложение](https://www.figma.com/design/DSXq09GRmYROMmX9SIrWlm/Fox-приложение)

## Актуальные макеты → страница **MVP v2** (v3 captures)

Pixel-perfect захваты из работающего Next.js приложения (`generate_figma_design`).

**Прямая ссылка на страницу v2:**  
https://www.figma.com/design/DSXq09GRmYROMmX9SIrWlm/Fox-приложение?node-id=9-2

| Экран | Node ID | Route |
|-------|---------|-------|
| 01 Upload v3 | `22:2` | `/upload` |
| 02 Results v3 | `25:2` | `/results` |
| 03 Chat v3 | `26:2` | `/chat` |
| 04 Recipes v3 | `27:2` | `/recipes` |

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
