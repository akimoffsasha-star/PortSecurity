# Моніторинг охорони портових засобів та суден — Наказ № 797

Веб-застосунок без збірки: відкрийте **`index.html`** подвійним кліком (потрібен інтернет для бібліотек із CDN і для Supabase).
Необов'язково: `start.bat` / `start.sh` піднімають локальний сервер (потрібен Python 3) — зручно для відлагодження.

## Структура

```
index.html                  ← файл запуску: шапка, підвал, підключення бібліотек і модулів
css/
  base.css                  змінні, шапка, картки, таблиці, бейджі, індикатор завантаження
  dashboard.css             KPI-картки, плитки горизонту, підказка графіків
  calendar.css              календар перевірок
  print.css                 друк
js/
  config.js                 URL/ключ Supabase за замовчуванням, список колонок реєстру
  state.js                  глобальний стан (state, вибір, фільтри, екземпляри графіків)
  app.js                    точка входу: initClient, події вікна, делегування кліків
  core/
    utils.js                esc, дати, debounce, downloadBlob, runBatched
    domain.js               строки документів, Risk Score, бейджі станів
  ui/
    animations.js           анімації (Web Animations API, без бібліотек)
    feedback.js             завантаження, сповіщення, діалоги підтвердження
    virtual-table.js        віртуалізація великих таблиць
  data/
    cache.js                кеш в IndexedDB
    loader.js               loadAll, applyAllDataToUi, мітки синхронізації
    realtime.js             підписка Supabase Realtime, часткові оновлення
  features/
    settings.js             налаштування підключення, оператор, автооновлення
    filters.js              збереження фільтрів, списки, переходи між вкладками
    dashboard/              chart-theme.js · dashboard.js · charts.js
    facilities/             registry.js · columns.js · bulk.js · modal.js · duplicates.js
    admin/                  ports.js · audit.js · backup.js
    inspections.js  calendar.js  vessels.js  gisis.js
  export/
    excel.js                повний звіт за наказом, вибірки, тривоги
    report.js               PDF та email
  views/                    HTML-шаблони (вставляються через Views.mount())
    registry.js             реєстр шаблонів
    tab-*.js                вкладки: аналітика, реєстр, перевірки, календар, судна
    modals-core.js          налаштування, картка ПЗ, перевірка, показник суден, діалог
    modals-tools.js         ГІСІС, дублікати, довідник портів, журнал
```

## Як це працює

* Усі `.js` — звичайні скрипти (не ES-модулі), тому працюють і з `file://`. Вони спільно використовують
  глобальні `let/const/function`, а **порядок підключення в `index.html` важливий**.
* Розмітка вкладок і модальних вікон лежить у `js/views/*.js` як шаблонні рядки. `Views.mount()` вставляє їх у
  `#tabContent` і `#modalsHost` під час `DOMContentLoaded`, перед `initClient()`.
* Кнопки в рядках таблиць, що несуть код ПЗ, використовують `data-action` + `data-code`; єдиний слухач у
  `app.js → bindActionDelegation()` викликає потрібну функцію. Значення з бази не потрапляють у код обробників.

## Типові завдання

| Що зробити | Де |
|---|---|
| Змінити колір, відступ, вигляд таблиці | `css/*.css` |
| Змінити порогові значення ризиків | `js/core/domain.js → calcRiskInfo` |
| Змінити склад колонок Excel-звіту | `js/export/excel.js` |
| Додати нову вкладку | новий `js/views/tab-X.js` (`Views.addTab("tabX", ...)`) + кнопка в `index.html` + файл логіки + `<script>` |
| Змінити поля картки ПЗ | `js/views/modals-core.js` + `js/features/facilities/modal.js` |
| Знайти, що відкриває кнопку | шукати назву функції в `js/views/` та `js/app.js` |

## Відлагодження

* Відкрийте DevTools → Sources: кожен модуль — окремий файл із власними точками зупину.
* Стан доступний у консолі: `state.facilities`, `state.ports`, `state.inspections`, `state.vessels`.
* Налаштування (URL, ключ, ПІБ оператора) зберігаються в `localStorage`; кеш даних — IndexedDB `maritime_security_cache`.

## Журнал імпортів ГІСІС

Єдине джерело — таблиця Supabase `gisis_import_log`. Історія в модалці імпорту читається з БД
(останні 30 записів). `localStorage` для цього журналу більше не використовується.

## Автотести

Постійний набір тестів чистої логіки (дати ГІСІС, визначення колонок, ризики, utils):

* Браузер: відкрити `tests/run.html`
* Node: `node tests/pure-logic.test.js`

При зміні `parseFlexibleDate` / `detectGisisColumns` / `calcRiskInfo` оновіть дзеркала в
`tests/pure-logic.test.js`.

## Збірка (Vite + legacy)

| Режим | Команда | Примітка |
|--------|---------|----------|
| Без збірки | `index.html` / `start.sh` / `start.bat` | класичні `<script>`, `file://` OK |
| Dev Vite | `npm i && npm run dev` | http://localhost:5173 |
| Production | `npm run build` → `dist/` | `npm run preview` |

У `dist/`: CSS мінімізований; `js/**` склеєні в `assets/app.js` (глобальний scope);
`@vitejs/plugin-legacy` додає modern/legacy чанки + polyfills (не IE11).
Конфіг: `vite.config.js` (`CLASSIC_SCRIPTS` = порядок як у `index.html`).

## Примітка щодо безпеки

Ключ `sb_publishable_…` у `js/config.js` розрахований на публічне використання, але захист даних забезпечують
**політики RLS у Supabase**. Переконайтеся, що вони увімкнені для таблиць `ports`, `port_facilities`,
`inspections`, `vessels_annual_stats`, `audit_log`, `gisis_import_log`.

# CONTEXT — Port Security Monitor (Наказ № 797)

## Архітектурні інваріанти (не порушувати!)
1. Класичні `<script>` без `type="module"` — має відкриватися напряму через `file://` подвійним кліком.
2. Порядок підключення в `index.html` важливий; спільний стан — у `js/state.js`.
3. У рядках таблиць не використовувати інлайн `onclick` із даними з БД — лише `data-action` + `data-code` через `bindActionDelegation()` у `js/app.js`.
4. Усі користувацькі рядки в HTML екранувати через `esc()`.
5. Локальні дати — через `todayLocal()` (не `toISOString().slice(0,10)`).
6. Друк A4 landscape регулюється виключно через `css/print.css`.
7. Єдине джерело історії ГІСІС — таблиця Supabase `gisis_import_log`.

## Ключові файли
- Чиста логіка та ризики: `js/core/utils.js`, `js/core/domain.js`
- Таблиці/вікна: `js/views/tab-*.js`, `js/views/modals-*.js`
- Excel/PDF: `js/export/excel.js`, `js/export/report.js`
- Автотести: `npm test` (`tests/pure-logic.test.js`) і `tests/run.html`