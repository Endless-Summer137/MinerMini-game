# Miner Mini Game Progress

Last updated: 2026-05-13

## Current Goal

P0.4 is a playable mining scoop prototype with a quick crusher sell-point feedback pass. The default scoop blade should still behave like a passive solid physical scoop:

- not magnetic
- not one-way
- not a force field
- minerals stay in the scoop because solid lips block them and friction slows them

## Implemented

- Single-page canvas game in `index.html`, `style.css`, and `main.js`.
- Vehicle movement with pointer and keyboard controls.
- Mineral spawning, wall collision, mineral-mineral separation, side crusher sell-point, coins, and upgrade UI.
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
  - iterative mineral-mineral separation for squeezed piles
  - mineral speed caps and correction caps
- No visible default scoop attraction:
  - `centerPullForce = 0`
  - `scoopMagnetForce = 0`
  - `sideInwardAttractionForce = 0`
  - `bodyMineralPushForce = 0`
- P0.3 scoop handling model:
  - minerals use `looseOre`, `captureCandidate`, `securedOre`, and `deliveredOre` states
  - scoop capacity is logic-only with `maxScoopCapacity = 20`
  - secured ore stays visible as an irregular loose pile inside the scoop
  - secured ore keeps captured scoop-local positions with small slosh and jitter
- P0.4 crusher sell-point model:
  - the old circular `IN` collector is replaced by a simple embedded dual-shaft crusher
  - the crusher sits on the upper-left side as a reachable unload bay, not in the main center traffic path
  - secured ore unloads quickly when the vehicle or scoop reaches the sell area
  - unload duration scales by carried amount but is capped at 1 second
  - after unloading, the vehicle can leave while crusher processing continues in the background
  - crusher processing duration is capped at 3 seconds, with larger loads increasing particle intensity instead of wait time
  - ore processing emits mineral dust/sparks and drives roller motion
  - coin payout spawns coin particles that fly toward the top Coins HUD and increment coins on arrival
  - placeholder hooks exist for crusher loop, ore crush, and coin burst sounds

## Latest Change

Implemented P0.4 crusher sell-point feedback while preserving the P0 push-mining scope.

Important implementation points in `main.js`:

- `crusher` replaces the old `collector` object and is positioned off the main vertical traffic path.
- `tryStartSecuredOreDelivery` now starts a fast unload batch when secured ore reaches the crusher sell area.
- `createCrusherBatch`, `getCrusherUnloadDuration`, and `getCrusherProcessingDuration` keep unload and background processing capped.
- `finishDeliveredOre` removes ore after it reaches the crusher and starts processing once the whole load is unloaded.
- `updateCrusherBatches` runs crusher processing independently after the player leaves.
- `spawnCrusherProcessingParticles` scales ore dust/spark intensity with load size.
- `spawnCoinPayout` creates grouped coin particles that fly toward the Coins HUD and add currency on arrival.
- `drawCrusher` and `drawCrusherRoller` render a simple embedded ground crusher with rotating dual shafts.
- `playCrusherLoopSound`, `playOreCrushSound`, and `playCoinBurstSound` are placeholder hooks for future audio.

Previous gameplay implementation:

Implemented the P0.3 secured scoop handling model while preserving the push-mining visual fantasy.

Important implementation points in `main.js`:

- `mineralState` defines `looseOre`, `captureCandidate`, `securedOre`, and `deliveredOre`.
- `updateScoopCaptureCandidates` scores mostly-inside minerals using 9 sample points and a short dwell timer.
- Candidate capture is capacity-limited and sorted by `insideRatio`, then dwell time.
- `secureMineral` preserves the captured scoop-local position and adds only small irregular offsets.
- `updateSecuredOre` renders secured ore as a loose pile riding in the scoop with subtle local slosh.
- `clampVehicleAndBladeToWalls` constrains both the vehicle body and scoop lips against world walls.
- `getVehicleAndBladeWorldBounds` builds an axis-aligned wall footprint from the vehicle body and scoop lip endpoints.
- `resolveMineralContacts` now runs multiple contact iterations and re-applies wall constraints between iterations.
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

- `node --check main.js` for P0.4 crusher sell-point changes.
- Local static server check for P0.4:
  - `http://127.0.0.1:8000/index.html` returned 200
  - served `main.js` includes `drawCrusher`, `spawnCoinPayout`, and `playCrusherLoopSound`
  - served `main.js` no longer includes the old `const collector` object
- `node --check main.js`
- P0.3 state assertion script checked:
  - mostly-inside ore becomes `captureCandidate` before becoming secured
  - capture requires dwell time and does not happen instantly
  - limited remaining capacity captures only the highest `insideRatio` candidate
  - overflow candidates remain loose
  - secured ore enters `deliveredOre` near the collector and awards coins after visible flow completes
- Local static server check:
  - `http://127.0.0.1:8000/index.html` returned 200
  - `http://127.0.0.1:8000/main.js` served the P0.3 state model code
- A Node physics assertion script checked:
  - scoop footprint cannot cross left, right, top, or bottom walls
  - overlapping mineral pairs separate to near touching
  - wall-squeezed mineral pairs separate while staying inside world bounds
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
- P0.4 crusher feedback has syntax validation but still needs hands-on browser playtesting for exact feel.
- Sound hooks are placeholders only; no audio files or playback implementation exists yet.

## Recommended Next Steps

1. Add repeatable physics regression tests for scoop lip containment.
2. Playtest crusher placement and unload timing to confirm it feels deliberate, quick, and non-blocking.
3. Tune scoop lip friction and restitution after more playtesting.
4. Add a debug collision overlay toggle.
5. Improve mineral pile stability under high load.

## Workflow Agreement

This repository is the source of truth across Codex conversations.

Default collaboration rule:

- After each completed, verified small task, update the local project files first.
- Update `PROGRESS.md` when the current state, design decisions, validation status, or next steps changed.
- Update `README.md` only when the setup flow, public project description, or usage guidance changed.
- Update `WORKFLOW.md` when a durable repository rule changes.
- Add concise intent comments around non-obvious physics, state, coordinate, and tuning logic so the user can read the code later.
- Commit and push coherent finished changes to GitHub.
- Do not push half-finished exploratory edits unless explicitly requested.
