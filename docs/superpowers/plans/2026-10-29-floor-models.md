# Five Interior Models Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.
**Goal:** Five distinct plan-derived3D interior models, one for each archived floor.
**Architecture:** Offline trace generator emits checked pixel-coordinate wall/footprint data; browser scene converts to world coordinates and renders instanced segments. Existing floor controller manages3D/2D with a loading revision guard. Booking domain unchanged.
**Tech Stack:** Python/OpenCV for source preparation only, vanillaJS, vendoredThree.js.
**Spec:** docs/superpowers/specs/2026-10-29-floor-models.md

## Global Constraints
- Preserve original scans, booking key/records and privateSite identity.
- Different source topology for each of5floors. No invented modern room coordinates/routes.
- Disclose archive2012 and approximate heights/furnishing; maintain2D fallback.

## Review Focus
- Async floor switching must never display a previously loaded model as the newfloor.
- Hidden containers must not corrupt camera/frustum.
- Failure to loadWebGL/data/texture returns to usable source2D.
- Renderer/resource reuse and disposal must bound memory across repeatedfloorchanges.
- Wall trace must exclude sheet frames and text; check overlay images for eachfloor.

### Task1: Trace data
- [ ] Inspect source crop for all5floors and fix clipped bounds; create reproducible offline generator.
- [ ] Produce footprint/structural segment/stair data and diagnostic overlays. Visually compare everyfloor; remove annotations and duplicate strokes.
- [ ] Tests: five different fingerprints, valid endpoints/thickness/footprints, points stay in sourcebounds; pixel→world mapping matches imageaspect and orientation.
### Task2: 3D scene/controller
- [ ] Instanced walls with caps, sourcealigned flooring, warm lighting, stairs and restrained illustrative details. Orbit/pan/zoom/topview/reset/lowwalls/sourceoverlay.
- [ ] Default3D inside eachfloor; toggle2D, loadrevisionguard, fallback; keepfloor4bookingandoriginalsource links.
### Task3: Verification/delivery
- [ ] Domain/geometrytests andsyntax; browser all5models,topview/overlay, switching,2D, mobile, bookingregression.
- [ ] Fresh reviewer; fix substantivefindings. UpdateREADME/verification andpublish exactsource.
