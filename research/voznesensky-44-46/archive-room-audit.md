# Проверка читаемости архивных номеров помещений

Дата проверки: 30.10.2026. Проверка выполнена по фактическим изображениям, без присвоения современных номеров геометрии.

## Результат

Ни один номер помещения не прошёл порог уверенного визуального чтения. Файл `public/data/verified-archive-rooms.json` не создан: пустой результат проверки не должен превращаться в выдуманные номера или ложные соответствия.

На планах различимы стены, перегородки, лестничные марши и расположение текстовых отметок. Однако центральные цифровые отметки слишком размыты, чтобы стабильно отличить номер помещения от площади, а также различить похожие цифры. Наблюдаемая последовательность соседних отметок не использовалась для восстановления нечитаемых номеров.

## Проверенные материалы

| Этаж | Изображение | Размер в пикселях | Страница исходного PDF | Подтверждённых номеров |
|---|---|---|---|---|
| 1 | `public/assets/floor1-archive-plan.webp` | 3476 × 682 | 319 | 0 |
| 2 | `public/assets/floor2-archive-plan.webp` | 3476 × 745 | 320 | 0 |
| 3 | `public/assets/floor3-archive-plan.webp` | 3476 × 745 | 321 | 0 |
| 4 | `public/assets/floor4-archive-plan.webp` | 3476 × 745 | 322 | 0 |
| 5 | `public/assets/floor5-archive-plan.webp` | 3476 × 745 | 323 | 0 |

Все пять изображений просмотрены целиком. Для нижней продольной части каждого плана подготовлены увеличенные фрагменты; подробно просмотрен фрагмент четвёртого этажа. Для проверки ограничения качества страница 322 дополнительно отрендерена непосредственно из `research/voznesensky-44-46/sources/heritage-2023.pdf` с шириной 9000 пикселей и просмотрена отдельным фрагментом. Увеличение показывает тот же размытый исходный скан и не восстанавливает недостающую информацию. Это ограничение источника, а не размера отображения WebP.

Источник: приложение №10 к опубликованной копии историко-культурной экспертизы от 26.10.2023, планы технического учёта, заверенные в 2012 году. Ссылка, сохранённая в исследовании: https://saintcapybaras.com/Home/GetStateExamination/11435?page=102 . Сетевой поиск в этой ограниченной проверке не выполнялся; использована уже сохранённая локальная копия PDF.

## Ограничения для интерфейса

- Современные номера 452, 459, 462, 466 и 484 подтверждены отдельными образовательными документами, но их координаты на этих чертежах не установлены.
- Ни номер этажа, ни порядок помещений вдоль коридора не доказывает соответствие современным аудиториям.
- При пространственной разметке можно использовать нейтральные подписи «Помещение» или «Архивная зона» с внутренними техническими идентификаторами; такие идентификаторы нельзя оформлять как номер БТИ или номер аудитории.
- Координаты и полигоны **пронумерованных** помещений не публикуются, поскольку без уверенно прочитанного номера они создавали бы ложное основание для навигации.
- Для точных подписей нужен более качественный план либо подтверждённая ведомость экспликации с читаемыми номерами и привязкой к контурам.

## Derived model-space layer, 30.10.2026

Created `public/data/floor-spaces.json`: 13 / 40 / 40 / 40 / 16 zones on floors 1–5 (149 total). Labels such as `П4.01` are model indices; every `modernNumber` is null. This is a partial interactive spatial layer, not a verified room registry.

Method: rasterize existing source walls and footprint, extend wall ends by 10px on each side to close illustrative door gaps, reinforce long horizontal and vertical ink strokes from the original WebP, then extract enclosed connected free-space components. Reject tiny fragments, elongated components, huge merged components, stair overlaps, holes and polygons leaving the footprint. Place each label inside its component using distance from its boundary. Select a limited group of larger regions and order them deterministically by spatial rows.

All five diagnostic overlays in `traces/spaces-floor1.png` through `spaces-floor5.png` were visually inspected. Several evident corridor and ambiguous merged utility regions were excluded manually. Reproduction script: `traces/derive-spaces.py`, using bundled Python, NumPy, OpenCV and Pillow.

Limitations: the blurred scan and partial wall tracing can omit partitions, so these zones are not guaranteed to correspond one-to-one with physical rooms. Closing door gaps supports segmentation and does not model accessibility. First-floor coverage is deliberately sparse because complex open areas do not yield confident enclosed components; large fifth-floor attic areas are excluded. Use this layer to select and inspect model areas. Do not infer BTI IDs, modern classroom numbers, room function or navigable routes from it.
