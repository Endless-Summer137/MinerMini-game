# Miner Mini Game Progress

Last updated: 2026-05-12

## Current Goal

P0 is a playable mining scoop prototype. The default scoop blade should behave like a passive solid physical scoop:

- not magnetic
- not one-way
- not a force field
- minerals stay in the scoop because solid lips block them and friction slows them

## Implemented

- Single-page canvas game in `index.html`, `style.css`, and `main.js`.
- Vehicle movement with pointer and keyboard controls.
- Mineral spawning, wall collision, mineral-mineral separation, collection zone, coins, and upgrade UI.
- Load-based vehicle slowdown and shake.
- Default scoop blade with a continuous U-shaped boundary.
- Solid two-sided scoop lip collisions:
  - left and right lips are thick side-wall colliders
  - back/inner lip is a thick solid collider and the main pushing boundary
  - two back corner caps close the seams between side lips and back lip
  - minerals are pushed out of overlaps along the lip normal
  - velocity into the lip is removed using moving-wall relative velocity
  - tangential velocity is preserved with moderate friction so minerals slide
- Collision stability:
  - 3 physics substeps for scoop/mineral collision
  - passive scoop-lip correction after mineral integration
  - mineral speed caps and correction caps
- No visible default scoop attraction:
  - `centerPullForce = 0`
  - `scoopMagnetForce = 0`
  - `sideInwardAttractionForce = 0`
  - `bodyMineralPushForce = 0`

## Latest Change

Changed scoop lips from one-way soft constraints into solid two-sided collision barriers.

Important implementation points in `main.js`:

- `applyBladeLipCollisions` runs substepped scoop collision.
- `resolveBladeLipContactsForMineral` updates containment and resolves all lip contacts.
- `resolveSolidLipContact` performs overlap correction and moving-wall collision response.
- `getBladeLipColliders` builds the U-shaped lip colliders:
  - back segment
  - left segment
  - right segment
  - left back corner cap
  - right back corner cap
- `updateMinerals` applies passive scoop collision after mineral movement to reduce tunneling.

## Validation Already Run

- `node --check main.js`
- Browser load through local static server at `http://127.0.0.1:8000/index.html`
- Browser console errors: none
- A Node physics assertion script checked:
  - left lip blocks outward motion
  - right lip blocks outward motion
  - back lip blocks backward motion into the vehicle
  - back corner cap closes the seam
  - a mineral in the scoop center does not move without contact

## Current Known Limits

- This is still a lightweight custom canvas physics prototype, not a full physics engine.
- There is no automated test file yet; the physics assertions were run as an ad hoc VM script.
- The project folder started as a standalone local prototype and is still early in its tooling maturity.
- There is not yet a repeatable automated regression test harness for scoop/mineral behavior.

## Recommended Next Steps

1. Add repeatable physics regression tests for scoop lip containment.
2. Tune scoop lip friction and restitution after more playtesting.
3. Add a debug collision overlay toggle.
4. Improve mineral pile stability under high load.

## Workflow Agreement

This repository is the source of truth across Codex conversations.

Default collaboration rule:

- After each completed, verified small task, update the local project files first.
- Update `PROGRESS.md` when the current state, design decisions, validation status, or next steps changed.
- Update `README.md` only when the setup flow, public project description, or usage guidance changed.
- Update `WORKFLOW.md` when a durable repository rule changes.
- Commit and push coherent finished changes to GitHub.
- Do not push half-finished exploratory edits unless explicitly requested.
