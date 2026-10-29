# Пересборка — концепция для СПбГУПТД

## Purpose and scope
Independent student prototype connecting project intent, reusable material kits and reservable workstations. Pilot proposal for СПбГУПТД, not an official service. Hypothesis: a student can find an appropriate material and workstation faster when starting from what they want to make. Actual demand and availability need interviews with a lab supervisor and students.

## Evidence
- https://sutd.ru/projects/park_htp/ lists garment, leather goods, weaving, printing and artistic material workshops. It does not establish current student access or booking rules.
- https://www.sutd.ru/projects/laboratoriya_virtual/ documents SmartDesign 3D printing and scanning at Voznesensky 44–46. Do not infer availability or tariffs.
- https://prouniver.ru/programs/artistic-processing-materials-m/ describes wood, metal, ceramics and glass equipment.

## Demonstration
Eight conceptual workstations in an illustrative 3D resource hub, not the real university floorplan. Each has illustrative recovered-material kit, hourly demo price, capacity and prepared tasks. Project selector highlights only compatible stations: tote bag / model / print / accessory. Material and maximum hourly budget are synchronized filters. Stations 3 and 6 occupied initially. Book integer 1–12 hours for 1–capacity people, total demo rate × hours; kit included. Reserve whole station until cancellation. All records validated and persisted only locally. Single key peresborka.bookings.v1. Damaged/blocked storage reported. No real booking or university endorsement claimed.

## Design
Evening model with warm pools of light and detailed equipment. Slate/navy shell, off-white body, amber route marking and muted violet identity. Brand ПЕРЕСБОРКА / СТУДЕНЧЕСКАЯ ИНИЦИАТИВА · СПбГУПТД. Hero: «У идеи уже есть материал». Three-step linked chain: project → material → workstation. DOM labels and list provide equivalent keyboard access, selected/occupied text, visible focus, touch controls. Filtered stations visibly marked «Не подходит». WebGL fallback uses 2D scheme; all bookings work without 3D. Reduced motion, responsive layout.

## Handoff
HTML/CSS/vanilla JS, local Three.js, no React/npm build. README covers launch, sources, demo assumptions, prompts and tests. Prototype publication remains private by default; sharing with university requires owner action. Real pilot needs one lab partner, verified inventory, equipment access rules and shared server-side reservations.
