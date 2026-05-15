# P1 Vein Config Notes

This note records the P1-C vein config migration. It is interface-only prep for future P1/P2 work, not a new gameplay system.

## Current Active Vein

- `VEIN_DEFS.testThreeSegmentVein` is still the only active test vein.
- Current P1 gameplay still outputs only `basicOre`.
- The existing Drill contact lock / bite feel is preserved through config values copied from the previous constants.
- Hammer fields are reserved but unused.

## Config Shape

Future vein variants should be created by copying the nested config shape:

- `placement`: position, angle, and segment spacing.
- `segment`: `segmentCount`, `totalIntegrity`, `segmentIntegrity`, `finishThreshold`, visual thresholds, and collision radii.
- `yield`: `baseYield`, `yieldMultiplier`, and runtime `finalYield = floor(baseYield * yieldMultiplier)`.
- `oreOutput`: current `oreType`, future `oreTypeWeights`, and spawn scatter.
- `drill`: resistance, damage speed, pressure threshold, contact tolerance, collision passes, and bite lock tuning.
- `hammer`: reserved future hit resistance/damage/radius/affected segment data.
- `respawn`: reserved future respawn policy.

## Respawn Interface

Current respawn config:

```js
respawn: {
  enabled: false,
  respawnSeconds: null,
  timeSource: "none",
}
```

No real respawn occurs in P1-C.

Future `timeSource` options may include:

- `"server"`: preferred for formal economy timing.
- `"trustedPlatform"`: acceptable if the platform exposes trusted time.
- `"clientLocal"`: risky because users can change device time; use only as debug/fallback, not as the only formal economic source.
