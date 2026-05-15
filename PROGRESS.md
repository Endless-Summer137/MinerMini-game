# Miner Mini Game Progress

Last updated: 2026-05-15

## Current Goal

P1-C is a segmented ore vein and Drill progressive spawning checkpoint on top of the playable P1-A/P1-B prototype. The current follow-up makes Drill contact bite into non-depleted vein surfaces instead of sliding freely around circular segments. The default scoop blade should still behave like a passive solid physical scoop:

- not magnetic
- not one-way
- not a force field
- minerals stay in the scoop because solid lips block them and friction slows them

## Implemented

- Single-page canvas game in `index.html`, `style.css`, and `main.js`.
- Vehicle movement with pointer and keyboard controls.
- Reverse movement: strong opposite input moves backward without turning the scoop/blade around.
- Mineral spawning, wall collision, mineral-mineral separation, side crusher sell-point, coins, and upgrade UI.
- P0.5 data tables for future ore, blade, vehicle chassis, vehicle skin, crusher, and upgrade definitions.
- P1-A larger test map:
  - canvas stays a fixed 360 x 640 viewport
  - world map is 720 x 1080 world pixels
  - `MAP_CONFIG` keeps rectangular bounds for now, but centralizes boundary config for future irregular map boundaries
  - `CAMERA_CONFIG` reserves zoom, min/max zoom, follow smoothing, and map clamp settings
  - camera follows the vehicle with slight smoothing and clamps to map boundaries
  - UI, joystick, completion banner, and coin-to-HUD particles remain screen-fixed
  - crusher, minerals, vehicle, scoop, world particles, and map boundaries remain in world coordinates
- P1-B minimal tool switching:
  - `TOOL_TYPES` defines Scoop, Drill, and Hammer
  - keyboard `1`, `2`, and `3` switch active tool as a temporary debug control
  - current tool is shown as screen-fixed debug text on the canvas
  - switching is blocked while secured ore is still carried in the scoop
  - Scoop remains the only tool with ore collection, securing, delivery, and blade collision behavior
  - Drill and Hammer use push-only solid tool-head contact against loose ore, but do not mine, damage, spawn ore, secure ore, or interact with veins
- P1-C segmented ore vein prototype:
  - one default test vein has 3 segments
  - each segment tracks integrity, assigned yield, spawned ore, visual state, solid body, and mine area
  - non-depleted segments block the vehicle body and active tool heads before Drill damage is applied
  - depleted segments render as smaller broken residue and no longer use solid mineable collision
  - vein final yield is `floor(baseYield * yieldMultiplier)`, and assigned segment yields sum exactly to it
  - Drill can progressively damage only the contacted solid segment when the Drill tip is touching and the player is pressing toward it
  - valid Drill contact applies a bite lock that strongly damps tangential sliding along circular vein surfaces
  - damaged segments spawn normal loose ore over time, and spawned ore enters the existing Scoop -> crusher loop
  - Hammer remains a push-only placeholder and does not mine veins
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
  - unload duration scales by current load percentage, not raw ore count, and is capped at 1 second
  - after unloading, the vehicle can leave while crusher processing continues in the background
  - crusher processing duration is capped at 3 seconds, with larger loads increasing particle intensity instead of wait time
  - ore processing emits mineral dust/sparks and drives roller motion
  - coin payout spawns coin particles that fly toward the top Coins HUD and increment coins on arrival
  - placeholder hooks exist for crusher loop, ore crush, and coin burst sounds

## Latest Change

Implemented the P1-C Drill contact lock / bite follow-up while preserving P1-A map/camera behavior and P1-B tool switching/push-only contact.

Important implementation points in `main.js`:

- `VEIN_DEFS.testThreeSegmentVein` defines the default 3-segment test vein, base yield, multiplier, position, segment spacing, solid radius, and mine-area radius.
- `createVeinFromDef` calculates `finalYield = floor(baseYield * yieldMultiplier)` and distributes `assignedYield` exactly across segments.
- Each segment stores `integrity`, `assignedYield`, `spawnedOre`, `visualState`, `depleted`, `solidBody`, `mineArea`, and compatibility `hitArea`.
- `resolveVehicleAndToolVeinContacts` keeps the vehicle body and active tool head outside non-depleted segment `solidBody` circles.
- `getActiveDrillAction` only mines while active tool is Drill and Drill tip has surface contact plus input pressure toward the contacted segment.
- `applyDrillBiteLock` strongly reduces tangential movement while the Drill is biting, keeps the tip near the surface, and exits immediately when input is released, reversed, or contact is lost.
- Progressive spawning uses `floor(segment.assignedYield * damageProgress)` and caps against both segment yield and vein final yield.
- Segment auto-finish only applies to the currently drilled heavy-cracked segment at `veinFinishThreshold`.
- `drawVeins` uses simple debug shapes, mine-area rings, cracks, state labels, active segment highlight, and smaller depleted residue; no formal art was added.
- Vein-spawned ore uses `createLooseMineral`, so it stays normal loose ore that Scoop can secure and sell.

Previous P1-B implementation points:

- `TOOL_TYPES` centralizes the current Scoop / Drill / Hammer data, including ids, display names, keyboard bindings, visual shape, dimensions, and placeholder behavior type.
- `activeTool` starts as Scoop and can switch with keyboard `1`, `2`, and `3` only when no secured ore is being carried.
- `canSwitchToolsNow` blocks switching while secured ore remains in the scoop and shows the temporary debug notice `Unload before switching tools`.
- Scoop continues to use `BLADE_TYPES.scoopBlade`; Drill and Hammer draw different placeholder tool visuals but skip scoop lip collision, scoop capture, and crusher delivery checks.
- Drill and Hammer use `behaviorType: "pushOnly"` plus simple tool-head colliders so loose ore is displaced by contact instead of being passed over.
- Push-only tool contact reuses moving-wall velocity response with low restitution and no attraction, so the tools behave solid without becoming magnetic or destructive.
- `drawToolDebugOverlay` renders the current tool in screen space, outside the camera transform, so the text stays fixed while the map scrolls.

Previous P1-A implementation points:

- `viewport` now represents the canvas screen size, while `world` represents the larger playable map.
- `MAP_CONFIG` keeps rectangular bounds for now, but boundary config is centralized for future irregular map boundaries.
- `CAMERA_CONFIG` centralizes camera zoom, min/max zoom, follow smoothing, and boundary clamp behavior for future mobile/performance tuning.
- `camera` follows the vehicle with configurable smoothing and clamps inside the map using the current zoomed view size.
- `draw` applies the camera transform only around world-space rendering.
- `drawParticles("world")` and `drawParticles("screen")` keep ore dust in world space while coin payout particles can fly to fixed HUD space.
- Vehicle and mineral wall clamps now use the larger map boundaries without changing the scoop collision model.
- `mineralCount` increased to 84 so the larger test map still has enough loose ore for P0.4 scoop/crusher checks.

Previous P0.5 implementation points:

- `ORE_TYPES.basicOre` now owns radius, push resistance, capacity cost, reward values, colors, particles, and tags.
- Mineral objects keep their ore type through loose, secured, delivered, and crusher payout states.
- `syncScoopLoadCount`, capture capacity, and crusher load ratio now use capacity units instead of assuming raw ore count forever.
- `calculateCrusherPayout` uses ore type reward data plus `CRUSHER_TYPES` multipliers.
- `BLADE_TYPES.scoopBlade` owns blade shape, capacity, capture rules, lip collision tuning, assist hooks, and future ore tag allowances.
- `VEHICLE_CHASSIS` owns speed, collision size, and reverse tuning; `VEHICLE_SKINS` owns visual-only colors.
- `UPGRADE_DEFS.pushPower1` centralizes the current P0 upgrade `costs`, `requirements`, and ordered `effects`.
- Upgrade purchase now routes through helper checks for affordability and requirements before spending costs.
- `docs/P0.5_ARCHITECTURE_AUDIT.md` records ready extension points and remaining P0-only assumptions.

Previous P0.4 implementation points:

- `crusher` replaces the old `collector` object and is positioned off the main vertical traffic path.
- `tryStartSecuredOreDelivery` now starts a fast unload batch when secured ore reaches the crusher sell area.
- `getCurrentCrusherLoad` defines P0 load as `currentSecuredOre / maxScoopCapacity`.
- `getCrusherUnloadDuration` uses load-ratio bands: 0-50%, 50-70%, 70-95%, and 95-100%.
- `createCrusherBatch` stores the load ratio while `getCrusherProcessingDuration` keeps background processing capped.
- `finishDeliveredOre` removes ore after it reaches the crusher and starts processing once the whole load is unloaded.
- `updateCrusherBatches` runs crusher processing independently after the player leaves.
- `spawnCrusherProcessingParticles` scales ore dust/spark intensity with load size.
- `spawnCoinPayout` creates grouped coin particles that fly toward the Coins HUD and add currency on arrival.
- `drawCrusher` and `drawCrusherRoller` render a simple embedded ground crusher with rotating dual shafts.
- `playCrusherLoopSound`, `playOreCrushSound`, and `playCoinBurstSound` are placeholder hooks for future audio.
- `getVehicleMovementIntent` separates input movement direction from `vehicle.dirX/Y` facing direction.
- Strong opposite input below `reverseDotThreshold` moves backward at `reverseSpeedMultiplier` and leaves scoop/blade direction unchanged.
- Side and diagonal inputs outside the reverse threshold still use normal smooth facing updates.

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

- `node --check main.js` for P1-A camera/map changes.
- P1-A assertion script checked:
  - viewport remains 360 x 640 while world is 720 x 1080
  - camera clamps at map edges using current zoomed view size
  - vehicle+scoop and minerals clamp inside the larger map
  - reverse movement and push upgrade still work
  - coin payout particles can use screen-space flight toward the HUD
- P1-A camera zoom supplement checked:
  - default zoom is 1.0, preserving current view scale
  - zoom is clamped between configured min/max values
  - world-to-screen conversion respects camera zoom
  - UI and screen-space coin payout remain outside the camera transform
- P1-B assertion script checked:
  - default active tool is Scoop
  - `1`, `2`, and `3` select Scoop, Drill, and Hammer
  - switching is blocked while secured ore is carried
  - switching works again after secured ore is gone
  - Drill and Hammer push loose ore through push-only contact
  - Drill and Hammer do not secure ore or run scoop capture behavior
  - debug overlay is drawn in screen space
- P1-C segmented vein assertion script checked:
  - default vein has 3 segments
  - non-depleted segments expose `solidBody` and `mineArea`
  - vehicle body and Drill tool collision resolve out of solid segments
  - depleted segments skip solid collision while untouched segments remain solid
  - Drill bite lock enters only during Drill tip contact plus pressure
  - valid bite lock strongly damps tangential sliding along a circular segment surface
  - releasing input, reversing away, or losing tip contact exits bite lock
  - assigned segment yields sum exactly to final yield
  - standing near the vein does not mine
  - wrong pressure direction does not mine
  - Drill contact plus pressure damages only the contacted segment
  - progressive damage spawns normal loose ore without exceeding final yield
  - one segment can deplete while untouched segments remain intact
  - Hammer does not mine veins
  - spawned vein ore can be secured by Scoop
  - switching while carrying secured ore is still blocked
- P1-A VM draw/update smoke test passed.
- `node --check main.js` for P0.5 data-table refactor.
- P0.5 assertion script checked:
  - `basicOre` capacity cost and base coin data are preserved
  - secured load can be summed from ore `capacityCost`
  - crusher payout uses ore type values and crusher multipliers
  - current basic ore payout remains one coin per ore
  - current push upgrade still costs 20 coins and has no blocking P0 requirements
  - upgrade effects still preserve P0 push force and blade width behavior
  - P0.4 load-ratio unload bands and reverse movement behavior still pass
- Local static server check for P0.5:
  - `http://127.0.0.1:8000/index.html` returned 200
  - served `main.js` includes `ORE_TYPES`, `BLADE_TYPES`, `VEHICLE_CHASSIS`, `CRUSHER_TYPES`, and `UPGRADE_DEFS`
  - served `main.js` still has no old `const collector` object
- Local static server check for P1-A:
  - `http://127.0.0.1:8000/index.html` returned 200
  - served `main.js` includes `CAMERA_CONFIG`, `camera`, `viewport`, `mapWidth`, and `mapHeight`
- `node --check main.js` for P0.4 crusher sell-point changes.
- P0.4 tuning assertion script checked:
  - empty load gives no unload duration
  - 25%, 60%, 80%, and 100% load ratios map to the intended unload bands
  - unload duration never exceeds 1 second
  - direct opposite input enters reverse mode and keeps facing stable
  - side input remains normal turning movement
- Local static server check for P0.4:
  - `http://127.0.0.1:8000/index.html` returned 200
  - served `main.js` includes `reverseDotThreshold` and load-ratio unload logic
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
- P0.4 crusher/reverse feedback has syntax and assertion validation but still needs hands-on browser playtesting for exact feel.
- Sound hooks are placeholders only; no audio files or playback implementation exists yet.
- P0.5 creates extension data tables, but there is still only one active ore, blade, chassis, skin, crusher, and upgrade.
- Upgrade prerequisites are data-shaped, but there is no multi-upgrade graph validator yet.
- P1-A is still a test map, not formal level design.
- P1-C only adds a minimal segmented vein model and Drill progressive ore spawning; Hammer burst mining, corridor tests, vein respawn, ore rarity, and formal ore economy are not implemented yet.

## Recommended Next Steps

1. Manually playtest P1-C Drill pressure feel, segment readability, and spawned ore flow into Scoop/crusher.
2. Add repeatable physics regression tests for scoop lip containment and map boundary clamps.
3. Split `main.js` into modules before adding many P1/P2 content types.
4. Tune scoop lip friction and restitution after more playtesting.
5. Add a debug collision overlay toggle.
6. Improve mineral pile stability under high load.

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
