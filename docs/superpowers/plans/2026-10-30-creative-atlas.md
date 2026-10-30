# Creative campus atlas implementation plan
> Execute inline with superpowers:executing-plans; user delegated creative decisions and inferred placements. Fresh final reviewer after implementation.
**Goal:** expressive map-first design with clearly estimated placement of22 directory records.
**Architecture:** separate room-placements adapter enriches existing runtime graph and pilot display; preserve domain/source data. Rework Three materials/slabs/labels and navigatorCSS, small supporting-page stylesheet.
**Tech:** existing vanillaJS/Three/local fonts, Node tests, Pages.
- [x] Research official alternate-campus sources and record findings/limits in research/creative-atlas-sources-2026-10-30.md.
- [x] RED tests for placement adapter and pilot search/compatibility; implement22 unique safe illustrative placements. Integrate search/results/card/source/route labels and remove duplicate nonspatial results. GREEN targeted tests.
- [x] Rework geometry presentation/colors/floor labels and complete navigatorCSS composition plus supporting pages. Preserve route-world coordinate consistency, disposal, animation and accessible controls.
- [x] Browser desktop/mobile QA real-number approximate labels/search/filter/route and demo booking cycle. Full tests/tsc; independent review/fixes; screenshots.
- [x] Commit/push normal on existing branch, verify Pages and production path, update docs.

## Results
65 tests and tsc pass. Fresh builder check found nothing important unanswered. Fresh final review found no material bugs, including follow-up directory links and receipt identity. Browser1280×720 and390×844: approximate462search/card/route, conflicting400disclosure, actual map label→list selection, quiet+free filters clear hidden selection, mobile save/cancel and quick seat action, directory→map link. No browser warnings/errors. Published381a70c via Pages run41034886989 (success). Four public assets byte-match local. Public search462→route1–4→save→reload→receipt→cancel→empty history verified.
