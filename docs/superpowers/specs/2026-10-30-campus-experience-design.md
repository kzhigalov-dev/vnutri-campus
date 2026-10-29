# Campus experience: from building to walking

The user explicitly delegates creative research, planning and full implementation. Build on the current evening architecture, compact chrome and five archive-derived floors. Preserve existing free booking and existing private Sites identity.

## Experience
1. Building → floor: retain current ready-before-reveal entry. Floor → building: reverse camera pullback, available by back button or zooming out of overview. Never leave inert layers or stale pending states. Escape cancels navigation.
2. Walk: perspective first-person view at model eye height. Drag to look, WASD/arrows and mobile direction controls to move. Ground click follows a collision-safe route when possible; inaccessible points report no path. Show a small live minimap with position/direction and route. No pointer-lock dependency, sound, VR or real-world navigation claims.
3. Spaces: geometry-derived interior zone polygons, small source-aligned clickable indexes and selected-zone fill. These are explicitly model indexes such as П4.12, NOT confirmed current room numbers or BTI numbers. All modernNumber fields null unless primary evidence exists. A compact searchable room list and source-aware space card allow focus and walk entry. Current numbered rooms remain searchable in the real directory/booking catalog, no fabricated map binding or bookable-green zone.
4. Camera tour: user-started curated overhead flights to west/central/east portions, controllable pause/previous/next and immediate stop on manual interaction. Never keep animation running in hidden tabs/viewers. Reduced-motion skips interpolation and uses manual stops rather than autoplay.
5. Visuals: preserve navy #172630, limestone #b9b5a3, floor #c5c5b0, warm brass #e5c28a and sage #dce6d0. Existing Manrope/Oswald. Model stays fullscreen. Draw focus amber, route sage. Interior lighting and edge details remain illustrative. No auto motion before user action.

## Grounding
Matterport: inside/dollhouse/floor-plan modes, navigable positions, controlled guided tour and smooth paths. Little Workshop Showroom: restrained chrome and material-focused view. Research primary links in research/experience-references-2026-10-30.md. No copying proprietary assets/code. Original plans still archive2012; present2026 walls and room numbers unverified.

## Engineering boundaries
Pure walk-navigation.js owns footprint tests, wall/obstacle collision, sliding movement and grid BFS/A* routes. floor-walk.js owns perspective camera/input/route/minimap; floor-spaces.js owns labels/select/list; floor-scene.js owns overview, integration, materials and tour. All share retained pixel-to-world conversion. Player remains inside footprint, outside walls/stairs/illustrative furniture; routing never invents door connections. Recompute from each floor separately. Use bounded grids/spatial buckets, no new runtime package. RequestAnimationFrame only while moving, touring or animating; stop on blur, visibility change, navigation/disposal.

## Acceptance
Five floors support labels, safe walk entry and manual movement; minimap matches coordinates; blocked path is rejected; no wall tunnelling or disconnected-inset route. Camera tour can be stopped; all transitions cancellable; zoom-out restores whole building; mobile controls/labels don't overflow; reduced motion and 2D/WebGL fallback work. Add meaningful collision/routing/state tests, run suite/build and browser flows, fresh review, publish same private Site. Actual room number mapping and real email sender remain external limitations, not grounds for fabricating data.
