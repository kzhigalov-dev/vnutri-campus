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
- Real mail, physical phone/multitouch, forced GPU-loss and current-campus wayfinding not tested. Pages workflow41031511704 succeeded for5758e51. Published navigator.js matches local bytes. Public browser verified route1→4, save→reload→receipt with pilot label→cancel via explicit button→empty history and old bookingURL redirect; test record cancelled.


## 2026-10-30 — creative atlas and estimated directory placements

- New light architectural model: lilac canvas, five coloured slab edges, solid pale plates, low dark walls, coral work areas, larger floor signs and quieter white controls. Source geometry/booking domain unchanged. Supporting pages share the palette.
-22 directory records placed on unique accessible floor4 polygons in a separate adapter. All positions explicitly author-proposed with≈, including documented-floor records. Unconfirmed floors, historical/conflicting assignments, original model indexes and sources remain disclosed. No current numbered plan was found for Voznesensky, Morskaya18 orSadovaya54. Official Morskaya terminal is the strongest next source; alternate campuses are researched, not falsely modeled.
-65 tests and tsc pass. New tests prove source immutability,22 unique reachable placements, approximate display semantics, historic/conflict retention, repeated annotation safety and legacy pilot alias compatibility.
- Browser1280×720 and390×844: source directory462→map, search462→card≈462→crossfloor route, conflict400evidence, maplabel→selectedlist, combinedquiet/freefilters, hidden selection cleared, mobile save/reload/cancel, receipt/history alias retainsΠ4.08 alongside≈462, quick seat button focuses selection. Test record cancelled; no console errors/warnings.
- Independent builder and final code reviews complete; no material findings. Screenshots docs/screenshots/creative-atlas/. No real-campus survey, physical phone/multitouch, real email or new GPU-loss injection. Published381a70c through successful Pages run41034886989. Public navigator/placements/CSS byte-match local. Public search462, route1→4, booking→reload→history/receipt approximate alias→explicit cancel→empty history verified; test record cancelled.

## 2026-10-30 — interface refinement and direct map interaction

- User references: Apple Maps and Philippe Starck. Also researched Mappedin wayfinding/dynamic focus, Concept3D 360 maps, NASA Eyes, Mapbox storytelling and Bruno Simon. Applied camera continuity, lightweight sculptural materials, contextual feedback and opt-in path playback; no external assets or SDK dependencies added. Scope/links: docs/plans/2026-10-30-map-interaction.md.
- Compact interface uses Manrope, consistent authored SVG controls, collapsed time settings with explicit edit from room card, Cmd/Ctrl+K search, evidence disclosure preserving open state, and numbered seats with visible free/selected/busy text. Mobile drawer remains inert when closed, map controls stay above the contextual sheet.
- Map adds room relief, selection edges, hover/keyboard-focus preview, explicit stair labels, 2D plan/3D switch, quarter-turn rotation and zoom-out return to the full building. Camera approach fades other floors in place; newest navigation wins and manual/visibility interruptions release controls. Rendering is event-driven except during requested camera/path animation.
- Route preview preserves every original route waypoint and stair transition. Includes play/pause/replay, keyboard-operable range, current floor/stair/progress output and current-floor step styling. It is explicitly a demonstration, not geolocation. Reduced motion changes playback to discrete manual progress. Source geometry, room bindings and booking storage/domain unchanged.
-69 Node tests and TypeScript check pass. Four new preview checks cover ascending/descending/singleton/empty paths and collision clearance of actual1→4,5→4 and4→4 routes. Browser first-load null preview defect fixed and covered. Static asset version parameters avoid stale JS/CSS after publication.
- Browser1280×800/1440×900 and390×844: overview, plan/3D, focus preview, rapid1→5, zoom-out→all, route play/pause/scrub to destination, mobile time-edit→focused date, search shortcut and no horizontal overflow. Seat1 saved, restored after reload and explicitly cancelled; history empty afterwards. Final inspection produced no new console errors; earlier development errors retained in test-tab history are from the fixed null preview defect. Screenshots docs/screenshots/map-interactions/.
- Impeccable detector run once. Increased functional sidebar/card text and removed thick floor-sign accent. Close buttons misidentified as decorative icon stacks are necessary controls; occupancy stripes encode disabled/busy state. Small spatial labels/legend/footer retain the user's explicit minimal-chrome preference; complete room information remains in the list/card. No physical multitouch, GPU-loss injection or OS reduced-motion browser emulation this turn. Existing reduced-motion controller tests pass. Real-campus positions and paths remain approximate and labelled; no mail service configured.
- Published5c9f67b through successful Pages run41040356126. HTTP content of index/CSS/controller/scene/preview matches local files. Public browser verified play→pause→keyboard seek50% (stair2→3), closing selection clears list state, clean overview and empty error/warning log. Published screenshot: .superpowers/map-interactions/published.png (local proof, ignored).

## 2026-11-06 — facade and panel-based floors 2–4

- Added user-supplied floor2 panel (55 zones), saved original/full/detail sources for2/3/4. Corrected central groups340–345/382–385 and placement of pilot448 within the authored445–448group. Aggregated rooms remain groups where photo lacks internal detail.
- Removed synthetic west towers/stalks used for old archive registration. Panel floors retain the three transverse wings and five numbered stairs1–5. Archive↔panel connections require explicit illustrative metadata; panel↔panel pairs use numbered cores. Remote floor2 rooms route via3, ending at stair1 or2 as the signs specify.
- New photo-informed exterior uses official university gallery and Commons reference photos, with default street/main-entrance camera. Four visible street tiers plus recessed upper volume are illustrative height registration. No reference photographs embedded as textures.
- Floor models use source-defined walls without duplicate rectangular room walls; open doors/jambs and atlas-based room numbers appear at thresholds. Old exterior generator removed. Camera framing and compact floor headings keep the model visible;1280px header overlap corrected.
- Independent review found two unreachable grouped zones; adjusted interior door search for large rooms and added all-panel-zones-to-stairs regression. Corrected duplicate room click handler and repeated-floor preview/next-step indexing. Route steps name the signed staircase.
- Final full suite81/81 passes; TypeScript, JS syntax and diff checks pass. Browser1440×900 and1280×720: main-entry exterior, floors2/3/4, search462→seat3→save→cancel, route201→265–269 with step sequence2→3→2 and only finalstep current after End. Console errors/warnings empty. No EmailJS message was sent. Source panels are schematic, exact dimensions/hidden subdivisions and archive registration remain unverified. Proof: docs/screenshots/corpus-update/.

## 2026-11-06 — interface refinement

- Preserved the mineral-blue/Golos identity while removing the hero backdrop, repeated address chrome and duplicated visible contact actions. Grid header, paper search, native project popover, compact floor rail and consistent contextual controls prioritize the model.
- Refined source directory, feedback, receipt and cancellation styling. Sources use one reading surface; feedback uses a continuous form. Local mail SDK avoids external CDN dependency for the main page; contact initialization is guarded and opens one contextual panel.
- Drafts are retained when the sending service is unavailable, button labels survive retry, and success no longer promises an unconfigured copy email. No mail was sent during QA.
- Two batched visual checks at1440×900,1280×720 and390×844. Fixed search remaining in contact mode, mobile canvas width collapsing beneath a more-specific desktop selector, and a responsive layout change cancelling room focus. Form fields/seat selection, closed native popover, empty-submit validation, source directory and scrollable feedback verified. Mobile viewport has no horizontal overflow. Desktop remains the primary visual target.
-81 tests and TypeScript pass; final JS syntax/diff checks pass. Model resize guard changes only whether an in-progress camera request survives layout resize. Captures: docs/screenshots/interface-refinement/. Design tokens and component guidance recorded in DESIGN.md and .impeccable/design.json.
- Published183f037 via successful GitHub Pages run42184516302. Public index, CSS, controller, scene, contact code and supporting pages byte-match local files. Public native-menu→contact→search462 verified, clean empty warning/error log, overview restored. Published capture: docs/screenshots/interface-refinement/published.jpg.

## 2026-11-06 — unified presentation of all floors

- User confirmed both camera alignment and model detail. Building, individual floors and exploded overview now share the entrance-side camera direction. Archive floors1/5 rotate180degrees in presentation to match the panel orientation; room labels, ordinary-room focus, route tubes and preview use the same adapter. Original source data is unchanged.
- Added a shared instanced cutaway perimeter on every retained footprint/inset: window frames, mullions, translucent glazing, sill and upper trim. Window spacing/heights are authored and do not assert measured elevations. Materials remain shared with the building; low internal walls preserve room visibility.
- Regular workrooms on floors2–5 gain desks/chairs and floor-specific authored material, drawing, computer or project equipment. Existing floor1 gallery/reception and all pilot-seat identities preserved. Envelope instances are explicitly disposed.
-82 tests, TypeScript, JS syntax and diff checks pass. New check covers non-mirrored archive rotation; route endpoint/immutability check uses actual reversed display adapter. Browser1440×900 inspected allfivefloors and building, route1→4 seekEnd reaches target, warning/error log empty. Captures docs/screenshots/unified-floors/.
- Published1764092 via successful Pages run42186696264. Public scene, envelope, layout, furniture, controller and entry byte-match local. Public fourth-floor view verified with empty error/warning log; proof docs/screenshots/unified-floors/published.jpg.

## 2026-11-06 — building floor preview and entrance-stair routing

- Building ray picking now previews the exact facade/roof floor: other shell levels fade, the selected floor's interior appears at the corresponding assembled height, and a tooltip names the floor. Click retains the existing smooth floor transition. Pointer leave/drag/navigation clears the preview and restores shell/level positions. Floor buttons expose the same preview on keyboard focus.
- Fixed first-floor start: explicit mainEntrance metadata selects the central entrance landing, labels it and highlights its steps. Pinned archive→panel registration connects it to stair3 on floor2, before any nearest-core matching. Default start-1 routes must depart via that landing; manually chosen room origins are preserved. Generator retains this metadata.
-83 tests and TypeScript pass; syntax/diff checks pass. Regression checks the start point and first stair connection of every available default route to floors2–5. Existing signed2→3→2 routes and no-implicit-registration checks pass.
- Browser1440×900: native pointer movement onto facade selected3 then2; click opened2. Keyboard focus preview3 and blur restore verified. Main-stair→462 route labels/first-floor landmark and first instruction verified. No warning/error logs. Proof docs/screenshots/floor-hover/.
- Publishede128ad7 via successful Pages run42188691463. Public entry, geometry/mainEntrance metadata, router, exterior, scene and controller byte-match local. Native pointer on public facade previewedfloor3; normal search462→route starts at the main entrance stair and first instruction uses that stair. Public log has no errors/warnings. Proof docs/screenshots/floor-hover/published.jpg.
