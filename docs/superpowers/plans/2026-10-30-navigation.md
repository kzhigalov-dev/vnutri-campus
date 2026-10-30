# Informative Navigator Implementation Plan
> Use superpowers:executing-plans inline; user approved concept and has previously delegated autonomous implementation.
**Goal:** map-first five-floor navigation + eight pilot reservation areas with route/search/map-list consistency.
**Architecture:** new public index navigator, pure pilot adapter and cross-floor graph, focused Three scene and UI controller using existing booking domain. Retain source/archive, directory and email/cancel pages. Retire walk entry points and redirect old booking links.
**Tech:** Vanilla JS, Three0.180 local vendor, Node tests, Github Pages.
**Spec:** docs/superpowers/specs/2026-10-30-navigation-design.md
## Constraints
No modern-number guesses; explicit illustrative pilot placement/routes; no invented stair links beyond match tolerance. Same storage IDs/key and free pricing. No full storage clearing. Keyboard/mobile/reduced motion. Github auto publication only.
## Review focus
Unreachable or disconnected points cannot receive a false route. Stairs match adjacentfloors only and preserve free segments. Filters/list/map/selection exactly agree. Concurrent tabs/double-submit cannot double-book. GPU/asset failure leaves usable list/form/text route.
## Tasks
- [x] Pure pilot adapter + campus graph: RED tests for8 unique bindings, safe points, cross-floor route throughstairs, each path segment clearance, detached space/no-route, immutable sources. Implement and run green.
- [x] Navigator Three scene: low walls/zone planes/labels/stackedfloor view, ray and keyboard selection, amber paths/verticallinks, smoothfocus, reducedmotion, context fallback/disposal.
- [x] Navigator HTML/CSS/controller: search and shared filters, room and non-spatial directory results, room details, start/destination route, text steps/floor focus, shareablelinks.
- [x] Local booking card/history: original validation/persistence/locks, slots/seats/status, save/cancel/reload/map availability, display adapter for receipt/cancel, old booking redirect. Tests for selection/atomic requests where needed.
- [x] Real browser desktop/mobile route/map/filter/booking/restore/cancel;56+ tests/tsc, fresh final review/fixes; README and evidence; commit/push, Pages success/live HTTP check.

## Verification and design ruling
Original traced partitions have54–86 disconnected components; use a separately disclosed schematic derived from zone polygons, not fake straight routes across walls. Match stairs after left/bottom scan registration. All62 tests and TypeScript pass. Browser desktop and390×844 booking/cancel/search/filters/multifloor-route restoration checked; fresh reviewer confirmed all3 findings fixed. Publication pending the existing Pages workflow in this execution.
