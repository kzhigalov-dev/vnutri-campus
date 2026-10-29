# Night Shift Implementation Plan

> **For agentic workers:** Use executing-plans to implement inline. User authorized autonomous completion.

**Goal:** Finish a detailed, beautiful interactive depot map and robust local booking demo.
**Architecture:** Shared catalog + pure booking/filter/storage functions; DOM controller and Three.js view consume one state. Static buildless dist directory.
**Tech Stack:** HTML, CSS, vanilla ES modules, pinned local Three.js.
**Spec:** docs/superpowers/specs/2026-10-16-night-shift-design.md

## Global Constraints
- Eight workshops, two initially occupied. Two synchronized filters.
- Integer hours 1–12, guests 1–capacity; total = hourly rate × hours.
- One persisted record per workshop. Cancel frees it. No server/payments.
- Russian UI, keyboard/mobile support, visible exact demo disclosure.

## Review Focus
- Invalid numeric inputs and double confirmation create no bad/duplicate records.
- Malformed/blocked storage cannot crash or falsely claim persistence.
- Filtering selected workshop clears selection in both views.
- WebGL unavailable: semantic map/list still usable.
- Mobile: no page overflow, touch targets and working booking flow.

### Task 1: Domain and persistence
Files: dist/js/data.js, dist/js/model.js, tests/model.test.mjs.
- [ ] Write node:test coverage for validation, filters, create/cancel, duplicate guard, corrupted and blocked storage.
- [ ] Run tests RED before module exists.
- [ ] Implement createBooking, cancelBooking, filterWorkshops, loadBookings, saveBookings.
- [ ] Run tests GREEN.

### Task 2: Complete interface
Files: dist/index.html, dist/styles.css, dist/js/app.js.
- [ ] Build Russian layout, filters/list/detail/booking dialog, saved bookings and reset.
- [ ] Integrate single state with strict validation and storage failure reporting.
- [ ] Start local static preview and verify DOM actions.

### Task 3: Depot scene
Files: dist/js/scene.js, dist/vendor/*.js.
- [ ] Vendor pinned Three.js and OrbitControls with license.
- [ ] Model building, 8 furnished rooms, tracks, tram cafe and lighting.
- [ ] Add raycast selection, DOM labels, camera controls, shared selection/filter updates.
- [ ] Add 2D fallback and reduced-motion handling.

### Task 4: Verification and delivery
Files: README.md, docs/verification.md, .openai/hosting.json.
- [ ] Browser: selection from map/list, invalid values, price, double click, refresh/cancel, filters, empty state, mobile.
- [ ] Inspect screenshots; refine visual issues.
- [ ] Run model tests and syntax checks; complete README with prompts and constraints.
- [ ] Publish exact checked source through Sites and hand off URL + repository files. Record any access limitations honestly.

## 2026-10-23 user steering — supersedes fictional depot subject
Implement «Пересборка» for СПбГУПТД using docs/superpowers/specs/2026-10-23-peresborka-design.md. Keep static architecture and tested booking logic. Replace fictional depot copy/catalog with explicitly illustrative university resource hub. Add project compatibility and material filters, recovered-material kits, evidence section and independent prototype disclosure. Keep 8 reservable stations, integer hours/guests, persistence and cancellation. No institution access or availability claimed. Current Site identity retained.
