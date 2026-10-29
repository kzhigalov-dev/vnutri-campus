# Progress — campus-booking 2026-10-29
Active spec: docs/superpowers/specs/2026-10-29-campus-booking.md
Active plan: docs/superpowers/plans/2026-10-29-campus-booking.md
Earlier fictional depot and material-reuse concepts are superseded by user's campus navigation and self-study seat booking request.
Current data: 22 sourced address records, five explicitly floor4. Exact current room geometry unknown. User authorizes finishing implementation and booking demo. No real university access or tariffs asserted.

2026-10-29: domain implemented and 14 tests pass. UI/Three.js implemented. Browser verified empty seat error; 2-seat total240; save/reload/cancel; invalid duration; time change removes occupied seat; filtering clears selection; map/list counts agree; empty results. Archive discovery: expert PDF2023 appendix10 includes floor4 plan stamped2012 on PDF page322. Added standalone archive viewer; 3D geometry remains explicitly conceptual.

Final implementation: 15 domain tests pass. Reviewer findings fixed: 250-record read/write limit; selection reconciliation after booking and external storage updates; failed WebGL cannot return to dead scene. Browser verified mobile 390/360, keyboard Enter/Space, cross-tab filling selected room, cancellation, archive, 2D. README, font licenses, verification notes and screenshot added. Site package uses existing private project identity, static dist.

2026-10-29 building-first: user requests building-centered entire campus. Spec/plan building-first supersedes landing composition. Archive pages319–323 verified floors1–5. Main volume with three wings, five selectable levels; actual scans zoom100–800%; booking onlyfloor4, no fabricated modern room positions. 18 tests pass; browser desktop/mobile390/keyboard/actual facade click/allfloors/booking persistence+cancel verified. Reviewer archive-preview mismatch fixed and browser regression checked. Massingapproximate and currentroommappingunknown disclosed. Existing private Site publication next.
