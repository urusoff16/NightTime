# NightTime — Dark Mode for Every Website

Тёмный режим, ночной фильтр и комфортная настройка цветов для любых сайтов.

Smart dark mode, night filter and eye-comfort settings for every website.

## Возможности

- Умное затемнение страниц на базе локально встроенного Dark Reader.
- Семь профилей, регулировка яркости, Night Shift и расписание.
- Отдельные правила для сайтов: общие настройки, всегда включать или всегда выключать.
- Русский и английский интерфейс с автоматическим выбором языка.
- Настройки хранятся только локально; аналитики и удалённого JavaScript нет.

## Команды

```text
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run zip
```

Для E2E один раз установите Chromium Playwright и затем запустите тест:

```text
npm exec playwright -- install chromium
$env:RUN_EXTENSION_E2E='1'; npm run test:e2e
```

После `npm run build` распакованная версия находится в `.output/chrome-mv3`. Команда `npm run zip` создаёт архив для загрузки в Chrome Web Store.

Перед публикацией выполните `npm run test:all`, `npm run test:e2e` и ручную проверку из `docs/RELEASE_CHECKLIST.md`.
