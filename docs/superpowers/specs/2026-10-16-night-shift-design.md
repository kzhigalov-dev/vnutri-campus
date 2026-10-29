# Ночная смена
Учебный сайт аренды восьми мастерских в старом трамвайном депо. Вечерняя изометрическая сцена со снятой крышей, тёплым внутренним светом, различимым оборудованием, рельсами и вагоном-кафе. Сцена — главный экран сервиса, а не фоновая иллюстрация.

HTML/CSS, vanilla JS ES modules, vendored Three.js; no production npm/build/server dependency. Static files in dist. Price × integer hours (1–12), people 1–capacity; workshop reserved entirely until cancelled. Two initially occupied workshops. Filters: discipline and maximum hourly price, optional free-only toggle. Map and accessible list use same data. Selection hidden by filters clears with announcement. Confirm exactly once, persist validated records using a single localStorage key, cancel releases workshop. Invalid/corrupted/blocked storage must not crash app; failed persistence must not claim saved booking. Reset asks confirmation. Demo disclosure exact text from assignment.

Desktop: editorial header, expansive 3D map beside booking detail, compact full-width workshop list. Mobile: map then booking then list. Visible focus, keyboard list and camera controls, reduced motion. WebGL failure leaves 2D scheme plus fully functional list and form.

Palette: midnight #10171d, steel #27363f, paper #ede9df, orange #f5a45d, sage #a9bbaa. Typography: condensed industrial display with Russian support, neutral body, monospace utility. Identity: tram-route logo and floorplan numbering, evening depot model. No real payments, accounts, or external data services.
