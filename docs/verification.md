# Проверка — 29 октября 2026

## Автоматически

`node --test tests/model.test.mjs`: 15 успешных тестов. Каталог 8/64; московская дата; составные фильтры; сумма; атомарная запись нескольких мест; пересечения/смежные интервалы; примерная занятость; неверные числа/даты/места; отмена; сохранение/восстановление/истечение; повреждённые записи; недоступное хранилище; бесплатные зоны; предел 250 записей.

Проверка предела сначала воспроизвела ошибку: 251-я запись сохранялась, но не восстанавливалась. После исправления создание и сохранение отклоняют превышение до записи в хранилище. Все 250 записей успешно восстанавливаются.

Синтаксис `app.js`, `model.js`, `scene.js` проверен Node.js. Браузерная консоль: ошибок и предупреждений при штатном использовании нет.

## Первая версия — историческая проверка

Пункты ниже относятся к прежней композиции с условной картой восьми зон. Её главный экран заменён зданием; новый сценарий описан в дополнении.

## В браузере

Проверено в браузере Codex с настоящей WebGL-сценой:

- Выбор аудитории через метку карты и через список; карточка и выделение обновляются.
- Пустой выбор выдаёт ошибку; занятые места 2 и 6 недоступны.
- Два места в 462 на два часа дают 240 ₽; подтверждение создаёт одну запись. После перезагрузки запись сохраняется; отмена освобождает места.
- Длительность 0 выдаёт ошибку. Переключение с 15:00 на 13:00 снимает выбранное место, если оно стало занятым.
- Фильтр тихой работы даёт одинаковые две зоны в списке и на карте; несовпадающий запрос показывает пустой результат. Скрытый выбранный кабинет сбрасывается.
- При включённом «Есть места» бронирование оставшихся шести мест скрывает заполненную 462 и очищает карточку. То же проверено при создании брони в другой вкладке; первая вкладка обновилась по событию storage.
- Переключение 3D → 2D → 3D; выбор в плоской схеме.
- Поиск по справочнику 22 кабинетов; противоречие 400/460 видно пользователю. Архивный план открывается; увеличение 150%; полный лист доступен ссылкой. Усилена читаемость фрагмента, оригинал листа сохранён отдельно.
- Enter на карточке списка выбирает аудиторию; Space на кнопке места выбирает место и обновляет сумму (459: 80 ₽ за два часа).
- Мобильные ширины 390 и 360: горизонтального переполнения нет; форма, сумма, подтверждение и отмена работают. Снимок мобильной формы просмотрен визуально.

Тестовые брони отменены. [Превью](screenshots/desktop.png) показывает 3D-сцену и форму с выбранным местом.

## Границы проверки

Проверены текущий браузер Codex и доменная логика Node.js. Реальные iOS/Android, разные графические драйверы и режим запрета хранения в браузере вручную не проверялись; ошибки хранения покрыты модульным тестом. Потеря контекста WebGL обработана переходом на 2D, принудительный отказ GPU не воспроизводился. Реальное расписание, доступность помещений и современные маршруты в здании неизвестны.

## Обновление: здание и все этажи

`node --test tests/*.test.mjs`: 18/18 успешно (15 модель бронирования + 3 источники и смена этажа). Отсутствующий модуль этажей сначала дал ожидаемый красный тест; после реализации все проверки прошли. Синтаксис app/building/floor-view/floors проверен.

Визуально сверены заголовки архивных листов319–323: этажи1–5, пятый с чердаком; на листах указан2012год. При выборе1/2/3/5 показан соответствующий оригинальный фрагмент и скрыт каталог бронирования.

Браузер: нажатие прямо на фасад открыло четвёртый этаж; Enter на кнопке здания открыл третий. Проверены переходы между всеми пятью этажами, увеличение200%, мобильный150%, возврат к зданию. Контекстное раскрытие плана5 открывает лист5, статичная миниатюра4 открывает лист4 даже после выбора5 (регрессия из независимого ревью исправлена и проверена).

После здания→этаж4→кабинет462 выбраны места1/3, сумма240₽, сохранение/перезагрузка/отмена успешны. На телефоне390px открыты здание и этаж4, увеличение плана, выбор459 клавишей Space на месте даёт80₽. Горизонтальное переполнение страницы отсутствует (scrollWidth=innerWidth=390); внутри увеличенного плана прокрутка намеренная. Консоль ошибок/предупреждений пуста.

Независимый обзор не нашёл других существенных блокирующих дефектов. WebGL fallback не вызывался искусственно; кнопки выбора пяти этажей находятся внеcanvas и обработчики не зависят от успешной загрузки3D.

[Новый главный экран](screenshots/building.png). Публикация сохраняет приватный доступ владельца; полный проход по опубликованному домену без его входа недоступен.

## Обновление: пять 3D-интерьеров

23 теста проходят: прежние 18 и 5 геометрических. Геометрические проверки сначала падали на отсутствующем модуле. Отдельная регрессия диагональных стен воспроизвела пропуск западного скоса; после исправления проходит для всех этажей. Проверяются разные наборы стен, координаты, перевод пикселей в мир, отбраковка повреждённых данных и хеш каждого исходного изображения.

Для каждого этажа просмотрено наложение трассировки на скан: основной контур, три крыла, отдельная вставка первого этажа и крупные помещения пятого. Голубой — контур, красный — извлечённые фрагменты стен, синий — лестничные участки. Возможные мелкие ошибки скана указаны в интерфейсе.

В браузере открыты все пять моделей. Фрагментов стен: 412 / 253 / 264 / 288 / 175; лестничных участков: 6 / 6 / 6 / 6 / 3. Иллюстративных рабочих столов: 24 / 35 / 29 / 30 / 8; это не вместимость и не доступные для брони места. Снимки каждого этажа: `screenshots/floors/`.

Проверены быстрые переходы 1→3→2→4→5→1: заголовок и готовая модель первого этажа совпадают, canvas остаётся один. Также проверены 3D→чертёж→150%→3D, вид сверху, наложение, низкие/высокие стены и масштаб. На ширине 390px нет переполнения страницы; увеличение и перенос стрелками работают. Вычисленный `touch-action:none` устраняет конфликт OrbitControls со скроллом. Физические мультитач-жесты реального телефона не тестировались.

Бронирование в 462 мест 1/3 на два часа создаёт запись 240 ₽, восстанавливается после reload и отменяется. Тестовая запись отменена. Консоль ошибок и предупреждений пуста. Замечания независимого ревью исправлены: восстановлены диагональные стены и устранён конфликт touch-action. Принудительная потеря GPU не воспроизводилась; код переводит просмотр на исходный 2D.

## 2026-10-30 — immersive explorer and free booking

- 36 Node tests pass: local free reservations, legacy totals migrated to0 without lost records, source image hashes, five separate geometries, server D1 unique-slot atomicity, owner isolation, idempotency, email failure/uncertainty, GET cancellation safety, signed token cancellation, invalid payloads, stale availability responses, live availability without demo seeds. Server tests use the actual Drizzle SQL in in-memory SQLite with a D1 adapter.
- TypeScript check `npx tsc --noEmit` passed. Sites production build passed. D1 migration applied to local preview database. No mail provider is configured and no real email was sent.
- Browser QA at1065×924 and390×844: fullscreen building, compact menu and source link, five distinct floor models (walls412/253/264/288/175; furniture24/35/29/30/8), original2D plan, stair labels, source directory22records, no horizontal overflow.
- Free local booking: empty seat selection shows error; selected seat saves with costfree; email preview renders and saysnot sent; cancellation link opens confirmation; confirmed cancellation removes reservation and frees place; another booking survives page reload and can be cancelled in My bookings. Both test records cancelled.
- Independent reviewer identified live filter using demo occupancy and stale response date race. Both corrected with regression tests. No additional material findings.
- Screenshots: docs/screenshots/immersive/building.png and email.png.
- Current modern room coordinates remain unknown after extra official-source/portfolio search. No guessed contemporary labels or bookable room polygons placed on archive geometry. Current wall/stair state is not surveyed.

## 2026-10-30 — camera entry and zoom navigation

- Clicking a building floor now prepares the interior while animating the exterior camera for900ms; after readiness a600ms fade and interior camera settle reveal the floor. No full-screen loading layer is shown during entry. Hover/focus prewarms geometry and renderer.
- Zooming inward past1.85× enters the highlighted floor; the last highlighted level persists when moving to +. Wheel chooses the facade level under the pointer. Returning resets exterior camera and input controls.
- Cancellable RAF motions, prefers-reduced-motion support, latest-navigation guards, Escape cancellation, and a 2D fallback on WebGL loss. Independent review found a pending-load context-loss deadlock; reproduced with the real controller and fixed.
-43 tests pass, including readiness vs flight ordering, stale requests, cancellation, easing, reduced motion, and context loss during preparation.
- Browser: clickentry verified mid-frame with stagevisible and loaderhidden; ready floor4 then returned; plus-button threshold entersfloor4; wheel atfacade entersfloor4; rapid2→5 settles on5; Escape keeps building interactive; mobile390×844 settles on3 withoutoverflow. Physical multitouch not tested.
- Screenshot: docs/screenshots/immersive/entry-motion.png. No booking or source geometry changes.


## 2026-10-30 — walk, spatial indexes and cinematic return

- 54 Node tests pass. New checks cover swept wall collision/sliding, door vs sealed partition, disconnected inset, safe source-floor spawns, clear initial viewing direction, all149 zone polygons and walkable entries, honest model-index semantics, reverse-zoom gating and reduced-motion tour behavior. TypeScript check passes.
- Independent final reviewer checked controller lifecycle and sampled500 route attempts per floor. Fixed post-await departure cancellation race and blur/visibility animation ownership. Reviewer then verified entry/exit cancellation with a runtime harness: no scheduled frames and no late focus; no remaining actionable findings.
- Browser QA1065×924 and390×844: source-floor1/4/5 walk entry, WASD and mobile held-direction movement, minimap route arrives, model→walk→model/scan, floor switch during walk, zone search→selection→focus→entry, tour pause/manual-next/stop, zoom-out returns to exterior. Mobile uses a tall-axis default composition and has no horizontal overflow. Console errors/warnings empty.
- Rendered room labels are decluttered against stair labels and occluded by walls in walk mode. Derived149 zones are13/40/40/40/16 per floor. Source overlay diagnostics retained and inspected; modern room numbers remain unbound. No actual venue availability or modern accessibility is inferred.
- Browser QA uses local preview of the packaged source; private publication is verified by the native deployment result. Physical phone/multitouch, GPU-loss injection and actual email delivery were not tested this turn; no mail service exists. Booking logic was unchanged and its automated regression checks pass.
- Screenshots: docs/screenshots/immersive/spatial-floor.png, walk.png and mobile-floor.png.


## 2026-10-30 — campus gallery design

-56 tests pass. Added pure-layout checks leave source immutable, retain real long partitions, clean short/duplicate fragments, and verify clear crossings through every accepted illustrative portal on allfive floors.125 doors (9/37/32/35/12), cleanup119/78/59/82/53 trace fragments. Original source geometry/image hash tests still pass. TypeScript check passes.
- Renderer and walk collision/minimap share the prepared walls. Source2D is unchanged. Decorative poles/posters/signs ignore ground picking; loaded furniture has obstacle bounds. Gallery owns and disposes its textures/materials/geometry on floor change; optional assets fall back after3500ms.
- Independent review found optional-model stall, rejected candidate doors leaving cuts, and a missing-model display topper without collision. All fixed and re-reviewed; no material findings remain.
- Browser1280×720 and390×844: inspected eye-level floor4 and2, matching door/model labels, colored minimap/stripes, two-sided overhead signs, material/ceiling/poster rendering; keyboard and held mobile direction move player. Allfive floors load with correct zone/door/prop counts, scan of floor5 remains correct, no console warnings/errors.
- Booking new hero/catalog/form render, free local save then cancellation succeeds and releases place; test record cancelled. Booking and about on390px have scrollWidth=clientWidth=390. Modern room coordinates and live booking/email remain unconfigured. No physical phone, real-campus routes or forced GPU loss tested.
- Screenshots: docs/screenshots/gallery/{floor,mobile-walk,booking,building}.png. All decorative content is illustrative, original archive retained separately.


## 2026-10-30 — informative navigator

- 62 Node tests pass; TypeScript check passes. New tests cover eight unique/reachable pilot bindings, preserved source data, all five floors, adjacent stair links, correct floor-step order and collision clearance. Added regression for a thin wall between free grid endpoints.
- Replaced entry UI with a five-floor schematic:149 indexes, same filters/list/map, separate non-spatial real directory, eight free pilot areas, local booking/history/cancel, shared route parameters and textual floor steps. Walking/tours removed from entry points; old booking URL redirects.
- Original scans/JSON retained. Schematic walls derive from zone boundaries with illustrative doors. Floor origins registered by exterior left/bottom edges before matching nearby stair rectangles. These are explicitly conditional routes, not a survey or evacuation plan.
- Browser desktop1065×924/1280×720 and390×844: overview/floor focus, first→fourth and fifth→fourth routes, next step, share parameters/reload, selected/unselected status, quiet+free filters and empty search; modern462 opens a non-spatial card and clears when hidden. Mobile drawer closes and becomes inert; contextual cards leave map space.
- Browser booking: empty selection shows error; seats2/6 disabled at13–15; seat1 saved once, reload restored, history cancel released it. Test record cancelled. Receipt/cancel display uses pilot labels while legacy domain IDs/storage key remain compatible.
- Fresh independent review found graphics-import fallback, route URL restoration and same-floor instruction issues. Fixed all3 and independently rechecked. Browser error/warning log empty. Screenshots in docs/screenshots/navigation/.
- Real mail, physical phone/multitouch, forced GPU-loss and current-campus wayfinding not tested. Pages publication verified separately after push.
