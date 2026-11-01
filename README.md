# NightTime — Dark Mode for Every Website

Тёмный режим, ночной фильтр и комфортная настройка цветов для любых сайтов.

Smart dark mode, night filter and eye-comfort settings for every website.

## About / О проекте

NightTime is a browser extension that adapts website colors for more comfortable viewing in dark environments. It combines a locally bundled Dark Reader engine with color profiles, brightness controls, site-specific settings, and a developing Smart Dark readability layer. The interface is available in English and Russian.

NightTime — браузерное расширение, которое адаптирует цвета сайтов для комфортного просмотра в тёмное время суток. Оно сочетает локально встроенный движок Dark Reader, цветовые профили, настройку яркости, индивидуальные правила сайтов и развивающийся слой улучшения читаемости Smart Dark. Интерфейс доступен на русском и английском языках.

## Возможности

- Умное затемнение страниц на базе локально встроенного Dark Reader.
- Семь профилей, регулировка яркости, Night Shift и расписание.
- Отдельные правила для сайтов: общие настройки, всегда включать или всегда выключать.
- Русский и английский интерфейс с автоматическим выбором языка.
- Настройки хранятся только локально; аналитики и удалённого JavaScript нет.

## Features

- Dark mode powered by the locally bundled Dark Reader engine.
- Color profiles, brightness adjustment, Night Shift, and scheduling.
- Per-site settings: follow general rules, always enable, or always disable.
- English and Russian interface with automatic language selection.
- Settings are stored locally; the extension does not include analytics or remote JavaScript.
- Smart Dark text-readability analysis is under active development.

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

## License / Лицензия

Copyright (c) 2026 Abdurakhman Urusov. NightTime is licensed under the [PolyForm Strict License 1.0.0](LICENSE). It permits noncommercial use, including personal use, but does not grant permission to distribute or modify the software. See the license for its complete terms, including provisions for certain noncommercial organizations. Third-party components retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).

Copyright (c) 2026 Abdurakhman Urusov. NightTime распространяется на условиях [PolyForm Strict License 1.0.0](LICENSE). Лицензия разрешает некоммерческое, в том числе личное использование, но не предоставляет права распространять или изменять программу. Полные условия, включая положения для отдельных некоммерческих организаций, приведены в тексте лицензии. Сторонние компоненты сохраняют собственные лицензии; см. [уведомления о стороннем ПО](THIRD_PARTY_NOTICES.md).
