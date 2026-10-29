# Внутри — навигатор СПбГУПТД и учебная запись

User steering: real Вознесенский 44–46, first developed floor 4, with booking individual self-study seats. Finish autonomously.

## Scope
Static HTML/CSS/vanilla JS and local Three.js. No real schedule, payment, registration or server. Eight areas: five real documented floor-4 rooms (452,459,462,466,484), plus three clearly proposed unnumbered self-study zones (quiet room, team space, reading lounge). Eight demonstration seats per area; 64 selectable seats. Real classroom computer counts are contextual evidence, not demo capacity or verified permission to use. Campus floor geometry initially conceptual; replace with historical plan only if found and verified, preserving its date and uncertainty. No real directions based on conceptual geometry. Searchable directory of all 22 researched addresses with evidence and sources.

## Booking
Date today (Europe/Moscow) through +14 days; time 09:00–20:00; integer duration 1–4 hours, end <=21:00. Multi-seat selection from 8 buttons, 1–8 available seats. Show seat count × hours × explicitly invented demo hourly tariff; real university price not claimed. Confirm creates one atomic record containing room/seat IDs/date/start/hours/total. Prevent duplicates/overlaps, including initial demo reservations. Same seat may be booked in nonoverlapping time windows. Cancel frees only own reservation. Persist schema-versioned valid records under one localStorage key; corrupted storage blocks mutation until explicit reset; failed storage leaves UI state unchanged. Revalidate against stored latest state before commit, handle cross-tab updates.

## UI/design
Brand «внутри. / ПРОМТЕХДИЗАЙН», independent student prototype. Ivory paper with navy scene, muted lavender and amber, condensed Cyrillic display and neutral body. 3D model is interactive centerpiece with warm lighting and furnished rooms. Floor selector starts at4; other floors explain pending data, never fabricate plans. Filters: category, maximum demo rate, optional availability; map/list show same set and selection clears when hidden. Right panel detail → labeled seat plan → date/start/hours → live price → confirmation. My bookings dialog, cancel confirmation, reset confirmation, success state, readable errors and empty states. Keyboard list equals map; visible focus; reduced motion; 2D fallback; responsive >=360px.

## Acceptance
Domain tests: numeric and date bounds, overlap/adjacency, unavailable seeds, atomic multiseat, duplicates, persistence schema/corruption/denial. Browser verify map/list selection/filter synchronization, seat selection, total, create/double submit, refresh, cancellation, date/time changes, modal keyboard/mobile/no horizontal overflow. README with real sources/assumptions/run/test/prompts; Sites exact pushed state published privately if available.
