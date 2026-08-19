# NightTime beta release checklist

## Автоматические проверки

- `npm ci`
- `npm run test:all`
- `$env:RUN_EXTENSION_E2E='1'; npm run test:e2e`
- Убедиться, что в `.output/chrome-mv3/manifest.json` указана актуальная версия.

## Ручная матрица сайтов

- Google Search: поле ввода, focus-линия, подсказки.
- ChatGPT и Gemini: композитор, кнопки, раскрывающиеся меню.
- YouTube: видео, субтитры, полноэкранный режим.
- GitHub: код, diff, формы и модальные окна.
- Wikipedia: текст, таблицы, изображения.
- Сайт с внешним CSS/CDN и страница с iframe.

Для каждого сайта проверить включение, все профили, яркость, «всегда включать», «всегда выключать», Night Shift и восстановление исходного вида после отключения.

## Chrome Web Store

- Использовать название `NightTime — Dark Mode for Every Website`.
- Загрузить ZIP только из свежего `.output/chrome-mv3`.
- Добавить иконку 128×128, скриншоты и тексты RU/EN.
- Опубликовать privacy disclosure из `docs/PRIVACY.md` на доступной веб-странице и указать ссылку в карточке расширения.
- Объяснить разрешения `storage`, `alarms` и доступ к HTTP/HTTPS-сайтам.
