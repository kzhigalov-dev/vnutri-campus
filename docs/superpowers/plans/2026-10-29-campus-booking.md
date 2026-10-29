# Campus Booking Implementation Plan

> Execute inline using executing-plans. User authorized autonomous completion.

Goal: working polished 3D campus floor concept plus fully tested seat booking.
Architecture: catalog and pure domain module consumed by DOM UI and Three.js scene. Static dist output, no build.
Spec: docs/superpowers/specs/2026-10-29-campus-booking.md.

- [ ] 1. Finalize evidence and layout status. Keep real room evidence separate from proposed zones and demo prices. Files dist/js/data.js, dist/data/directory.json.
- [ ] 2. Write failing domain tests for filtering, strict date/time validation, atomic multi-seat overlaps, cancellation, corrupted/blocked storage; then implement dist/js/model.js and get tests green.
- [ ] 3. Complete semantic index.html, styles.css, app.js. Wire all filters, list, details, 8-seat plan, booking form, dialogs, state announcements and persistence.
- [ ] 4. Build detailed Three.js interior, labels, raycast, keyboard camera controls, projected room selection, floor-stack overview, fallback and reduced motion. Files scene.js and existing vendor.
- [ ] 5. Run domain and syntax checks, browser desktop/mobile full booking scenarios, inspect screenshots and refine.
- [ ] 6. README, verification record, source commit/package and Sites deployment. Explicitly report layout and real access limitations.

Review focus: dates in Moscow and midnight rollover; adjacent intervals versus overlapping; storage errors/other-tab changes; hidden selected rooms and occupied selected seats; touch/WebGL failure/keyboard parity. Every mutation must leave visible and persisted state consistent.
