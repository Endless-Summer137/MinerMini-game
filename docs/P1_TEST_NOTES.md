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
- Drill progressive damage and loose ore spawning
- spawned ore enters the existing loose ore -> Scoop -> crusher loop

Out of scope for P1-C:

- Hammer burst mining
- corridor / corner test
- vein respawn
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
- Vehicle body cannot pass through intact, cracked, or heavy-cracked vein segments.
- Drill is stopped at the segment surface instead of slowly passing through the vein.
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
- P1-C follow-up assertion script passed for solid segment data, vehicle/Drill collision resolution, depleted collision skipping, surface-contact Drill mining, no passive mining, no wrong-pressure mining, single-segment depletion, final-yield cap, Hammer non-mining, spawned loose ore, Scoop securing, and blocked switching while carrying secured ore.
- Local static server returned 200 for `index.html`.
- Served `main.js` included `VEIN_DEFS`, `updateVeins`, `spawnProgressiveVeinOre`, and `drawVeins`.
- In-app browser reloaded `http://127.0.0.1:8000/index.html` with no console errors.
