# Immersive campus booking Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; user explicitly requested autonomous completion.

**Goal:** Give architecture the full screen and provide free booking with prepared email delivery.
**Architecture:** Vanilla public frontend plus supported Sites Vinext API/D1 backend; no mail configured means explicit local demonstration.
**Tech Stack:** Three.js, vanilla JS, Vinext, D1, Resend REST.
**Spec:** docs/superpowers/specs/2026-10-29-immersive-booking-design.md

## Global Constraints
Preserve Site ID and audience. Never guess modern room positions. No paid booking. No secrets in browser/source. Do not claim delivery when unconfigured.

## Review Focus
Legacy paid records migrate to zero; mail uncertainty cannot silently confirm; GET links never cancel; unknown room binding never highlights; mobile chrome stays compact and accessible.

### Task 1: Free local model and server-ready storage
Files: public/js/data.js, model.js; tests/model.test.mjs; starter configs, db/schema.ts; server/booking-service.js, email.js; tests/server.test.mjs.
Consumes existing room catalog and date/seat validation. Produces free createBooking and service handleBookingRequest(Request,env), email renderBookingEmail(booking,options).
- [x] Add failing zero-total and legacy migration assertions; run tests and observe failures.
- [x] Port assets to public and supplied starter into checkout, install dependencies; update test/source paths.
- [x] Implement zero totals and version2 legacy migration; run all tests.
- [x] Add service tests for missing config, authentication, overlaps, ownership, scanner-safe cancellation and mail failure; run red.
- [x] Implement D1 slot locks, service and email renderer; generate/inspect schema migration, run green.
- [x] Commit task.

### Task 2: Fullscreen explorer and dedicated booking
Files: public/index.html, booking.html, about.html, cancel.html, styles.css, js/explorer.js, app.js, floor-scene.js, booking-client.js, email-preview.js.
Consumes free model and backend config. Produces home explorer, standalone free booking, email preview and cancellation flow.
- [x] Build compact menu, fullscreen model and floor chrome, preserve source scan and original geometry. Labels only source-bound.
- [x] Move catalog to booking page, add status explaining mail configuration; wire real API only when configured; explicit demo preview and cancel link.
- [x] Browser verify desktop/mobile floors, booking, reload, preview and cancellation; correct observed failures.
- [x] Commit task.

### Task 3: Verification and publication
- [x] Run node --test tests/*.test.mjs and Sites build helper, inspect output.
- [x] Fresh independent review, resolve material findings and rerun relevant checks.
- [ ] Package/push exact source with Sites helper, publish same owner-private Site and inspect terminal status.
- [ ] Record evidence and limitations; deliver URL and no-mail/current-plan limitations.

Execution ruling: source migration and frontend/API share imports; implemented inline in one working tree and will be committed atomically by Sites source helper. Mail delivery cannot be enabled without external configuration, and current room mapping remains unverified; both explicitly disclosed.
