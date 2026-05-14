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
