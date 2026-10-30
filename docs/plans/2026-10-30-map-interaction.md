# Map interaction and interface refinement

User direction: Apple clarity and motion; Philippe Starck's light, sculptural materials. Existing vanilla JS/Three.js campus navigator remains the product. This is an extension of its current light architectural world, not a replica of either brand.

1. Finish compact interface: collapsible time, explicit time edit, keyboard search, clear room/seat hierarchy, mobile drawer and map controls.
2. Light porcelain walls, restrained violet structural edges and coral bookable areas; room relief, selected outline, stairs as explicit spatial landmarks. Preserve source polygons and approximate ≈ bindings.
3. Hover/focus room feedback and contextual preview; interactive floor signs. Camera transition keeps spatial continuity while non-target floors fade. Top view/3D switch, quarter rotation and zoom-out return to all floors.
4. Route preview: a moving marker follows the exact ordered floor paths and stair connections; play/pause/replay and scrub control, floor/progress feedback. Preserve manual floor steps. Explicit demo rather than real-time positioning.
5. Event-driven rendering except during user-requested animation. Stop animation on hidden page, user camera intervention, new route and disposal. Reduced-motion uses manual progress instead of autoplay.
6. Verify pure journey interpolation on ascending, descending and same-floor paths, no geometry shortcuts. Full domain tests and TypeScript; one batched desktop/mobile inspection, one corrective batch and one confirmation round. Publish through existing GitHub Pages workflow.

References consulted: https://www.apple.com/maps/ ; https://developer.mappedin.com/web-sdk/wayfinding ; https://developer.mappedin.com/web-sdk/dynamic-focus ; https://www.starck.com/about ; https://help.concept3d.com/hc/en-us/articles/360058360353-About-360%C2%BA-Maps ; https://bruno-simon.com/ . Authorial transfer: contextual focus, camera continuity, material clarity and direct feedback; no external assets or proprietary SDK copied.

Motion thesis: selecting a floor isolates it in place as the camera approaches; returning reveals its relationship to the other floors. A route has a single opt-in moving marker. No idle orbit or continuous decorative rendering. Target existing desktop/mobile WebGL; no new dependencies.
