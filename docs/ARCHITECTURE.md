# Архитектура NightTime

```text
Popup / Options → chrome.storage.local → Content script → ThemeController
                                            ├─ SmartEngine (Dark Reader)
                                            ├─ ReadabilityLayer
                                            ├─ DimmingOverlay
                                            └─ NightShiftOverlay

Content script → service worker → проверенный fetch внешнего CSS/шрифтов
Service worker → chrome.alarms → обновление открытых вкладок по расписанию
```

## Компоненты

- `entrypoints/popup/` — компактное управление включением, профилем, яркостью и правилом текущего сайта.
- `entrypoints/options/` — профили, расписание, Night Shift, списки сайтов и язык.
- `entrypoints/content.ts` — вычисляет эффективные настройки и применяет их без перезагрузки страницы.
- `entrypoints/background.ts` — обслуживает безопасную загрузку ресурсов и один общий alarm расписания.
- `src/content/theme-controller.ts` — идемпотентно включает, обновляет и выключает визуальные слои.
- `src/engines/smart-engine.ts` — единственное место интеграции локального Dark Reader.
- `src/shared/settings-resolver.ts` — чистая логика приоритетов, не зависящая от Chrome API.

## Приоритеты правил

Наиболее конкретный доменный override имеет приоритет над общим доменом. «Всегда выключать» блокирует тему; «всегда включать» обходит blacklist/whitelist, расписание и распознавание нативной темы, но сохраняет действие глобального выключателя. При отсутствии override применяются общий список, расписание и остальные настройки.

## Безопасность ресурсов

Content script не выполняет cross-origin fetch самостоятельно. Service worker принимает запросы только от content scripts NightTime, разрешает `http:`/`https:`, блокирует локальные и служебные адреса, проверяет перенаправления и MIME-типы, не передаёт credentials и ограничивает ответ двумя мегабайтами.

## Фреймы и визуальные слои

Dark Reader и слой читаемости работают во всех подходящих фреймах. DimmingOverlay и NightShiftOverlay создаются только в верхнем документе, чтобы iframe не затемнялись дважды.

## Хранение и миграции

Единственная схема настроек находится в `settings-model.ts`; проверка и миграция — в `settings-validation.ts`. Текущая schema version — 2. Старый быстрый движок и неработающие параметры профилей удаляются при нормализации.
