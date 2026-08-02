# NightTime — Dark Mode for Every Website

Тёмный режим, ночной фильтр и комфортная настройка цветов для любых сайтов.

Smart dark mode, night filter and eye-comfort settings for every website.

## Команды

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Для E2E один раз установите Chromium Playwright и затем запустите тест:

```text
npm exec playwright -- install chromium
$env:RUN_EXTENSION_E2E='1'; npm run test:e2e
```

После `npm run build` распакованная версия расширения находится в `.output/chrome-mv3`.
