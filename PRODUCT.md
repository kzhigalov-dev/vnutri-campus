# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing static HTML/CSS/vanilla JavaScript and Three.js, published from public/ through GitHub Pages. A separate earlier server implementation exists but is not required by this assignment and is not configured for real mail.

## Users

Students and visitors exploring СПбГУПТД and looking for a room or a place for independent work. The user is presenting this as a creative university assignment.

## Product Purpose

An interactive map of the campus building at Вознесенский44–46, with floor/room exploration, search, illustrative routes across floors, and free educational booking of work seats.

## Operating Context

Course task4 requires matching map/list, at least8 bookable objects, two useful filters, explicit free/selected/busy states, validation, confirmation, browser persistence, cancellation, keyboard and mobile support. User prefers building-led exploration, minimal chrome and a separate convenient booking flow. First-person walking was explicitly removed in favour of informative navigation.

## Capabilities and Constraints

Five floors,22 referenced room records and8 pilot zones with8 seats each. Existing local booking IDs and storage compatibility matter. Booking is free; no payment, login or live reservation is represented. No real mail service is configured; email receipts are explicitly examples only. The user cannot supply floor plans and explicitly authorizes invented layout for a finished concept. Original archive evidence stays accessible, and authored geometry/room placements must remain clearly distinguished from confirmed current facts.

## Brand Commitments

Name: «внутри.»; creative/design university СПбГУПТД. User requested inspiration from Apple and Philippe Starck, plus independently researched exceptional interactive3D work. User rejected the existing pale repeated floors and generic sidebar interface as unfinished. New benchmark: the coherent authorial universe and distinct visual objects in https://wqpqlsk.github.io/2007/; do not copy that site's retro theme. High-reasoning agent to conceive, medium-reasoning agents to implement, as explicitly requested. Creative implementation decisions and completion through publication have been delegated by the user in this conversation.

## Evidence on Hand

public/data/floor-geometry.json and archive images are2012 reference material; public/data/directory.json has current/historical/conflicting room-purpose records; public/js/room-placements.js marks spatial guesses with≈. No verified modern numbered plan was found. Public website and GitHub repository are already authorized. No invented accessibility, actual occupancy, actual institutional booking permission or evacuation claims.

## Product Principles

- A coherent creative place, immediately recognizable as a designed university experience.
- Building/model is the primary visual and interaction surface.
- Different spaces have distinct visual character and useful information.
- Search, route and booking remain easy to discover and complete.
- Conceptual content is honest and never presented as a surveyed current plan.

## Delivery Priority

Latest user steering: desktop visual quality is the primary acceptance target. Mobile must remain functional without horizontal overflow; extensive mobile-specific art direction is not required in this iteration.

## Accessibility & Inclusion

Keyboard alternative to canvas, visible focus, mobile layout, non-colour-only occupancy states and reduced-motion behavior. No claims of audited WCAG compliance or real-campus accessible routes.
