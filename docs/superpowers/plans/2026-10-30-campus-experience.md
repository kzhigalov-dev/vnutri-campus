# Campus Experience Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. User explicitly requests autonomous planning and implementation.

**Goal:** Make the campus model explorable at building, floor and eye level with readable spatial annotations and cinematic navigation.
**Architecture:** Retain vanillaJS/Three.js and existing Sites server. Add pure collision/routing, bounded walk controller and spatial-layer UI; reuse one renderer with orthographic and perspective cameras. Existing booking untouched.
**Tech Stack:** VanillaJS, Three.js0.180, source-aligned JSON, Node tests, Sites Vinext.
**Spec:** docs/superpowers/specs/2026-10-30-campus-experience-design.md

## Global Constraints
Fullscreen model and compact chrome. No fabricated modern room IDs or booking-map bindings. Archive-derived, not current survey. Preserve Site ID, audience and free bookings. No new runtime libraries. Respect reduced motion and keyboard/mobile input.

## Review Focus
Wall tunnelling on long frames; disconnected floor inset cannot route to main footprint; late animation/RAF cannot reopen hidden floor; motion modes cannot compete for camera/input; synthetic indexes must never look like verified current room numbers.

### Task1 — Walk geometry
Files: public/js/walk-navigation.js; tests/walk-navigation.test.mjs.
Consumes floor geometry and world-space furniture rectangles. Produces createWalkMap(f,{obstacles,step,radius}) with valid(point), move(from,delta), nearest(point), route(from,to), spawn().
- [x] Write tests: inside/outside, thick segment collisions, sliding vs long-step tunnelling, door route, sealed partition and disconnected inset, safe spawn on allfive actualfloors.
- [x] Run red, implement bounded spatial buckets/grid routing and run green.

### Task2 — First-person controller
Files: public/js/floor-walk.js; floor-scene.js; floor-interior.js; index.html; experience.css.
Consumes map and overview camera; produces start(point), stop(), active camera, input and minimap state. Geometry remains source-aligned.
- [x] Add perspective entry/exit, drag look, keyboard/mobile movement, click path + marker, live minimap.
- [x] Stop all input/frame state on blur, hidden document, mode switch, floor switch and disposal. Preserve overview controls after walk.
- [x] Browser: enterwalk, move, hitwall, clickpath, minimap, exit; verify mobile overflow.

### Task3 — Spatial interaction and visual polish
Files: public/data/floor-spaces.json; public/js/floor-spaces.js; index.html; experience.css.
Consumes derived polygons with modernNumber:null. Produces clickable labels, amber highlight, focus/walk callback, compact searchable list/card.
- [x] Inspect derived polygons on allfive source images. Labels state model-index semantics; no unsupported BTI/current IDs.
- [x] Add label declutter and selection/focus, readable small card, source and directory links. Keep home chrome quiet.
- [x] Verify label/list selection and walk-entry agree with source coordinates.

### Task4 — Camera tours and reverse transition
Files: floor-scene.js; building.js; floor-view.js; floor-interior.js; navigation-motion.js; tests/navigation-motion.test.mjs.
- [x] User-started curated orbit flights, pause/prev/next/stop; manual interaction interrupts. Reduced motion manual stops.
- [x] Animated pullback from floor to exterior by back and overview zoom threshold. Preserve cancellation/latest request and fallback paths.
- [x] Test state/races, then browser back/zoom-out, quick navigation, modes and mobile.

### Task5 — Verify and publish
- [x] npm test, tsc and Sites build; fresh independent review of implemented flow; resolve material findings.
- [x] Browser finaldesktop/mobile, save screenshots. Update README/research/verification.
- [x] Package exact source/build and publish same owner-private Site; report URL and remaining evidence limits.
