# Building-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Put the building first and open real archived plans for all five floors with contextual study booking.
**Architecture:** Dedicated building scene module, floor metadata module, existing booking model preserved. DOM controls select floors; actual scanned floor plans pan/zoom independently; booking UI available floor4.
**Tech Stack:** Buildless HTML/CSS/vanilla JavaScript, vendored Three.js.
**Spec:** docs/superpowers/specs/2026-10-29-building-first.md

## Global Constraints
- Preserve all local booking data/key/validation and existing Site ID/audience.
- No invented current room coordinates or routes; archive2012 and illustrative exterior identified visibly.
- Hover is supplemental; click/keyboard/touch do same floor selection.

## Review Focus
- floor switches must clear stale room/seat/success selection, never saved bookings.
- no floor4 room booking shown as if available on other floors.
- 2D fallback remains functional without WebGL.
- zoom bounds and pointer capture must not trap mobile scroll.
- tabs/local storage must preserve room/floor consistency.

### Task1: Evidence and floor state
- [ ] Render pages319–323, verify floor titles, crop drawing while retaining original sheets.
- [ ] Add floor catalog with number/source/page/plan/sheet and validated floor selection helper.
- [ ] Add tests for five floors, page mapping, floor switch invalid/cleared selection and onlyfloor4 rooms.

### Task2: Building and floor explorer
- [ ] Add footprint-based five-level Three.js massing with lit windows, floor picking/hover, HTML keyboard labels and no fake interior rooms.
- [ ] Replace hero/old map with building-centered stage and contextual floor panel; implement plan zoom/pan/reset, floor navigation and clear disclosure.
- [ ] Integrate booking existing interface below floor4 plan; preserve filters/map-list semantics via directory mode, hide booking on other floors; expose clear back-to-building control.

### Task3: Verify and deliver
- [ ] Run model/floor tests, syntax checks; browser building→floor1–5→plan zoom→floor4→booking→reload→cancel plus keyboard/mobile.
- [ ] Final fresh reviewer; fix meaningful findings. Update README/evidence, publish exact tested source to existing private Site.
