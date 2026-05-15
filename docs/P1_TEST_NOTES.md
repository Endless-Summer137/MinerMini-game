# P1 Test Notes

## P1-A Larger Map, Camera, Boundaries

Scope:

- larger test map
- camera follows vehicle
- camera zoom configuration reserved for future mobile/performance tuning
- map boundaries
- centralized rectangular boundary config for future irregular map boundaries
- screen-fixed UI

Out of scope for P1-A:

- tool switching
- drill
- hammer
- segmented ore veins
- corridor test
- merchants, base camp, cart cargo, blockers, push-blade mechanics, formal art, formal sound, Cocos migration, or mobile platform integration

Manual checklist:

- Vehicle can drive across the larger map without camera jitter.
- Camera follows the vehicle smoothly but does not feel floaty.
- Camera clamps at all map edges.
- P1-A keeps rectangular bounds for now, but boundary config is centralized for future irregular map boundaries.
- Changing `CAMERA_CONFIG.zoom` locally should change how much world is visible without moving UI.
- Top HUD, controls, message, joystick, and completion banner stay screen-fixed.
- Crusher remains in world space and still unloads secured ore.
- Minerals remain stable in world space while camera moves.
- Scoop can still push, secure, and unload ore.
- Load-ratio crusher unload timing still feels quick.
- Reverse input still backs up without flipping the scoop.
- Push upgrade can still be bought after enough coins.
- Vehicle and minerals cannot leave the map.
- Corners do not create an obvious hard lock during normal play.

Validation notes:

- `node --check main.js` passed for P1-A.
- VM assertion script passed for camera clamp, viewport/world size split, boundary clamps, reverse movement, push upgrade, and screen-space coin payout.
- Camera zoom supplement assertion passed for default zoom, min/max clamping, zoomed camera bounds, and world-to-screen conversion.
- Boundary config supplement assertion passed for `MAP_CONFIG` rectangular bounds, unchanged wall inset behavior, camera clamp, and vehicle/mineral wall clamps.
- VM draw/update smoke test passed.
- Local static server returned 200 for `index.html`.
- Served `main.js` included `CAMERA_CONFIG`, `camera`, `viewport`, `mapWidth`, and `mapHeight`.

Still needs hands-on playtest in the browser:

- actual camera feel while dragging around the full map
- whether `CAMERA_CONFIG.zoom` values such as `0.85` and `1.25` are useful on real phone screens
- whether the larger map feels sufficiently populated
- whether edge/corner behavior feels acceptable during real mineral pushing
- whether crusher selling still feels readable after driving away

## P1-B Minimal Tool Switching Placeholders

Scope:

- active tool state
- temporary keyboard switching with `1`, `2`, and `3`
- Scoop / Drill / Hammer placeholder visuals
- Drill / Hammer push-only loose ore contact
- screen-fixed current-tool debug text
- switching blocked while secured ore is carried

Out of scope for P1-B:

- segmented ore veins
- drill mining
- hammer burst mining
- corridor test
- merchants, base camp, cart cargo, blockers, push-blade mechanics, formal art, formal sound, Cocos migration, or mobile platform integration

Manual checklist:

- `1` switches to Scoop.
- `2` switches to Drill.
- `3` switches to Hammer.
- Current tool debug text updates on screen and stays fixed while the camera moves.
- Switching is blocked while the scoop has secured ore.
- Blocked switching shows `Unload before switching tools`.
- Switching works again after unloading.
- Scoop still pushes, secures, unloads, and pays out ore normally.
- Drill pushes loose ore instead of passing through it.
- Hammer pushes loose ore instead of passing through it.
- Drill and Hammer do not mine, damage, spawn ore, or secure ore.
- Camera follow, camera clamp, map boundaries, reverse movement, and push upgrade still work.

Validation notes:

- `node --check main.js` passed for P1-B.
- P1-B follow-up assertion script passed for Drill/Hammer push-only contact, no secured ore creation, tool key selection, secured-load switch blocking, post-unload switching, and screen-space debug overlay routing.
- Local static server returned 200 for `index.html`.
- In-app browser reloaded `http://127.0.0.1:8000/index.html` with no console errors.

## P1-C Segmented Vein Drill Mining

Scope:

- one default segmented test vein
- 3 vein segments
- per-segment integrity, assigned yield, spawned ore, visual state, and hit area
- non-depleted segment solid bodies that block vehicle body and active tool heads
- separate mine areas that detect Drill contact and pressure
- Drill contact lock / bite feel on valid surface contact
- nested vein config for future variant tuning
- respawn config fields reserved as interface-only data
- Drill progressive damage and loose ore spawning
- spawned ore enters the existing loose ore -> Scoop -> crusher loop

Out of scope for P1-C:

- Hammer burst mining
- corridor / corner test
- real vein respawn
- server time, trusted platform time, client local time, or offline reward logic
- ore rarity
- new formal ore economy
- merchants, base camp, cart cargo, blockers, push-blade mechanics, formal art, formal sound, Cocos migration, or mobile platform integration

Manual checklist:

- Existing Scoop gameplay still pushes, secures, unloads, and pays out ore normally.
- Camera follow and camera clamp still work.
- Tool switching still works with `1`, `2`, and `3`.
- Switching while carrying secured ore is still blocked.
- Drill and Hammer still push loose ore instead of passing through it.
- Hammer remains push-only and does not mine veins.
- Vein config migration preserves the current P1-C test vein values.
- Respawn config exists but remains disabled; no real respawn occurs.
- Current P1 ore output remains `basicOre`.
- Vehicle body cannot pass through intact, cracked, or heavy-cracked vein segments.
- Drill is stopped at the segment surface instead of slowly passing through the vein.
- Drill does not slide freely around the circular segment surface while pushing into it.
- Releasing input, reversing away, or losing Drill tip contact exits the bite lock.
- Drill only damages a vein segment when the Drill tip has surface contact and input is pressing toward it.
- Standing near the vein without pressure does not auto-mine.
- Pressing away from the contacted segment does not mine.
- The contacted segment changes visual state from intact to cracked to heavy to depleted.
- One segment can be depleted without deleting untouched segments.
- Depleted segment collision is skipped/cleared while other non-depleted segments remain solid.
- Spawned ore can be scooped and sold normally.
- Total spawned ore never exceeds the vein final yield.
- Reverse movement and push upgrade still work.

Validation notes:

- `node --check main.js` passed for P1-C.
- P1-C vein config assertion script passed for nested config migration, legacy flat config migration, exact assigned-yield sum, disabled respawn interface, current `basicOre` output, Drill bite preservation, no passive mining, no real respawn, single-segment depletion, Hammer non-mining, spawned loose ore, Scoop securing, and push upgrade flow.
- Local static server returned 200 for `index.html`.
- Served `main.js` included `VEIN_DEFS`, `updateVeins`, `spawnProgressiveVeinOre`, and `drawVeins`.
- In-app browser reloaded `http://127.0.0.1:8000/index.html` with no console errors.

Related note:

- `docs/P1_VEIN_CONFIG_NOTES.md`

## P1-D Hammer Burst Mining And Corridor / Corner Test

Scope:

- Hammer hit interaction with segmented ore veins
- one Hammer contact-entry impact can damage one or more physically contacted non-depleted vein segments
- Hammer burst depletion, where remaining segment yield spawns at once
- no Hammer progressive ore spawning during damage
- no repeated Hammer damage while the Hammer stays on or slides along a vein
- simple debug corridor / corner test area
- vehicle/tool and loose ore collision against the debug corridor walls
- corridor width rule: `comboWidth = max(vehicleWidth, activeToolWidth)` and `minCorridorWidth = comboWidth * 1.3`

Out of scope for P1-D:

- formal level design
- vein respawn
- ore rarity
- merchants, base camp, cart cargo, blockers, push-blade mechanics, formal art, formal sound, Cocos migration, or mobile platform integration

Manual checklist:

- Existing Scoop gameplay still pushes, secures, unloads, and pays out ore normally.
- Camera follow and camera clamp still work.
- Tool switching still works with `1`, `2`, and `3`.
- Switching while carrying secured ore is still blocked.
- Drill still progressively mines veins only with valid tip contact and pressure.
- Drill contact lock / bite feel still helps the Drill stay on the contacted segment surface.
- Hammer still pushes loose ore instead of passing through it.
- Hammer does not damage veins from a distance.
- Hammer contact entry applies one hit to one or more physically contacted non-depleted vein segments.
- Staying on the vein does not repeatedly damage it.
- Sliding along the vein does not repeatedly damage it.
- Leaving contact and contacting again applies another Hammer hit.
- Hammer does not use Drill contact lock.
- Hammer does not progressively spawn ore while damaging a segment.
- Hammer-depleted segments burst their remaining assigned yield at once.
- Multiple Hammer-hit segments can burst together if they deplete in the same hit.
- Burst ore remains inside the map and can be scooped and sold normally.
- Total spawned ore never exceeds the vein final yield.
- Each segment's `spawnedOre` never exceeds its `assignedYield`.
- The debug corridor is passable without extreme alignment.
- Reverse movement is useful for backing out of the corridor/corner.
- Minerals do not permanently lock in corridor corners during normal play.
- Crusher, load-ratio unload timing, push upgrade, and map boundaries still work.

Validation notes:

- `node --check main.js` passed for P1-D.
- P1-D contact-entry VM assertion script passed for corridor width formula, four debug corridor walls, no Hammer distance damage, one hit on contact entry, no repeated damage while staying in contact, no repeated damage while sliding in contact, another hit after leaving and recontacting, multi-segment same-impact burst, no Hammer progressive spawning before depletion, final-yield cap, segment assigned-yield cap, Drill progressive mining smoke, and reset-spawned ore avoiding debug corridor walls.
- Local static server returned 200 for `index.html`.
- Served `main.js` included `getActiveHammerContactAction`, `hammerInVeinContact`, `applyHammerVeinHit`, `createCorridorTestCollisionZones`, and `applyDrillBiteLock`.

Still needs hands-on playtest in the browser:

- actual Hammer contact-entry impact feel and readability
- whether the burst ore spread feels satisfying without scattering too far
- whether multi-segment bursts are readable on the current debug vein art
- whether the debug corridor/corner feels like a control test rather than precision parking
- whether loose ore can be recovered naturally from corridor corners
