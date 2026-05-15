const mineralCount = 84;
// mineralCount controls how many rocks spawn on reset. P1-A raises it slightly
// so the larger test map still has enough loose ore for scoop-feel checks.
// Ore state is gameplay logic only. Secured ore must still draw like loose rocks
// riding in the scoop, not like hidden inventory or grid slots.
const mineralState = {
  looseOre: "looseOre",
  captureCandidate: "captureCandidate",
  securedOre: "securedOre",
  deliveredOre: "deliveredOre",
};

const vehicleSpeed = 175; // Player travel speed in pixels/second. Higher feels faster but can stress collisions.
const joystickMaxRadius = 86; // On-screen drag radius before input is treated as full strength.
const inputDeadZone = 8; // Tiny drag/key noise below this distance is ignored.
const facingSmoothingTime = 0.05; // Lower turns the scoop faster; higher makes steering feel heavier.
const reverseDotThreshold = -0.78; // Input more opposite than this reverses instead of turning the scoop around.
const reverseSpeedMultiplier = 0.72; // Reverse movement speed. Higher backs up faster while preserving scoop direction.
const mapWidth = 720; // P1-A test-map width in world pixels. Larger than the 360px viewport.
const mapHeight = 1080; // P1-A test-map height in world pixels. Large enough for camera-follow testing.
const MAP_CONFIG = {
  worldBounds: { x: 0, y: 0, width: mapWidth, height: mapHeight },
  boundaryMode: "rect", // P1-A still uses rectangular bounds; future modes can branch from this value.
  wallThickness: 24, // Visual and collision inset. Higher shrinks the playable rectangle.
  collisionZones: [], // Filled by the P1-D debug corridor; still not a formal level or blocker system.
};
const cameraFollowSmoothingTime = 0.08; // Lower follows tighter; higher feels floatier. Keep low for responsive P1-A control.
const CAMERA_CONFIG = {
  zoom: 1.0, // Larger zoom is closer with fewer world objects visible; smaller zoom shows more map.
  minZoom: 0.85, // Future mobile/performance lower bound for wider, cheaper views.
  maxZoom: 1.25, // Future readability upper bound for small screens.
  followSmoothing: cameraFollowSmoothingTime,
  clampToMapBounds: true,
};

const bladeWidth = 52; // Inner scoop span between side lips. Higher catches wider piles.
const bladeLength = 38; // Back-to-front scoop depth. Higher gives more room before ore reaches the mouth.
const bladeLipThickness = 8; // Visual fallback rim thickness used by generic blade bounds.
const bladeSurfaceAlpha = 0.09; // Transparency of the scoop floor fill; visual only.
const innerBackLipPushForce = 920; // Main shovel push. Higher makes the back lip shove ore forward harder.
const innerBackLipThickness = 9; // Solid back-wall thickness. Higher blocks leaks better but shrinks usable space.
const innerBackLipFriction = 0.94; // Tangential damping on the back lip. Higher reduces sliding along that wall.
const sideLipInwardForce = 0; // Legacy hook; keep 0 for default non-magnetic scoop.
const bodyMineralPushForce = 0; // Vehicle body assist. Keep low/0 so the back lip is the main pushing boundary.
const centerPullForce = 0; // Legacy center attraction. Keep 0 to avoid visible suction.
const scoopMagnetForce = 0; // Legacy magnetic assist. Keep 0 for passive physical scoop behavior.
const scoopFrictionInside = 0.045; // Mild floor friction for loose ore inside scoop. Higher settles sliding faster.
const scoopVelocityInheritance = 0.08; // Loose ore inherits a little scoop motion. Higher feels stickier/more assisted.
const maxAssistDisplacementPerFrame = 0; // Legacy positional assist cap. Keep 0 so ore is not teleported inward.
const maxAssistAcceleration = 8; // Caps velocity inheritance strength; higher makes inside ore follow the scoop more.
const scoopContainmentTolerance = 5; // Extra loose-ore range counted as near the scoop for stability.
const containedStateHysteresis = 10; // Exit buffer. Higher prevents flicker near lips but can feel forgiving.
const sideEscapeMargin = 4; // Extra side distance before loose ore is considered clearly outside.
const sideLipThickness = 14; // Solid side-wall thickness. Higher blocks side leaks but narrows the load zone.
const sideLipRestitution = 0.05; // Side-wall bounce. Lower feels like dull metal; higher makes rocks rebound.
const sideLipFriction = 0.9; // Side-wall tangential damping. Higher slows side sliding; lower lets ore glide.
const sideInwardAttractionForce = 0; // Explicitly off: side lips block, they do not pull ore inward.
const backLipRestitution = 0.02; // Back-wall bounce. Low values keep pushed ore from popping backward.
const maxScoopLipCorrectionPerSubstep = 8; // Max overlap fix per substep. Higher resolves deeper penetration faster.
const scoopContainmentRange = 0; // Legacy range hook; keep 0 unless adding a deliberate containment assist.

const pushForce = 2.4; // Player push strength baseline for loose physical ore.
const mineralFriction = 0.88; // Ground damping per frame. Lower makes rocks stop sooner; higher lets them coast.
const requiredPush = 1; // Minimum push power before a mineral responds strongly.
const saturationPush = 5; // Push level where response is mostly maxed out.
const maxPushSpeed = 118; // Mineral speed cap while player is pushing.
const maxMineralSpeed = 126; // Absolute mineral speed cap, including collisions and crusher delivery.

// Multiple contact passes keep squeezed minerals from visibly overlapping after
// the scoop or world walls compress a small pile.
const maxMineralContactCorrectionPerIteration = 2.4; // Per-pass separation cap. Higher fixes overlaps faster but can jitter.
const mineralContactIterations = 10; // More passes reduce pile overlap; too many costs CPU.
const mineralContactCorrectionRatio = 0.92; // Fraction of overlap corrected each pass. Lower is softer.
const mineralContactSlop = 0.02; // Tiny overlap ignored to prevent constant micro-shaking.
const mineralDampingInsideScoop = 1; // Extra damping hook for loose ore inside scoop. 1 means no extra damping.
const physicsSubsteps = 3; // Scoop collision substeps per frame. Higher reduces tunneling at higher CPU cost.
const maxImpulsePerMineralPerFrame = 36; // Caps shove impulses so squeezed ore cannot launch too violently.
const pushOnlyToolRestitution = 0.03; // Drill/Hammer ore bounce. Keep low so placeholder tools feel heavy, not springy.
const pushOnlyToolFriction = 0.86; // Tangential damping on push-only tools. Lower grips more; higher lets ore slide more.
const drillTipContactRadius = 8; // Contact radius for Drill mining checks. Higher makes vein contact more forgiving.
const drillPressureThreshold = 0.42; // Required input-dot-toward-segment. Higher demands more direct pressure.
const drillIntegrityDamagePerSecond = 0.42; // Segment damage rate while pressing Drill into a segment.
const veinFinishThreshold = 0.08; // Heavy-cracked segments at/below this can auto-finish while actively drilled.
const veinSpawnScatterRadius = 24; // Spawn spread around a drilled segment. Higher scatters ore farther from the vein.
const veinSolidContactTolerance = 2.5; // Drill mining surface tolerance after collision has pushed the tool out.
const veinCollisionIterations = 3; // Repeated passes keep vehicle/tool from sinking through solid segments.
const drillBiteTangentialRetention = 0.08; // Fraction of slide kept while Drill bites. Lower feels more locked/stalled.
const drillBiteMaxTangentialCorrection = 14; // Max per-frame anti-slide correction. Higher locks harder but can snap.
const drillBiteSurfaceBias = 0.35; // Tiny inward bias during bite so the tip keeps contact after anti-slide correction.
const drillBiteMaxSurfaceCorrection = 6; // Caps bite surface pinning. Higher can feel sticky; lower can lose contact.
const drillBiteShakeAmount = 0.35; // Render-only body shake while biting the vein surface.
const hammerHitCooldown = 0.42; // Seconds between Hammer hits. Lower hits faster and can deplete veins too quickly.
const hammerDamagePerHit = 0.55; // Integrity removed per Hammer hit before resistance. Higher means fewer hits per segment.
const hammerHitRadius = 46; // Burst hit area around the Hammer head. Higher can affect more nearby vein segments.
const hammerAffectedSegments = 2; // Max segments damaged by one Hammer hit. Higher makes multi-burst easier.
const hammerBurstScatterRadius = 34; // Ore spawn spread on Hammer depletion. Higher makes the burst wider.
const hammerBurstSpeedMin = 34; // Minimum outward burst speed; keep modest so ore remains scoopable.
const hammerBurstSpeedMax = 78; // Maximum outward burst speed; must stay below maxMineralSpeed for stability.
const hammerBurstShakeAmount = 0.32; // Mild body shake on Hammer impact. Visual only; does not change controls.
const hammerBurstParticleBase = 6; // Base debug dust/spark count for Hammer burst feedback.
const hammerTargetHighlightDuration = 0.18; // Seconds Hammer-hit segments stay highlighted after a hit.

const corridorWidthMultiplier = 1.3; // P1-D rule: minCorridorWidth = max(vehicleWidth, activeToolWidth) * this.
const corridorExtraClearance = 18; // Extra room above the minimum so the corner tests reversing, not pixel parking.
const corridorWallThickness = 24; // Debug wall thickness for the P1-D corridor/corner test area.
const corridorCollisionIterations = 4; // Repeated passes keep vehicle/tool probes from sinking into debug walls.

const wallBounceFactor = 0.22; // Mineral bounce after hitting world walls. Lower feels heavier.
const wallContactTolerance = 3; // Distance treated as near-wall for stuck checks.
const stuckFrameThreshold = 24; // Frames before a slow near-wall mineral gets unstuck assistance.
const stuckCorrectionForce = 42; // Small inward nudge for stuck loose minerals near walls.

const mineralCounterForceToVehicle = 0; // Ore-to-vehicle knockback. Keep 0 for stable P0 driving.
const overloadMineralCountThreshold = 8; // Loose/candidate load count before the vehicle starts feeling heavy.
const overloadSpeedPenalty = 0.38; // Max slowdown from overload. Higher makes heavy piles slow the vehicle more.
const overloadShakeAmount = 0.45; // Visual shake when overloaded. Higher is more obvious.
const maxVehicleKnockback = 0; // Vehicle knockback cap from minerals. Keep 0 unless testing recoil.

const crusherSellRadius = 46; // Vehicle/scoop range that starts secured-ore unloading at the side crusher.
const crusherProcessingPitWidth = 78; // Visual width of the embedded crusher pit.
const crusherProcessingPitHeight = 50; // Visual height of the embedded crusher pit.
const crusherSmallLoadRatioMax = 0.5; // Up to this loadRatio counts as a small unload.
const crusherMediumLoadRatioMax = 0.7; // Up to this loadRatio counts as a medium unload.
const crusherLargeLoadRatioMax = 0.95; // Up to this loadRatio counts as a large unload.
const crusherSmallUnloadDurationMin = 0.2; // Empty-to-small load lower bound; keeps tiny unloads snappy.
const crusherSmallUnloadDurationMax = 0.35; // Small load upper bound for 0% to 50% full.
const crusherMediumUnloadDurationMax = 0.6; // Medium load upper bound for 50% to 70% full.
const crusherLargeUnloadDurationMax = 0.8; // Large load upper bound for 70% to 95% full.
const crusherFullUnloadDuration = 1.0; // Near-full and full load duration, also the hard unload cap.
const crusherProcessingDurationMin = 1.0; // Small loads still get a visible crush cycle.
const crusherProcessingDurationMax = 3.0; // Background processing cap for very large future loads.
const crusherMaxCoinParticles = 28; // Visual coin burst cap; large payouts group value per particle.
const crusherCoinFlightDuration = 0.68; // Coin travel time toward the top Coins HUD.
const crusherRollerBaseSpin = 2.2; // Idle roller motion; higher makes the sell point feel more mechanical.
const crusherRollerActiveSpin = 11; // Active processing roller motion; higher feels more energetic.
const upgradeCost = 20; // Coins required for the temporary push-power upgrade.
const upgradedPushForceMultiplier = 2.2; // Upgrade multiplier for pushForce. Higher makes upgraded shove stronger.
const upgradedBladeWidthBonus = 10; // Extra scoop width after upgrade. Higher catches a wider pile.

// P0.3 capture is deliberately conservative: most of the circle must sit in the
// scoop for a short dwell before it becomes stable carried ore.
const maxScoopCapacity = 20; // Logic-only secured ore capacity. Higher lets the scoop carry more visible rocks.
const captureInsideThreshold = 7 / 9; // Required sample ratio inside load zone. Higher makes capture stricter.
const captureDwellTime = 0.12; // Seconds a candidate must stay mostly inside before becoming secured.
const captureCandidateResetThreshold = 5 / 9; // Below this ratio, candidate progress resets to loose ore.

// These values affect only the visible wobble of secured ore. They should sell
// the fantasy of a loose pile settling in the scoop, not pull rocks inward.
const securedOreSloshAmount = 0.12; // How much secured ore visually lags behind scoop motion.
const securedOreSettleSpeed = 34; // How quickly secured ore settles back near its captured local position.
const securedOreRandomOffset = 2.4; // Capture-time random offset so secured rocks do not form a neat pattern.
const securedOreLocalDamping = 0.82; // Damps secured slosh velocity. Lower settles faster; higher feels looser.
const securedOreMaxVisualOffset = 5.5; // Max secured visual slosh from captured position.
const securedOreJitterAmount = 0.65; // Render-only micro jitter to keep the pile organic.

// P0.5 data tables keep the current single playable option, but make the
// future extension seams explicit before P1 adds more content.
const ORE_TYPES = {
  basicOre: {
    id: "basicOre",
    displayName: "Basic Ore",
    radius: 7,
    mass: 1,
    pushResistance: 1,
    requiredPush,
    saturationPush,
    maxPushSpeed,
    scoopFriction: scoopFrictionInside,
    capacityCost: 1,
    baseCoins: 1,
    baseSpecialCurrency: 0,
    color: "#c9b26b",
    strokeColor: "#7e6a38",
    highlightColor: "rgba(255, 255, 255, 0.28)",
    particleColor: "#c9b26b",
    dustColor: "#b8954f",
    tags: [],
  },
};

const DEFAULT_ORE_TYPE = ORE_TYPES.basicOre;

const VEHICLE_CHASSIS = {
  prototypeHauler: {
    id: "prototypeHauler",
    displayName: "Prototype Hauler",
    speed: vehicleSpeed,
    radius: 15,
    bodyRadius: 12,
    reverseDotThreshold,
    reverseSpeedMultiplier,
  },
};

const VEHICLE_SKINS = {
  orangePrototype: {
    id: "orangePrototype",
    displayName: "Orange Prototype",
    bodyFill: "#cf6a3c",
    bodyStroke: "#52291e",
    cabinFill: "#35464a",
    treadFill: "#243136",
  },
};

const BLADE_TYPES = {
  // Default blade is a passive solid scoop: no magnetism, no one-way lips, no
  // hidden storage behavior. Future blade variants should live beside this
  // data object instead of being folded into vehicle movement.
  scoopBlade: {
    id: "scoopBlade",
    displayName: "Default Scoop Blade",
    shape: "uScoop",
    width: bladeWidth,
    length: bladeLength,
    capacity: maxScoopCapacity,
    lipThickness: bladeLipThickness,
    captureRules: {
      insideThreshold: captureInsideThreshold,
      dwellTime: captureDwellTime,
      resetThreshold: captureCandidateResetThreshold,
    },
    lipCollision: {
      innerBackLipThickness,
      innerBackLipFriction,
      innerBackLipPushForce,
      sideLipThickness,
      sideLipRestitution,
      sideLipFriction,
    },
    specialAssist: {
      centerPullForce,
      scoopMagnetForce,
      sideLipInwardForce,
      sideInwardAttractionForce,
      maxAssistDisplacementPerFrame,
    },
    allowedOreTags: [],
    surfaceAlpha: bladeSurfaceAlpha,
  },
};

const TOOL_TYPES = {
  scoop: {
    id: "scoop",
    displayName: "Scoop",
    switchKey: "1",
    behaviorType: "scoopSecure",
    visualShape: "scoop",
    bladeType: BLADE_TYPES.scoopBlade,
  },
  drill: {
    id: "drill",
    displayName: "Drill",
    switchKey: "2",
    behaviorType: "pushOnly",
    visualShape: "drill",
    width: 28,
    length: 46,
    boundaryThickness: 10,
    fillColor: "#607b82",
    strokeColor: "#d5dedb",
    accentColor: "#d9b35c",
    contactRestitution: pushOnlyToolRestitution,
    contactFriction: pushOnlyToolFriction,
  },
  hammer: {
    id: "hammer",
    displayName: "Hammer",
    switchKey: "3",
    behaviorType: "pushOnly",
    visualShape: "hammer",
    width: 46,
    length: 36,
    boundaryThickness: 12,
    fillColor: "#74665e",
    strokeColor: "#e1d2b7",
    accentColor: "#b86b4b",
    contactRestitution: pushOnlyToolRestitution,
    contactFriction: pushOnlyToolFriction,
  },
};

const TOOL_KEY_BINDINGS = Object.values(TOOL_TYPES).reduce((bindings, tool) => {
  bindings[tool.switchKey] = tool.id;
  return bindings;
}, {});

const VEIN_CONFIG_VERSION = 2;

const VEIN_DEFS = {
  testThreeSegmentVein: {
    configVersion: VEIN_CONFIG_VERSION,
    id: "testThreeSegmentVein",
    displayName: "Test Vein",
    placement: {
      centerX: 540,
      centerY: 360,
      segmentSpacing: 44,
      angle: -0.18,
    },
    segment: {
      segmentCount: 3,
      totalIntegrity: 3,
      segmentIntegrity: 1,
      finishThreshold: veinFinishThreshold,
      visualStateThresholds: {
        cracked: 0.67,
        heavyCracked: 0.34,
      },
      solidRadius: 25,
      hitRadius: 30,
    },
    yield: {
      baseYield: 12,
      yieldMultiplier: 1,
    },
    oreOutput: {
      oreType: DEFAULT_ORE_TYPE,
      oreTypeWeights: { basicOre: 1 },
      spawnScatterRadius: veinSpawnScatterRadius,
    },
    drill: {
      resistance: 1,
      damagePerSecond: drillIntegrityDamagePerSecond,
      pressureThreshold: drillPressureThreshold,
      contactTolerance: veinSolidContactTolerance,
      collisionIterations: veinCollisionIterations,
      biteTangentialRetention: drillBiteTangentialRetention,
      biteMaxTangentialCorrection: drillBiteMaxTangentialCorrection,
      biteSurfaceBias: drillBiteSurfaceBias,
      biteMaxSurfaceCorrection: drillBiteMaxSurfaceCorrection,
      biteShakeAmount: drillBiteShakeAmount,
    },
    hammer: {
      resistance: 1,
      damagePerHit: hammerDamagePerHit,
      hitCooldown: hammerHitCooldown,
      hitRadius: hammerHitRadius,
      affectedSegments: hammerAffectedSegments,
      burstScatterRadius: hammerBurstScatterRadius,
      burstSpeedMin: hammerBurstSpeedMin,
      burstSpeedMax: hammerBurstSpeedMax,
      burstShakeAmount: hammerBurstShakeAmount,
    },
    respawn: {
      enabled: false,
      respawnSeconds: null,
      timeSource: "none",
    },
  },
};

const CRUSHER_TYPES = {
  embeddedGroundCrusher: {
    id: "embeddedGroundCrusher",
    displayName: "Embedded Ground Crusher",
    coinMultiplier: 1,
    specialCurrencyMultiplier: 1,
    oreMultipliers: {
      default: { coinMultiplier: 1, specialCurrencyMultiplier: 1 },
    },
  },
};

const UPGRADE_DEFS = {
  pushPower1: {
    id: "pushPower1",
    displayName: "Push Power Upgrade",
    costs: {
      coins: upgradeCost,
      specialCurrency: 0,
    },
    // P0 only requires coins. Future requirements can add numeric levels,
    // unlockedUpgrades, or unlockFlags without changing the buy button flow.
    requirements: {
      unlockedUpgrades: [],
      unlockFlags: [],
    },
    effects: [
      { target: "chassis.pushPower", op: "multiply", value: upgradedPushForceMultiplier },
      { target: "blade.width", op: "add", value: upgradedBladeWidthBonus },
      { target: "blade.capacity", op: "add", value: 0 },
      { target: "crusher.processingSpeed", op: "multiply", value: 1 },
      { target: "rewards.coins", op: "multiply", value: 1 },
    ],
  },
};

const activeVehicleChassis = VEHICLE_CHASSIS.prototypeHauler;
const activeVehicleSkin = VEHICLE_SKINS.orangePrototype;
const activeCrusherType = CRUSHER_TYPES.embeddedGroundCrusher;
const activeUpgradeDef = UPGRADE_DEFS.pushPower1;
MAP_CONFIG.collisionZones = createCorridorTestCollisionZones();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const coinsEl = document.getElementById("coins");
const collectedEl = document.getElementById("collected");
const pushStateEl = document.getElementById("pushState");
const scoopStateEl = document.getElementById("scoopState");
const messageEl = document.getElementById("message");
const upgradeButton = document.getElementById("upgradeButton");
const resetButton = document.getElementById("resetButton");

// Canvas dimensions are the screen viewport; world dimensions are the larger
// P1-A test map. Gameplay objects stay in world coordinates and camera handles
// the screen transform.
const viewport = {
  width: canvas.width,
  height: canvas.height,
};

const world = {
  x: MAP_CONFIG.worldBounds.x,
  y: MAP_CONFIG.worldBounds.y,
  width: MAP_CONFIG.worldBounds.width,
  height: MAP_CONFIG.worldBounds.height,
  wall: MAP_CONFIG.wallThickness,
  boundaryMode: MAP_CONFIG.boundaryMode,
  collisionZones: MAP_CONFIG.collisionZones,
};

const camera = {
  x: 0,
  y: 0,
  zoom: CAMERA_CONFIG.zoom,
};

// The crusher sits off the main vertical traffic path so selling is deliberate
// but still reachable as a quick side unload bay.
const crusher = {
  type: activeCrusherType,
  x: getPlayableBounds().minX + 66,
  y: getWorldBounds().y + 108,
  sellRadius: crusherSellRadius,
  pitWidth: crusherProcessingPitWidth,
  pitHeight: crusherProcessingPitHeight,
};

// Vehicle position, facing, and motion. bodyRadius is the physical body contact
// size; radius is the larger drawn/footprint size used by wall clamping.
const vehicle = {
  x: getWorldCenterX(),
  y: getWorldBottomY(78),
  chassis: activeVehicleChassis,
  skin: activeVehicleSkin,
  radius: activeVehicleChassis.radius,
  bodyRadius: activeVehicleChassis.bodyRadius,
  dirX: 0,
  dirY: -1,
  isReversing: false,
  overloadShake: 0,
  vx: 0,
  vy: 0,
};

// Pointer control stores the drag gesture used as a virtual joystick.
const pointerControl = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
};

const keys = new Set();
const completionTarget = Math.ceil(mineralCount * 0.8); // Win/checkpoint target. Raising mineralCount raises this too.
let minerals = []; // All visible ore objects, including loose, secured, and delivery animation states.
let particles = []; // Short-lived dust, spark, and flying coin feedback; visual only.
let coins = 0; // Spendable currency shown in the HUD and used by the upgrade button.
let collected = 0; // Total delivered ore count for progress display/completion.
let upgraded = false; // One-shot P0 upgrade flag for push power and blade width.
let complete = false; // Completion banner flag once collected reaches completionTarget.
let lastTime = 0; // Previous animation timestamp for delta-time physics.
let pushingCount = 0; // Number of loose/candidate minerals currently contacting the scoop lips.
let currentSecuredOre = 0; // Secured load in capacity units, displayed as Scoop: current/blade capacity.
let veins = []; // P1-C segmented ore veins. Segments spawn normal loose ore when drilled.
let crusherBatches = []; // Background crusher jobs created after fast unload.
let nextCrusherBatchId = 1; // Stable id so delivered ore can notify its processing batch.
let crusherRollerSpin = 0; // Visual rotation phase for the dual crusher shafts.
let crusherLoopSoundActive = false; // Placeholder sound state to avoid repeated loop-start hooks.
let activeTool = TOOL_TYPES.scoop; // P1-B active tool state. Only Scoop has gameplay behavior for now.
let toolDebugNotice = ""; // Short screen-fixed debug feedback such as blocked switching.
let toolDebugNoticeTimer = 0; // Seconds remaining before the tool debug notice disappears.
let activeDrillTarget = null; // Current drilled segment for visual highlight; null when Drill pressure is not applied.
let activeDrillBite = null; // Current Drill surface lock. Exists only during valid contact + pressure.
let activeHammerTargets = []; // Recent Hammer-hit segments for short debug highlighting.
let hammerTargetHighlightTimer = 0; // Seconds remaining for Hammer segment highlights.
let hammerHitCooldownTimer = 0; // Prevents Hammer overlap from applying damage every frame.
let lastControlInput = { active: false, x: 0, y: -1, strength: 0 }; // Cached input for Drill pressure checks after movement.

function resetGame() {
  vehicle.x = getWorldCenterX();
  vehicle.y = getWorldBottomY(78);
  vehicle.dirX = 0;
  vehicle.dirY = -1;
  vehicle.isReversing = false;
  vehicle.overloadShake = 0;
  vehicle.vx = 0;
  vehicle.vy = 0;
  veins = createVeins();
  minerals = createMinerals();
  particles = [];
  crusherBatches = [];
  nextCrusherBatchId = 1;
  crusherRollerSpin = 0;
  crusherLoopSoundActive = false;
  activeTool = TOOL_TYPES.scoop;
  toolDebugNotice = "";
  toolDebugNoticeTimer = 0;
  activeDrillTarget = null;
  activeDrillBite = null;
  activeHammerTargets = [];
  hammerTargetHighlightTimer = 0;
  hammerHitCooldownTimer = 0;
  lastControlInput = { active: false, x: vehicle.dirX, y: vehicle.dirY, strength: 0 };
  coins = 0;
  collected = 0;
  upgraded = false;
  complete = false;
  pushingCount = 0;
  currentSecuredOre = 0;
  lastTime = performance.now();
  resetCameraToVehicle();
  messageEl.textContent = "Scoop ore, then unload at the side crusher.";
  canvas.focus();
  updateHud();
}

function createMinerals() {
  const spawned = [];
  let attempts = 0;
  const spawnXBounds = getPlayableBounds(28);
  const spawnYBounds = getPlayableBounds(44);

  while (spawned.length < mineralCount && attempts < mineralCount * 80) {
    attempts += 1;
    const oreType = DEFAULT_ORE_TYPE;
    // Each mineral keeps both physics data and P0.3 scoop-state data. The
    // secured/delivery fields stay dormant while the mineral is loose.
    const mineral = createLooseMineral(
      random(spawnXBounds.minX, spawnXBounds.maxX),
      random(crusher.y + crusher.sellRadius + 42, spawnYBounds.maxY),
      oreType
    );

    const awayFromVehicle = distance(mineral.x, mineral.y, vehicle.x, vehicle.y) > 56;
    const awayFromMinerals = spawned.every((other) => distance(mineral.x, mineral.y, other.x, other.y) > mineral.radius * 2.6);
    const awayFromVeins = isMineralAwayFromVeins(mineral);
    const awayFromCollisionZones = isMineralAwayFromCollisionZones(mineral);

    if (awayFromVehicle && awayFromMinerals && awayFromVeins && awayFromCollisionZones) {
      spawned.push(mineral);
    }
  }

  return spawned;
}

function isMineralAwayFromVeins(mineral) {
  return veins.every((vein) => {
    return vein.segments.every((segment) => {
      const safeDistance = segment.solidBody.radius + mineral.radius + 18;
      return distance(mineral.x, mineral.y, segment.x, segment.y) > safeDistance;
    });
  });
}

function isMineralAwayFromCollisionZones(mineral) {
  return world.collisionZones.every((zone) => !getCircleRectContact(mineral, zone, 4));
}

function createLooseMineral(x, y, oreType = DEFAULT_ORE_TYPE) {
  // Vein-spawned ore uses the exact same object shape as reset-spawned ore, so
  // it naturally enters the loose -> Scoop -> crusher loop.
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: oreType.radius,
    shake: 0, // Visual hit feedback timer.
    stuckFrames: 0, // Counts slow near-wall frames before unstuck correction.
    containedInScoop: false, // Loose-ore stability hint, not secured capacity.
    containGrace: 0, // Hysteresis countdown after briefly leaving the scoop area.
    state: mineralState.looseOre, // Main lifecycle: loose -> candidate -> secured -> delivered.
    captureDwell: 0, // Seconds spent mostly inside the scoop load zone.
    insideRatio: 0, // Last 9-point inside score, used for capture priority/debugging.
    securedLocalX: 0, // Captured x in blade-local space so ore rides with the moving scoop.
    securedLocalY: 0, // Captured y in blade-local space; preserves irregular pile placement.
    securedOffsetX: 0, // Visual slosh offset from captured local x.
    securedOffsetY: 0, // Visual slosh offset from captured local y.
    securedVx: 0, // Local slosh velocity x for secured ore.
    securedVy: 0, // Local slosh velocity y for secured ore.
    securedSeed: random(0, Math.PI * 2), // Per-rock phase so render jitter is not synchronized.
    deliveryAge: 0, // Seconds elapsed in visible unload animation.
    deliveryDuration: 0, // Total unload animation duration for this rock.
    deliveryStartX: 0, // World-space unload start x.
    deliveryStartY: 0, // World-space unload start y.
    deliveryTargetX: 0, // World-space crusher pit target x.
    deliveryTargetY: 0, // World-space crusher pit target y.
    crusherBatchId: 0, // Processing batch notified when this ore reaches the pit.
    drawScale: 1, // Shrinks delivered ore as it flows into crusher.
    sourceVeinId: null,
    sourceSegmentId: null,
    type: oreType,
  };
}

function createVeins() {
  return [
    createVeinFromDef(VEIN_DEFS.testThreeSegmentVein),
  ];
}

function createVeinFromDef(def) {
  const config = migrateVeinDef(def);
  const finalYield = Math.floor(config.yield.baseYield * config.yield.yieldMultiplier);
  const assignedYields = distributeVeinYield(finalYield, config.segment.segmentCount);
  const centerOffset = (config.segment.segmentCount - 1) / 2;
  const dirX = Math.cos(config.placement.angle);
  const dirY = Math.sin(config.placement.angle);

  return {
    id: config.id,
    displayName: config.displayName,
    configVersion: config.configVersion,
    config,
    oreType: config.oreOutput.oreType,
    oreTypeWeights: config.oreOutput.oreTypeWeights,
    baseYield: config.yield.baseYield,
    yieldMultiplier: config.yield.yieldMultiplier,
    finalYield,
    respawn: config.respawn,
    segments: assignedYields.map((assignedYield, index) => {
      const offset = (index - centerOffset) * config.placement.segmentSpacing;
      const x = config.placement.centerX + dirX * offset;
      const y = config.placement.centerY + dirY * offset;
      return {
        id: `${config.id}-segment-${index + 1}`,
        index,
        x,
        y,
        maxIntegrity: config.segment.segmentIntegrity,
        integrity: config.segment.segmentIntegrity,
        assignedYield,
        spawnedOre: 0,
        visualState: "intact",
        depleted: false,
        finishThreshold: config.segment.finishThreshold,
        visualStateThresholds: config.segment.visualStateThresholds,
        drill: config.drill,
        hammer: config.hammer,
        oreOutput: config.oreOutput,
        solidBody: { x, y, radius: config.segment.solidRadius },
        mineArea: { x, y, radius: config.segment.hitRadius },
        hitArea: { x, y, radius: config.segment.hitRadius },
      };
    }),
  };
}

function migrateVeinDef(def) {
  // P1-C accepts both the old flat vein fields and the new nested config shape.
  // Future test veins should copy the nested shape in VEIN_DEFS, while this
  // migration keeps early prototype data from requiring a rewrite.
  const segmentCount = def.segment?.segmentCount ?? def.segmentCount ?? 1;
  const segmentIntegrity = def.segment?.segmentIntegrity
    ?? def.segmentIntegrity
    ?? ((def.segment?.totalIntegrity ?? def.totalIntegrity ?? segmentCount) / Math.max(segmentCount, 1));
  const totalIntegrity = def.segment?.totalIntegrity ?? def.totalIntegrity ?? segmentIntegrity * segmentCount;

  return {
    configVersion: def.configVersion ?? 1,
    id: def.id,
    displayName: def.displayName,
    placement: {
      centerX: def.placement?.centerX ?? def.centerX ?? getWorldCenterX(),
      centerY: def.placement?.centerY ?? def.centerY ?? getWorldCenterY(),
      segmentSpacing: def.placement?.segmentSpacing ?? def.segmentSpacing ?? 44,
      angle: def.placement?.angle ?? def.angle ?? 0,
    },
    segment: {
      segmentCount,
      totalIntegrity,
      segmentIntegrity,
      finishThreshold: def.segment?.finishThreshold ?? def.finishThreshold ?? veinFinishThreshold,
      visualStateThresholds: {
        cracked: def.segment?.visualStateThresholds?.cracked ?? 0.67,
        heavyCracked: def.segment?.visualStateThresholds?.heavyCracked ?? 0.34,
      },
      solidRadius: def.segment?.solidRadius ?? def.solidRadius ?? 25,
      hitRadius: def.segment?.hitRadius ?? def.hitRadius ?? 30,
    },
    yield: {
      baseYield: def.yield?.baseYield ?? def.baseYield ?? 0,
      yieldMultiplier: def.yield?.yieldMultiplier ?? def.yieldMultiplier ?? 1,
    },
    oreOutput: {
      oreType: resolveVeinOreType(def.oreOutput?.oreType ?? def.oreType ?? DEFAULT_ORE_TYPE),
      oreTypeWeights: def.oreOutput?.oreTypeWeights ?? getDefaultOreTypeWeights(def.oreOutput?.oreType ?? def.oreType ?? DEFAULT_ORE_TYPE),
      spawnScatterRadius: def.oreOutput?.spawnScatterRadius ?? def.spawnScatterRadius ?? veinSpawnScatterRadius,
    },
    drill: {
      resistance: def.drill?.resistance ?? def.drillResistance ?? 1,
      damagePerSecond: def.drill?.damagePerSecond ?? def.drillDamagePerSecond ?? drillIntegrityDamagePerSecond,
      pressureThreshold: def.drill?.pressureThreshold ?? def.pressureThreshold ?? drillPressureThreshold,
      contactTolerance: def.drill?.contactTolerance ?? def.contactTolerance ?? veinSolidContactTolerance,
      collisionIterations: def.drill?.collisionIterations ?? def.collisionIterations ?? veinCollisionIterations,
      biteTangentialRetention: def.drill?.biteTangentialRetention ?? def.drillBiteTangentialRetention ?? drillBiteTangentialRetention,
      biteMaxTangentialCorrection: def.drill?.biteMaxTangentialCorrection ?? def.drillBiteMaxTangentialCorrection ?? drillBiteMaxTangentialCorrection,
      biteSurfaceBias: def.drill?.biteSurfaceBias ?? def.drillBiteSurfaceBias ?? drillBiteSurfaceBias,
      biteMaxSurfaceCorrection: def.drill?.biteMaxSurfaceCorrection ?? def.drillBiteMaxSurfaceCorrection ?? drillBiteMaxSurfaceCorrection,
      biteShakeAmount: def.drill?.biteShakeAmount ?? def.drillBiteShakeAmount ?? drillBiteShakeAmount,
    },
    hammer: {
      resistance: def.hammer?.resistance ?? def.hammerResistance ?? 1,
      damagePerHit: def.hammer?.damagePerHit ?? def.hammerDamagePerHit ?? hammerDamagePerHit,
      hitCooldown: def.hammer?.hitCooldown ?? def.hammerHitCooldown ?? hammerHitCooldown,
      hitRadius: def.hammer?.hitRadius ?? def.hammerHitRadius ?? hammerHitRadius,
      affectedSegments: def.hammer?.affectedSegments ?? def.affectedSegments ?? hammerAffectedSegments,
      burstScatterRadius: def.hammer?.burstScatterRadius ?? def.hammerBurstScatterRadius ?? hammerBurstScatterRadius,
      burstSpeedMin: def.hammer?.burstSpeedMin ?? def.hammerBurstSpeedMin ?? hammerBurstSpeedMin,
      burstSpeedMax: def.hammer?.burstSpeedMax ?? def.hammerBurstSpeedMax ?? hammerBurstSpeedMax,
      burstShakeAmount: def.hammer?.burstShakeAmount ?? def.hammerBurstShakeAmount ?? hammerBurstShakeAmount,
    },
    respawn: {
      enabled: def.respawn?.enabled ?? false,
      respawnSeconds: def.respawn?.respawnSeconds ?? null,
      timeSource: def.respawn?.timeSource ?? "none",
    },
  };
}

function resolveVeinOreType(oreTypeOrId) {
  if (typeof oreTypeOrId === "string") return ORE_TYPES[oreTypeOrId] || DEFAULT_ORE_TYPE;
  return oreTypeOrId || DEFAULT_ORE_TYPE;
}

function getDefaultOreTypeWeights(oreTypeOrId) {
  const oreType = resolveVeinOreType(oreTypeOrId);
  return { [oreType.id]: 1 };
}

function distributeVeinYield(finalYield, segmentCount) {
  const base = Math.floor(finalYield / segmentCount);
  const remainder = finalYield - base * segmentCount;
  return Array.from({ length: segmentCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function update(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;

  updateVehicle(dt);
  updateVeins(dt);
  updateMinerals(dt);
  updateCrusherBatches(dt);
  updateParticles(dt);
  updateToolDebugNotice(dt);
  updateCamera(dt);
  draw();

  requestAnimationFrame(update);
}

function resetCameraToVehicle() {
  camera.zoom = getConfiguredCameraZoom();
  const target = getCameraTarget();
  camera.x = target.x;
  camera.y = target.y;
  clampCamera();
}

function updateCamera(dt) {
  camera.zoom = getConfiguredCameraZoom();
  const target = getCameraTarget();
  const alpha = 1 - Math.exp(-dt / CAMERA_CONFIG.followSmoothing);
  camera.x += (target.x - camera.x) * alpha;
  camera.y += (target.y - camera.y) * alpha;
  clampCamera();
}

function getCameraTarget() {
  return {
    x: vehicle.x - getCameraViewWidth() / 2,
    y: vehicle.y - getCameraViewHeight() / 2,
  };
}

function clampCamera() {
  if (!CAMERA_CONFIG.clampToMapBounds) return;
  const bounds = getWorldBounds();
  const maxX = bounds.x + Math.max(0, bounds.width - getCameraViewWidth());
  const maxY = bounds.y + Math.max(0, bounds.height - getCameraViewHeight());
  camera.x = clamp(camera.x, bounds.x, maxX);
  camera.y = clamp(camera.y, bounds.y, maxY);
}

function applyCameraTransform() {
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom,
    y: (y - camera.y) * camera.zoom,
  };
}

function getConfiguredCameraZoom() {
  return clamp(CAMERA_CONFIG.zoom, CAMERA_CONFIG.minZoom, CAMERA_CONFIG.maxZoom);
}

function getCameraViewWidth() {
  return viewport.width / camera.zoom;
}

function getCameraViewHeight() {
  return viewport.height / camera.zoom;
}

function getWorldBounds() {
  return MAP_CONFIG.worldBounds;
}

function getPlayableBounds(radius = 0) {
  // Rect mode is the only active P1-A boundary solver. Future irregular modes
  // should branch here so vehicle/mineral/camera code keeps a stable interface.
  const bounds = getWorldBounds();
  const inset = MAP_CONFIG.wallThickness + radius;
  return {
    minX: bounds.x + inset,
    maxX: bounds.x + bounds.width - inset,
    minY: bounds.y + inset,
    maxY: bounds.y + bounds.height - inset,
  };
}

function createCorridorTestCollisionZones() {
  const corridorWidth = getCorridorTestWidth();
  const passageX = 428;
  const startY = 610;
  const turnY = 770;
  const horizontalLength = 210;
  const wall = corridorWallThickness;

  // P1-D debug-only L corridor: open at the top and right so it checks
  // steering/reverse recovery without becoming a formal obstacle layout.
  return [
    {
      id: "p1d-corridor-left-wall",
      kind: "debugCorridorWall",
      x: passageX - wall,
      y: startY,
      width: wall,
      height: turnY + corridorWidth - startY,
    },
    {
      id: "p1d-corridor-right-wall",
      kind: "debugCorridorWall",
      x: passageX + corridorWidth,
      y: startY,
      width: wall,
      height: turnY - startY,
    },
    {
      id: "p1d-corridor-top-turn-wall",
      kind: "debugCorridorWall",
      x: passageX + corridorWidth,
      y: turnY - wall,
      width: horizontalLength,
      height: wall,
    },
    {
      id: "p1d-corridor-bottom-wall",
      kind: "debugCorridorWall",
      x: passageX,
      y: turnY + corridorWidth,
      width: corridorWidth + horizontalLength,
      height: wall,
    },
  ];
}

function getCorridorTestWidth() {
  const minCorridorWidth = getCorridorMinimumWidth(getMaxCorridorToolWidth());
  return Math.ceil(minCorridorWidth + corridorExtraClearance);
}

function getCorridorMinimumWidth(activeToolWidth = getCorridorToolWidth(activeTool)) {
  const vehicleWidth = getCorridorVehicleWidth();
  const comboWidth = Math.max(vehicleWidth, activeToolWidth);
  return comboWidth * corridorWidthMultiplier;
}

function getCorridorVehicleWidth() {
  return activeVehicleChassis.radius * 2;
}

function getMaxCorridorToolWidth() {
  return Math.max(
    getCorridorToolWidth(TOOL_TYPES.scoop),
    getCorridorToolWidth(TOOL_TYPES.drill),
    getCorridorToolWidth(TOOL_TYPES.hammer)
  );
}

function getCorridorToolWidth(tool) {
  if (tool.id === "scoop") {
    const blade = tool.bladeType;
    return blade.width + upgradedBladeWidthBonus + blade.lipCollision.sideLipThickness;
  }

  return tool.width + (tool.boundaryThickness || 0);
}

function getWorldCenterX() {
  const bounds = getWorldBounds();
  return bounds.x + bounds.width / 2;
}

function getWorldCenterY() {
  const bounds = getWorldBounds();
  return bounds.y + bounds.height / 2;
}

function getWorldBottomY(offset) {
  const bounds = getWorldBounds();
  return bounds.y + bounds.height - offset;
}

function updateVehicle(dt) {
  const input = getControlInput();
  lastControlInput = input;
  activeDrillBite = null;
  const movement = getVehicleMovementIntent(input);
  const scoopActive = isScoopToolActive();

  if (input.active && !movement.isReversing) {
    smoothFacing(input.x, input.y, dt);
  }
  vehicle.isReversing = movement.isReversing;

  const blade = getCurrentBladeConfig();
  const toolBoundary = getCurrentToolBoundaryConfig(blade);
  const currentLoad = input.active && scoopActive ? countScoopLoad(blade) : 0;
  const overload = getOverloadState(currentLoad);
  vehicle.overloadShake = overload.shake;

  const previousX = vehicle.x;
  const previousY = vehicle.y;
  const speedMultiplier = movement.speedMultiplier * overload.speedMultiplier;
  vehicle.x += movement.x * vehicle.chassis.speed * input.strength * speedMultiplier * dt;
  vehicle.y += movement.y * vehicle.chassis.speed * input.strength * speedMultiplier * dt;
  clampVehicleAndBladeToWalls(toolBoundary);
  resolveVehicleAndToolCollisionZones(toolBoundary);
  resolveVehicleAndToolVeinContacts(toolBoundary);
  applyDrillBiteLock(input, previousX, previousY, toolBoundary);
  clampVehicleAndBladeToWalls(toolBoundary);
  resolveVehicleAndToolCollisionZones(toolBoundary);
  vehicle.vx = (vehicle.x - previousX) / Math.max(dt, 0.001);
  vehicle.vy = (vehicle.y - previousY) / Math.max(dt, 0.001);

  separateVehicleBodyFromMinerals(dt);
  const bladeContactCount = scoopActive ? applyBladeLipCollisions(dt, blade, input.active) : 0;
  const toolContactCount = isPushOnlyToolActive() ? applyPushOnlyToolCollisions(dt, activeTool) : 0;
  pushingCount = input.active ? bladeContactCount : 0;
  if (!scoopActive && input.active) pushingCount = toolContactCount;
}

function getVehicleMovementIntent(input) {
  if (!input.active) {
    return { x: vehicle.dirX, y: vehicle.dirY, isReversing: false, speedMultiplier: 0 };
  }

  const dot = input.x * vehicle.dirX + input.y * vehicle.dirY;
  const isReversing = dot < vehicle.chassis.reverseDotThreshold;

  // Movement follows the player's input, while facing/blade direction only
  // updates outside strong reverse input. This lets the player back out without
  // forcing an automatic U-turn.
  return {
    x: input.x,
    y: input.y,
    isReversing,
    speedMultiplier: isReversing ? vehicle.chassis.reverseSpeedMultiplier : 1,
  };
}

function updateVeins(dt) {
  activeDrillTarget = null;
  updateHammerTargetHighlight(dt);
  hammerHitCooldownTimer = Math.max(0, hammerHitCooldownTimer - dt);

  if (isDrillToolActive()) {
    updateDrillVeinMining(dt);
  } else if (isHammerToolActive()) {
    updateHammerVeinMining(dt);
  }
}

function updateDrillVeinMining(dt) {
  if (!isDrillToolActive()) return;

  const drillAction = getActiveDrillAction(lastControlInput);
  if (!drillAction) return;

  const { vein, segment } = drillAction;
  const drillConfig = getSegmentDrillConfig(segment);
  const damagePerSecond = drillConfig.damagePerSecond / Math.max(drillConfig.resistance || 1, 0.001);
  activeDrillTarget = { veinId: vein.id, segmentId: segment.id };
  segment.integrity = clamp(segment.integrity - damagePerSecond * lastControlInput.strength * dt, 0, segment.maxIntegrity);
  updateVeinSegmentVisualState(segment);
  spawnProgressiveVeinOre(vein, segment);

  if (canAutoFinishVeinSegment(segment)) {
    finishVeinSegment(vein, segment);
  }
}

function updateHammerTargetHighlight(dt) {
  if (hammerTargetHighlightTimer <= 0) {
    activeHammerTargets = [];
    return;
  }

  hammerTargetHighlightTimer = Math.max(0, hammerTargetHighlightTimer - dt);
  if (hammerTargetHighlightTimer <= 0) activeHammerTargets = [];
}

function updateHammerVeinMining() {
  if (hammerHitCooldownTimer > 0) return;

  const hammerAction = getActiveHammerAction(lastControlInput);
  if (!hammerAction) return;

  const result = applyHammerVeinHit(hammerAction, lastControlInput);
  if (result.hitCount <= 0) return;

  hammerHitCooldownTimer = hammerAction.hitCooldown;
  activeHammerTargets = result.targets;
  hammerTargetHighlightTimer = hammerTargetHighlightDuration;
  vehicle.overloadShake = Math.max(vehicle.overloadShake, hammerAction.burstShakeAmount * lastControlInput.strength);

  const notice = result.burstOre > 0 ? `Hammer burst +${result.burstOre}` : `Hammer hit ${result.hitCount}`;
  showToolDebugNotice(notice, 0.35);
}

function getActiveHammerAction(input) {
  if (!input.active || input.strength <= 0 || !isHammerToolActive()) return null;

  const hitArea = getHammerHitAreaWorldPosition(activeTool);
  const hits = [];

  for (const vein of veins) {
    for (const segment of vein.segments) {
      if (!isVeinSegmentSolid(segment)) continue;

      const hammerConfig = getSegmentHammerConfig(segment);
      const dx = segment.solidBody.x - hitArea.x;
      const dy = segment.solidBody.y - hitArea.y;
      const distanceToSegment = Math.hypot(dx, dy);
      const hitRadius = hammerConfig.hitRadius ?? hammerHitRadius;
      const overlapDistance = hitRadius + segment.solidBody.radius;
      if (distanceToSegment > overlapDistance) continue;

      hits.push({
        vein,
        segment,
        hammerConfig,
        distanceToSegment,
        overlapDepth: overlapDistance - distanceToSegment,
      });
    }
  }

  if (hits.length === 0) return null;

  hits.sort((a, b) => {
    const overlapDiff = b.overlapDepth - a.overlapDepth;
    if (Math.abs(overlapDiff) > 0.001) return overlapDiff;
    return a.distanceToSegment - b.distanceToSegment;
  });

  const primaryConfig = hits[0].hammerConfig;
  const affectedCount = Math.max(1, primaryConfig.affectedSegments || hammerAffectedSegments);
  return {
    hits: hits.slice(0, affectedCount),
    hitCooldown: primaryConfig.hitCooldown ?? hammerHitCooldown,
    burstShakeAmount: primaryConfig.burstShakeAmount ?? hammerBurstShakeAmount,
  };
}

function applyHammerVeinHit(action, input) {
  const depletedHits = [];
  const targets = [];
  let burstOre = 0;

  for (const hit of action.hits) {
    const { vein, segment, hammerConfig } = hit;
    const damage = (hammerConfig.damagePerHit ?? hammerDamagePerHit) / Math.max(hammerConfig.resistance || 1, 0.001);
    segment.integrity = clamp(segment.integrity - damage * input.strength, 0, segment.maxIntegrity);
    updateVeinSegmentVisualState(segment);
    targets.push({ veinId: vein.id, segmentId: segment.id });

    if (segment.integrity <= 0 && !segment.depleted) {
      depletedHits.push(hit);
    }
  }

  // Hammer does not progressively spawn ore. Segments that reach zero in this
  // single hit release their remaining assigned yield together as one burst.
  for (const hit of depletedHits) {
    const spawned = finishVeinSegment(hit.vein, hit.segment, {
      burst: true,
      scatterRadius: hit.hammerConfig.burstScatterRadius ?? hammerBurstScatterRadius,
      speedMin: hit.hammerConfig.burstSpeedMin ?? hammerBurstSpeedMin,
      speedMax: hit.hammerConfig.burstSpeedMax ?? hammerBurstSpeedMax,
    });
    burstOre += spawned;
    spawnHammerBurstParticles(hit.segment, hit.hammerConfig, spawned);
  }

  return { hitCount: action.hits.length, burstOre, targets };
}

function getActiveDrillAction(input) {
  if (!input.active || input.strength <= 0 || !isDrillToolActive()) return null;

  const drillTip = getDrillTipWorldPosition();
  let bestAction = null;

  for (const vein of veins) {
    for (const segment of vein.segments) {
      if (!isVeinSegmentSolid(segment)) continue;
      const surfaceContact = getDrillSegmentSurfaceContact(segment);
      if (!surfaceContact) continue;

      const dx = segment.mineArea.x - drillTip.x;
      const dy = segment.mineArea.y - drillTip.y;
      const distanceToSegment = Math.hypot(dx, dy);
      const directionToSegment = distanceToSegment > 0.001
        ? { x: dx / distanceToSegment, y: dy / distanceToSegment }
        : { x: vehicle.dirX, y: vehicle.dirY };
      const pressureDot = input.x * directionToSegment.x + input.y * directionToSegment.y;
      if (pressureDot < getSegmentDrillConfig(segment).pressureThreshold) continue;

      const score = pressureDot * 1000 + surfaceContact.depth;
      if (!bestAction || score > bestAction.score) {
        bestAction = { vein, segment, drillTip, pressureDot, directionToSegment, surfaceContact, score };
      }
    }
  }

  return bestAction;
}

function applyDrillBiteLock(input, previousX, previousY, toolBoundary) {
  activeDrillBite = null;
  const action = getActiveDrillAction(input);
  if (!action) return { active: false, x: 0, y: 0 };

  // Solid circular vein collision can otherwise let the Drill slide sideways
  // around the curve. During valid pressure, keep only a small fraction of this
  // frame's tangential movement so the tool feels like it bites into the face.
  const drillConfig = getSegmentDrillConfig(action.segment);
  const tangent = getDrillBiteTangent(action.directionToSegment);
  const moveX = vehicle.x - previousX;
  const moveY = vehicle.y - previousY;
  const tangentialMove = moveX * tangent.x + moveY * tangent.y;
  const correctionMagnitude = clamp(
    -tangentialMove * (1 - drillConfig.biteTangentialRetention),
    -drillConfig.biteMaxTangentialCorrection,
    drillConfig.biteMaxTangentialCorrection
  );
  const x = tangent.x * correctionMagnitude;
  const y = tangent.y * correctionMagnitude;
  vehicle.x += x;
  vehicle.y += y;

  keepDrillBiteOnSurface(action.segment, drillConfig);
  resolveVehicleAndToolVeinContacts(toolBoundary);
  const lockedAction = getActiveDrillAction(input);
  if (!lockedAction) return { active: false, x, y };

  const tip = getDrillTipWorldPosition();
  activeDrillBite = {
    veinId: lockedAction.vein.id,
    segmentId: lockedAction.segment.id,
    x: tip.x,
    y: tip.y,
    pressureDot: lockedAction.pressureDot,
  };
  vehicle.overloadShake = Math.max(vehicle.overloadShake, drillConfig.biteShakeAmount * input.strength);
  return { active: true, x, y };
}

function getDrillBiteTangent(directionToSegment) {
  return {
    x: -directionToSegment.y,
    y: directionToSegment.x,
  };
}

function keepDrillBiteOnSurface(segment, drillConfig = getSegmentDrillConfig(segment)) {
  const tip = getDrillTipColliderWorldPosition(TOOL_TYPES.drill);
  const solid = segment.solidBody;
  const dx = tip.x - solid.x;
  const dy = tip.y - solid.y;
  const distanceBetween = Math.hypot(dx, dy);
  if (distanceBetween <= 0.001) return { x: 0, y: 0 };

  const desiredDistance = solid.radius + tip.radius - drillConfig.biteSurfaceBias;
  const correctionDistance = clamp(
    desiredDistance - distanceBetween,
    -drillConfig.biteMaxSurfaceCorrection,
    drillConfig.biteMaxSurfaceCorrection
  );
  const normalX = dx / distanceBetween;
  const normalY = dy / distanceBetween;
  const x = normalX * correctionDistance;
  const y = normalY * correctionDistance;
  vehicle.x += x;
  vehicle.y += y;
  return { x, y };
}

function getDrillTipColliderWorldPosition(tool = TOOL_TYPES.drill) {
  const tipCollider = getDrillToolColliders(tool).find((collider) => collider.kind === "drillTip");
  const tip = bladeLocalToWorld(tipCollider.cx, tipCollider.cy);
  return { x: tip.x, y: tip.y, radius: tipCollider.radius };
}

function spawnProgressiveVeinOre(vein, segment) {
  const damageProgress = 1 - getVeinSegmentIntegrityRatio(segment);
  const targetSpawned = Math.floor(segment.assignedYield * damageProgress);
  const newOreToSpawn = targetSpawned - segment.spawnedOre;
  if (newOreToSpawn > 0) spawnVeinOre(vein, segment, newOreToSpawn);
}

function canAutoFinishVeinSegment(segment) {
  return getVeinSegmentIntegrityRatio(segment) <= segment.finishThreshold && segment.visualState === "heavy_cracked";
}

function finishVeinSegment(vein, segment, spawnOptions = {}) {
  const spawned = spawnVeinOre(vein, segment, segment.assignedYield - segment.spawnedOre, spawnOptions);
  segment.integrity = 0;
  segment.depleted = true;
  updateVeinSegmentVisualState(segment);
  return spawned;
}

function spawnVeinOre(vein, segment, requestedCount, spawnOptions = {}) {
  const segmentRemaining = Math.max(0, segment.assignedYield - segment.spawnedOre);
  const veinRemaining = Math.max(0, vein.finalYield - getVeinSpawnedOre(vein));
  const spawnCount = Math.min(requestedCount, segmentRemaining, veinRemaining);
  if (spawnCount <= 0) return 0;

  for (let i = 0; i < spawnCount; i += 1) {
    const oreType = pickVeinOreType(vein);
    const position = getVeinOreSpawnPosition(segment, oreType.radius, spawnOptions);
    const mineral = createLooseMineral(position.x, position.y, oreType);
    const velocity = getVeinOreSpawnVelocity(position, oreType.radius, spawnOptions);
    mineral.sourceVeinId = vein.id;
    mineral.sourceSegmentId = segment.id;
    mineral.shake = spawnOptions.burst ? 0.32 : 0.18;
    mineral.vx = velocity.x;
    mineral.vy = velocity.y;
    minerals.push(mineral);
  }

  segment.spawnedOre += spawnCount;
  updateVeinSegmentVisualState(segment);
  return spawnCount;
}

function getVeinOreSpawnPosition(segment, mineralRadius, spawnOptions = {}) {
  const angle = random(0, Math.PI * 2);
  const scatterRadius = spawnOptions.scatterRadius ?? segment.oreOutput.spawnScatterRadius;
  const distanceFromCenter = segment.hitArea.radius + mineralRadius + random(2, scatterRadius);
  const outwardX = Math.cos(angle);
  const outwardY = Math.sin(angle);
  const bounds = getPlayableBounds(mineralRadius);

  return {
    x: clamp(segment.x + outwardX * distanceFromCenter, bounds.minX, bounds.maxX),
    y: clamp(segment.y + outwardY * distanceFromCenter, bounds.minY, bounds.maxY),
    outwardX,
    outwardY,
  };
}

function getVeinOreSpawnVelocity(position, mineralRadius, spawnOptions = {}) {
  const burst = Boolean(spawnOptions.burst);
  const speedMin = burst ? (spawnOptions.speedMin ?? hammerBurstSpeedMin) : 12;
  const speedMax = burst ? (spawnOptions.speedMax ?? hammerBurstSpeedMax) : 30;
  const speed = random(speedMin, speedMax);
  let x = position.outwardX * speed + random(-8, 8);
  let y = position.outwardY * speed + random(-8, 8);
  const capped = capVector(x, y, maxMineralSpeed * (burst ? 0.86 : 0.55));
  x = capped.x;
  y = capped.y;

  const bounds = getPlayableBounds(mineralRadius);
  if (position.x <= bounds.minX + 1 && x < 0) x = Math.abs(x);
  if (position.x >= bounds.maxX - 1 && x > 0) x = -Math.abs(x);
  if (position.y <= bounds.minY + 1 && y < 0) y = Math.abs(y);
  if (position.y >= bounds.maxY - 1 && y > 0) y = -Math.abs(y);

  return { x, y };
}

function getVeinSpawnedOre(vein) {
  return vein.segments.reduce((total, segment) => total + segment.spawnedOre, 0);
}

function pickVeinOreType(vein) {
  const weights = vein.oreTypeWeights || getDefaultOreTypeWeights(vein.oreType);
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
  if (entries.length === 0 || totalWeight <= 0) return vein.oreType || DEFAULT_ORE_TYPE;

  let roll = random(0, totalWeight);
  for (const [oreTypeId, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return resolveVeinOreType(oreTypeId);
  }

  return resolveVeinOreType(entries[entries.length - 1][0]);
}

function getVeinRespawnConfig(vein) {
  // Interface only in P1-C: real respawn timing, server time, and offline
  // reward logic are deliberately not implemented yet.
  return vein.respawn || { enabled: false, respawnSeconds: null, timeSource: "none" };
}

function isVeinSegmentSolid(segment) {
  return !segment.depleted && segment.visualState !== "depleted";
}

function getSegmentDrillConfig(segment) {
  return segment.drill || getDefaultVeinDrillConfig();
}

function getDefaultVeinDrillConfig() {
  return {
    resistance: 1,
    damagePerSecond: drillIntegrityDamagePerSecond,
    pressureThreshold: drillPressureThreshold,
    contactTolerance: veinSolidContactTolerance,
    collisionIterations: veinCollisionIterations,
    biteTangentialRetention: drillBiteTangentialRetention,
    biteMaxTangentialCorrection: drillBiteMaxTangentialCorrection,
    biteSurfaceBias: drillBiteSurfaceBias,
    biteMaxSurfaceCorrection: drillBiteMaxSurfaceCorrection,
    biteShakeAmount: drillBiteShakeAmount,
  };
}

function getSegmentHammerConfig(segment) {
  return segment.hammer || getDefaultVeinHammerConfig();
}

function getDefaultVeinHammerConfig() {
  return {
    resistance: 1,
    damagePerHit: hammerDamagePerHit,
    hitCooldown: hammerHitCooldown,
    hitRadius: hammerHitRadius,
    affectedSegments: hammerAffectedSegments,
    burstScatterRadius: hammerBurstScatterRadius,
    burstSpeedMin: hammerBurstSpeedMin,
    burstSpeedMax: hammerBurstSpeedMax,
    burstShakeAmount: hammerBurstShakeAmount,
  };
}

function getVeinSegmentIntegrityRatio(segment) {
  return clamp(segment.integrity / Math.max(segment.maxIntegrity || 1, 0.001), 0, 1);
}

function updateVeinSegmentVisualState(segment) {
  if (segment.spawnedOre >= segment.assignedYield) {
    segment.depleted = true;
  }

  if (segment.depleted) {
    segment.visualState = "depleted";
  } else if (getVeinSegmentIntegrityRatio(segment) <= segment.visualStateThresholds.heavyCracked) {
    segment.visualState = "heavy_cracked";
  } else if (getVeinSegmentIntegrityRatio(segment) <= segment.visualStateThresholds.cracked) {
    segment.visualState = "cracked";
  } else {
    segment.visualState = "intact";
  }
}

function getControlInput() {
  const pointerInput = getPointerInput();
  if (pointerInput.active) return pointerInput;

  const keyboardInput = getKeyboardInput();
  if (keyboardInput.active) return keyboardInput;

  return { active: false, x: vehicle.dirX, y: vehicle.dirY, strength: 0 };
}

function getPointerInput() {
  if (!pointerControl.active) {
    return { active: false, x: 0, y: 0, strength: 0 };
  }

  const dx = pointerControl.currentX - pointerControl.startX;
  const dy = pointerControl.currentY - pointerControl.startY;
  const length = Math.hypot(dx, dy);

  if (length < inputDeadZone) {
    return { active: false, x: vehicle.dirX, y: vehicle.dirY, strength: 0 };
  }

  return {
    active: true,
    x: dx / length,
    y: dy / length,
    strength: clamp(length / joystickMaxRadius, 0, 1),
  };
}

function getKeyboardInput() {
  let x = 0;
  let y = 0;
  if (keys.has("arrowleft") || keys.has("a")) x -= 1;
  if (keys.has("arrowright") || keys.has("d")) x += 1;
  if (keys.has("arrowup") || keys.has("w")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s")) y += 1;

  if (x === 0 && y === 0) {
    return { active: false, x: 0, y: 0, strength: 0 };
  }

  const length = Math.hypot(x, y);
  return { active: true, x: x / length, y: y / length, strength: 1 };
}

function smoothFacing(targetX, targetY, dt) {
  const alpha = 1 - Math.exp(-dt / facingSmoothingTime);
  const x = vehicle.dirX + (targetX - vehicle.dirX) * alpha;
  const y = vehicle.dirY + (targetY - vehicle.dirY) * alpha;
  const length = Math.hypot(x, y) || 1;
  vehicle.dirX = x / length;
  vehicle.dirY = y / length;
}

function getOverloadState(count) {
  const overload = Math.max(0, count - overloadMineralCountThreshold);
  const normalizedLoad = clamp(overload / 12, 0, 1);
  const speedMultiplier = clamp(1 - normalizedLoad * overloadSpeedPenalty, 0.5, 1);
  const shake = normalizedLoad > 0.75 ? overloadShakeAmount * normalizedLoad : 0;
  return { speedMultiplier, shake };
}

function separateVehicleBodyFromMinerals(dt) {
  const body = { x: vehicle.x, y: vehicle.y, radius: vehicle.bodyRadius };

  for (const mineral of minerals) {
    if (!isPhysicalOre(mineral)) continue;
    const hit = getOverlap(body, mineral);
    if (!hit) continue;

    mineral.x += hit.x * hit.depth * 0.7;
    mineral.y += hit.y * hit.depth * 0.7;

    if (bodyMineralPushForce > 0) {
      mineral.vx += hit.x * bodyMineralPushForce * dt;
      mineral.vy += hit.y * bodyMineralPushForce * dt;
    }

    if (mineralCounterForceToVehicle > 0 && maxVehicleKnockback > 0) {
      const knockback = Math.min(hit.depth * mineralCounterForceToVehicle, maxVehicleKnockback);
      vehicle.x -= hit.x * knockback;
      vehicle.y -= hit.y * knockback;
      clampVehicleAndBladeToWalls(getCurrentBladeConfig());
    }

    resolveWallContact(mineral);
  }
}

function countScoopLoad(blade) {
  let count = 0;
  for (const mineral of minerals) {
    if (isMineralInScoopInfluence(mineral, blade)) count += 1;
  }
  return count;
}

function isMineralInScoopInfluence(mineral, blade) {
  if (mineral.state === mineralState.securedOre) return true;
  if (!isPhysicalOre(mineral)) return false;
  return getScoopLocalState(mineral, blade).nearScoop;
}

function isPhysicalOre(mineral) {
  return mineral.state === mineralState.looseOre || mineral.state === mineralState.captureCandidate;
}

function getMineralOreType(mineral) {
  return mineral.type || DEFAULT_ORE_TYPE;
}

function getMineralCapacityCost(mineral) {
  return getMineralOreType(mineral).capacityCost || 1;
}

function syncScoopLoadCount() {
  currentSecuredOre = minerals.reduce((count, mineral) => {
    return count + (mineral.state === mineralState.securedOre ? getMineralCapacityCost(mineral) : 0);
  }, 0);
}

function updateContainedState(mineral, blade) {
  const state = getScoopLocalState(mineral, blade);
  const clearlyExitedFront = state.local.x > state.bladeEnd + mineral.radius + containedStateHysteresis;
  const clearlyPastSide = Math.abs(state.local.y) > state.halfWidth + mineral.radius + sideEscapeMargin + containedStateHysteresis;
  const clearlyBehindBack = state.local.x < state.bladeStart - mineral.radius - containedStateHysteresis;

  // This hysteresis is a stability hint for loose ore near the scoop. It is not
  // a suction force and does not move minerals by itself.
  if (state.insideScoop) {
    mineral.containedInScoop = true;
    mineral.containGrace = containedStateHysteresis;
  } else if (clearlyExitedFront || clearlyPastSide || clearlyBehindBack) {
    mineral.containedInScoop = false;
    mineral.containGrace = 0;
  } else if (mineral.containGrace > 0) {
    mineral.containGrace -= 1;
  } else {
    mineral.containedInScoop = false;
  }

  return { ...state, contained: mineral.containedInScoop };
}

function getScoopLocalState(mineral, blade) {
  const local = worldToBladeLocal(mineral.x, mineral.y);
  const bladeStart = getBladeStart();
  const bladeEnd = bladeStart + blade.length;
  const halfWidth = blade.width / 2;
  const tolerance = scoopContainmentTolerance + mineral.radius;
  const insideScoop = local.x >= bladeStart - mineral.radius && local.x <= bladeEnd + mineral.radius && Math.abs(local.y) <= halfWidth + mineral.radius;
  const nearScoop = local.x >= bladeStart - tolerance && local.x <= bladeEnd + tolerance && Math.abs(local.y) <= halfWidth + tolerance;

  return { local, bladeStart, bladeEnd, halfWidth, insideScoop, nearScoop };
}

function applyBladeLipCollisions(dt, blade = getCurrentBladeConfig(), allowBackPush = true) {
  const playerPushPower = getPlayerPushPower();
  const impulseBudget = new Map();
  let loadCount = 0;
  const subDt = dt / physicsSubsteps;

  // The lips are solid moving barriers. Substeps reduce tunneling when the
  // vehicle or a crowded mineral pile changes position quickly.
  for (let step = 0; step < physicsSubsteps; step += 1) {
    for (const mineral of minerals) {
      if (!isPhysicalOre(mineral)) continue;
      const pushResponse = getSaturatedPushResponse(playerPushPower, getMineralOreType(mineral));
      const result = resolveBladeLipContactsForMineral(mineral, blade, subDt, pushResponse, impulseBudget, allowBackPush);
      if (step === 0 && result.inLoadZone) loadCount += 1;
      capMineralSpeed(mineral, allowBackPush ? pushResponse.speedCap : maxMineralSpeed);
    }
  }

  return loadCount;
}

function applyPushOnlyToolCollisions(dt, tool) {
  let contactCount = 0;
  const subDt = dt / physicsSubsteps;

  // Push-only tools are solid heads, but not scoops: they displace loose ore
  // with moving-wall response and never create capture candidates or secured ore.
  for (let step = 0; step < physicsSubsteps; step += 1) {
    for (const mineral of minerals) {
      if (!isPhysicalOre(mineral)) continue;
      const result = resolvePushOnlyToolContactsForMineral(mineral, tool, subDt);
      if (step === 0 && result.anyContact) contactCount += 1;
      capMineralSpeed(mineral, maxMineralSpeed);
      resolveWallContact(mineral);
    }
  }

  return contactCount;
}

function resolvePushOnlyToolContactsForMineral(mineral, tool, dt) {
  const contacts = getPushOnlyToolContacts(mineral, tool);

  for (const contact of contacts) {
    resolvePushOnlyToolContact(mineral, tool, contact, dt);
  }

  return { anyContact: contacts.length > 0 };
}

function resolvePushOnlyToolContact(mineral, tool, contact, dt) {
  const normal = localToWorldVector(contact.normal.x, contact.normal.y);
  const correction = Math.min(contact.depth + 0.01, maxScoopLipCorrectionPerSubstep);
  mineral.x += normal.x * correction;
  mineral.y += normal.y * correction;
  applyMovingWallVelocityResponse(mineral, normal, tool.contactRestitution, tool.contactFriction);

  // A tiny shake makes the contact readable without implying damage or mining.
  mineral.shake = Math.max(mineral.shake, Math.min(0.12, dt * 4));
}

function getPushOnlyToolContacts(mineral, tool) {
  const local = worldToBladeLocal(mineral.x, mineral.y);
  const contacts = [];

  for (const collider of getPushOnlyToolColliders(tool)) {
    const contact = collider.type === "circle"
      ? getCircleToolContact(mineral, collider, local)
      : getSegmentToolContact(mineral, collider, local);
    if (contact) contacts.push(contact);
  }

  return contacts.sort((a, b) => b.depth - a.depth);
}

function getPushOnlyToolColliders(tool) {
  if (tool.visualShape === "drill") return getDrillToolColliders(tool);
  if (tool.visualShape === "hammer") return getHammerToolColliders(tool);
  return [];
}

function getCurrentToolSolidColliders(toolBoundary = getCurrentToolBoundaryConfig()) {
  if (isScoopToolActive()) {
    return getBladeLipColliders(getCurrentBladeConfig(), getBladeLocalStateFromToolBoundary(toolBoundary));
  }

  return getPushOnlyToolColliders(activeTool);
}

function getBladeLocalStateFromToolBoundary(toolBoundary) {
  const bladeStart = getBladeStart();
  const bladeEnd = bladeStart + toolBoundary.length;
  return {
    local: { x: 0, y: 0 },
    bladeStart,
    bladeEnd,
    halfWidth: toolBoundary.width / 2,
  };
}

function getDrillToolColliders(tool) {
  const start = getBladeStart();
  const end = start + tool.length;
  const halfWidth = tool.width / 2;

  return [
    {
      type: "segment",
      kind: "drillBody",
      ax: start + 2,
      ay: 0,
      bx: end - 4,
      by: 0,
      radius: halfWidth * 0.5,
    },
    {
      type: "circle",
      kind: "drillTip",
      cx: end - 2,
      cy: 0,
      radius: halfWidth * 0.28,
    },
  ];
}

function getHammerToolColliders(tool) {
  const metrics = getHammerToolMetrics(tool);

  return [
    {
      type: "segment",
      kind: "hammerHead",
      ax: metrics.headX,
      ay: -metrics.headHeight / 2,
      bx: metrics.headX,
      by: metrics.headHeight / 2,
      radius: metrics.headWidth / 2,
    },
    {
      type: "segment",
      kind: "hammerHandle",
      ax: metrics.start - 2,
      ay: 0,
      bx: metrics.headX - metrics.headWidth / 2,
      by: 0,
      radius: 3,
    },
  ];
}

function getSegmentToolContact(mineral, collider, local) {
  const segmentX = collider.bx - collider.ax;
  const segmentY = collider.by - collider.ay;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  const t = segmentLengthSq > 0.001
    ? clamp(((local.x - collider.ax) * segmentX + (local.y - collider.ay) * segmentY) / segmentLengthSq, 0, 1)
    : 0;
  const closestX = collider.ax + segmentX * t;
  const closestY = collider.ay + segmentY * t;
  return getToolContactFromClosestPoint(mineral, collider, local, closestX, closestY);
}

function getCircleToolContact(mineral, collider, local) {
  return getToolContactFromClosestPoint(mineral, collider, local, collider.cx, collider.cy);
}

function getToolContactFromClosestPoint(mineral, collider, local, closestX, closestY) {
  const dx = local.x - closestX;
  const dy = local.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  const combinedRadius = mineral.radius + collider.radius;
  if (distanceSq >= combinedRadius * combinedRadius) return null;

  const distanceBetween = Math.sqrt(distanceSq);
  const normal = distanceBetween > 0.001
    ? { x: dx / distanceBetween, y: dy / distanceBetween }
    : getToolContactFallbackNormal(collider, local);

  return {
    kind: collider.kind,
    depth: combinedRadius - distanceBetween,
    normal,
  };
}

function getToolContactFallbackNormal(collider, local) {
  if (collider.type === "circle") {
    const x = local.x - collider.cx;
    const y = local.y - collider.cy;
    const length = Math.hypot(x, y);
    return length > 0.001 ? { x: x / length, y: y / length } : { x: 1, y: 0 };
  }

  const segmentX = collider.bx - collider.ax;
  const segmentY = collider.by - collider.ay;
  const segmentLength = Math.hypot(segmentX, segmentY) || 1;
  let normalX = -segmentY / segmentLength;
  let normalY = segmentX / segmentLength;
  const midX = (collider.ax + collider.bx) / 2;
  const midY = (collider.ay + collider.by) / 2;
  const side = (local.x - midX) * normalX + (local.y - midY) * normalY;

  if (side < 0) {
    normalX *= -1;
    normalY *= -1;
  }

  return { x: normalX, y: normalY };
}

function getDrillSegmentSurfaceContact(segment) {
  if (!isVeinSegmentSolid(segment)) return null;

  const contacts = getToolVeinSegmentContacts(TOOL_TYPES.drill, segment, getSegmentDrillConfig(segment).contactTolerance);
  return contacts.find((contact) => contact.kind === "drillTip") || null;
}

function getToolVeinSegmentContacts(tool, segment, tolerance = 0) {
  const solid = segment.solidBody;
  const local = worldToBladeLocal(solid.x, solid.y);
  const contacts = [];

  for (const collider of getPushOnlyToolColliders(tool)) {
    const contact = collider.type === "circle"
      ? getCircleToolContactAgainstSolid(collider, local, solid.radius, tolerance)
      : getSegmentToolContactAgainstSolid(collider, local, solid.radius, tolerance);
    if (contact) contacts.push(contact);
  }

  return contacts.sort((a, b) => b.depth - a.depth);
}

function getSegmentToolContactAgainstSolid(collider, solidLocal, solidRadius, tolerance = 0) {
  const segmentX = collider.bx - collider.ax;
  const segmentY = collider.by - collider.ay;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  const t = segmentLengthSq > 0.001
    ? clamp(((solidLocal.x - collider.ax) * segmentX + (solidLocal.y - collider.ay) * segmentY) / segmentLengthSq, 0, 1)
    : 0;
  const closestX = collider.ax + segmentX * t;
  const closestY = collider.ay + segmentY * t;
  return getToolSolidContactFromClosestPoint(collider, solidLocal, solidRadius, closestX, closestY, tolerance);
}

function getCircleToolContactAgainstSolid(collider, solidLocal, solidRadius, tolerance = 0) {
  return getToolSolidContactFromClosestPoint(collider, solidLocal, solidRadius, collider.cx, collider.cy, tolerance);
}

function getToolSolidContactFromClosestPoint(collider, solidLocal, solidRadius, closestX, closestY, tolerance = 0) {
  const dx = solidLocal.x - closestX;
  const dy = solidLocal.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  const combinedRadius = solidRadius + collider.radius;
  const allowedDistance = combinedRadius + tolerance;
  if (distanceSq > allowedDistance * allowedDistance) return null;

  const distanceBetween = Math.sqrt(distanceSq);
  const normal = distanceBetween > 0.001
    ? { x: dx / distanceBetween, y: dy / distanceBetween }
    : getToolContactFallbackNormal(collider, solidLocal);

  return {
    kind: collider.kind,
    depth: combinedRadius - distanceBetween,
    normal,
  };
}

function resolveBladeLipContactsForMineral(mineral, blade, dt, pushResponse, impulseBudget, allowBackPush) {
  const state = updateContainedState(mineral, blade);
  const contacts = getBladeLipContacts(mineral, blade, state);
  const contained = state.contained;

  if (contained) {
    applyScoopSurfaceFriction(mineral, dt);
  }

  if (contacts.length > 0) {
    for (const contact of contacts) {
      resolveSolidLipContact(mineral, blade, contact, dt, pushResponse, impulseBudget, allowBackPush);
    }
  }

  return {
    inLoadZone: contacts.length > 0 || contained,
    anyContact: contacts.length > 0,
  };
}

function resolveSolidLipContact(mineral, blade, contact, dt, pushResponse, impulseBudget, allowBackPush) {
  const normal = localToWorldVector(contact.normal.x, contact.normal.y);
  const correction = Math.min(contact.depth + 0.01, maxScoopLipCorrectionPerSubstep);
  mineral.x += normal.x * correction;
  mineral.y += normal.y * correction;

  const restitution = contact.kind === "back" ? backLipRestitution : blade.sideLipRestitution;
  const friction = contact.kind === "back" ? blade.innerBackLipFriction : blade.sideLipFriction;
  applyMovingWallVelocityResponse(mineral, normal, restitution, friction);

  // Back-lip contact is the main physical shove. Side lips only block and let
  // minerals slide along them.
  if (contact.kind === "back" && allowBackPush && pushResponse.accelScale > 0 && impulseBudget) {
    const forwardDot = normal.x * vehicle.dirX + normal.y * vehicle.dirY;
    if (forwardDot > 0.35) {
      const impulse = blade.innerBackLipPushForce * pushResponse.accelScale * forwardDot * dt;
      applyMineralImpulse(mineral, normal.x * impulse, normal.y * impulse, impulseBudget);
      applyInnerBackLipFriction(mineral, blade);
    }
  }
}

function applyMovingWallVelocityResponse(mineral, normal, restitution, friction) {
  let relX = mineral.vx - vehicle.vx;
  let relY = mineral.vy - vehicle.vy;
  const normalSpeed = relX * normal.x + relY * normal.y;

  // Work in relative velocity so a moving scoop lip can carry/push minerals
  // without adding a magnetic-looking pull.
  if (normalSpeed < 0) {
    relX -= (1 + restitution) * normalSpeed * normal.x;
    relY -= (1 + restitution) * normalSpeed * normal.y;
  }

  const remainingNormalSpeed = relX * normal.x + relY * normal.y;
  const tangentX = relX - remainingNormalSpeed * normal.x;
  const tangentY = relY - remainingNormalSpeed * normal.y;

  relX = remainingNormalSpeed * normal.x + tangentX * friction;
  relY = remainingNormalSpeed * normal.y + tangentY * friction;
  mineral.vx = vehicle.vx + relX;
  mineral.vy = vehicle.vy + relY;
}

function applyScoopSurfaceFriction(mineral, dt) {
  if (centerPullForce !== 0 || scoopMagnetForce !== 0 || maxAssistDisplacementPerFrame !== 0) return;

  const relativeX = mineral.vx - vehicle.vx;
  const relativeY = mineral.vy - vehicle.vy;
  const damping = clamp(scoopFrictionInside * dt * 60, 0, 0.45);
  mineral.vx -= relativeX * damping;
  mineral.vy -= relativeY * damping;

  const inheritX = (vehicle.vx - mineral.vx) * scoopVelocityInheritance;
  const inheritY = (vehicle.vy - mineral.vy) * scoopVelocityInheritance;
  const assist = capVector(inheritX, inheritY, maxAssistAcceleration * dt);
  mineral.vx += assist.x;
  mineral.vy += assist.y;
}

function applyInnerBackLipFriction(mineral, blade) {
  const velocity = getLocalVelocity(mineral);
  velocity.y *= blade.innerBackLipFriction;
  applyLocalVelocity(mineral, velocity);
}

function applyScoopAreaDamping(mineral, dt) {
  if (mineralDampingInsideScoop >= 1) return;
  const blade = getCurrentBladeConfig();
  const contact = getBladeLipContact(mineral, blade);
  if (!contact.any) return;
  const damping = Math.pow(mineralDampingInsideScoop, dt * 60);
  mineral.vx *= damping;
  mineral.vy *= damping;
}
function getBladeLipContact(mineral, blade, state = getScoopLocalState(mineral, blade)) {
  const contacts = getBladeLipContacts(mineral, blade, state);
  const back = contacts.find((contact) => contact.kind === "back");
  const left = contacts.find((contact) => contact.kind === "left");
  const right = contacts.find((contact) => contact.kind === "right");
  const side = left || right;

  return {
    any: contacts.length > 0,
    inner: Boolean(back),
    left: Boolean(left),
    right: Boolean(right),
    innerDepth: back ? back.depth : 0,
    sideDepth: side ? side.depth : 0,
    sideNormalY: side ? side.normal.y : 0,
  };
}

function getBladeLipContacts(mineral, blade, state = getScoopLocalState(mineral, blade)) {
  const contacts = [];
  const colliders = getBladeLipColliders(blade, state);

  for (const collider of colliders) {
    const contact = collider.type === "circle"
      ? getCircleLipContact(mineral, collider, state)
      : getSegmentLipContact(mineral, collider, state);
    if (contact) contacts.push(contact);
  }

  return contacts.sort((a, b) => b.depth - a.depth);
}

function getBladeLipColliders(blade, state) {
  const start = state.bladeStart;
  const end = state.bladeEnd;
  const halfWidth = state.halfWidth;
  const sideRadius = blade.sideLipThickness / 2;
  const backRadius = blade.innerBackLipThickness / 2;
  const cornerRadius = Math.max(sideRadius, backRadius);

  // The scoop is modeled as a U-shaped set of thick capsules. The corner caps
  // close the rear joints so small minerals cannot leak through numerical gaps.
  return [
    {
      type: "segment",
      kind: "back",
      ax: start,
      ay: -halfWidth,
      bx: start,
      by: halfWidth,
      radius: backRadius,
    },
    {
      type: "segment",
      kind: "left",
      ax: start,
      ay: -halfWidth,
      bx: end,
      by: -halfWidth,
      radius: sideRadius,
    },
    {
      type: "segment",
      kind: "right",
      ax: start,
      ay: halfWidth,
      bx: end,
      by: halfWidth,
      radius: sideRadius,
    },
    {
      type: "circle",
      kind: "leftCorner",
      cx: start,
      cy: -halfWidth,
      radius: cornerRadius,
    },
    {
      type: "circle",
      kind: "rightCorner",
      cx: start,
      cy: halfWidth,
      radius: cornerRadius,
    },
  ];
}

function getSegmentLipContact(mineral, collider, state) {
  const local = state.local;
  const segmentX = collider.bx - collider.ax;
  const segmentY = collider.by - collider.ay;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  const t = segmentLengthSq > 0.001
    ? clamp(((local.x - collider.ax) * segmentX + (local.y - collider.ay) * segmentY) / segmentLengthSq, 0, 1)
    : 0;
  const closestX = collider.ax + segmentX * t;
  const closestY = collider.ay + segmentY * t;

  return getLipContactFromClosestPoint(mineral, collider, local, closestX, closestY, state);
}

function getCircleLipContact(mineral, collider, state) {
  return getLipContactFromClosestPoint(mineral, collider, state.local, collider.cx, collider.cy, state);
}

function getLipContactFromClosestPoint(mineral, collider, local, closestX, closestY, state) {
  const dx = local.x - closestX;
  const dy = local.y - closestY;
  const distanceSq = dx * dx + dy * dy;
  const combinedRadius = mineral.radius + collider.radius;
  if (distanceSq >= combinedRadius * combinedRadius) return null;

  const distanceBetween = Math.sqrt(distanceSq);
  const fallback = getLipFallbackNormal(collider, local, state);

  // When a mineral center sits exactly on the collider centerline, the normal is
  // ambiguous; fallback normals keep overlap resolution deterministic.
  const normal = distanceBetween > 0.001
    ? { x: dx / distanceBetween, y: dy / distanceBetween }
    : fallback;

  return {
    kind: collider.kind === "leftCorner" || collider.kind === "rightCorner" ? "corner" : collider.kind,
    rawKind: collider.kind,
    depth: combinedRadius - distanceBetween,
    normal,
  };
}

function getLipFallbackNormal(collider, local, state) {
  if (collider.kind === "back") {
    return { x: local.x >= state.bladeStart ? 1 : -1, y: 0 };
  }

  if (collider.kind === "left") {
    return { x: 0, y: local.y >= -state.halfWidth ? 1 : -1 };
  }

  if (collider.kind === "right") {
    return { x: 0, y: local.y >= state.halfWidth ? 1 : -1 };
  }

  const cornerY = collider.kind === "leftCorner" ? -state.halfWidth : state.halfWidth;
  const x = local.x >= state.bladeStart ? 1 : -1;
  const y = local.y >= cornerY ? 1 : -1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function getLocalVelocity(mineral) {
  const forwardX = vehicle.dirX;
  const forwardY = vehicle.dirY;
  const sideX = -forwardY;
  const sideY = forwardX;

  return {
    x: mineral.vx * forwardX + mineral.vy * forwardY,
    y: mineral.vx * sideX + mineral.vy * sideY,
  };
}

function applyLocalVelocity(mineral, localVelocity) {
  const worldVelocity = localToWorldVector(localVelocity.x, localVelocity.y);
  mineral.vx = worldVelocity.x;
  mineral.vy = worldVelocity.y;
}

function applyMineralImpulse(mineral, impulseX, impulseY, impulseBudget) {
  const used = impulseBudget.get(mineral) || 0;
  const remaining = maxImpulsePerMineralPerFrame - used;
  if (remaining <= 0) return;

  // A per-frame impulse budget prevents one squeezed mineral from getting an
  // explosive launch after several contacts resolve in the same frame.
  const limited = capVector(impulseX, impulseY, remaining);
  mineral.vx += limited.x;
  mineral.vy += limited.y;
  impulseBudget.set(mineral, used + Math.hypot(limited.x, limited.y));
}

function capVector(x, y, maxLength) {
  const length = Math.hypot(x, y);
  if (length <= maxLength || length <= 0.001) return { x, y };
  const scale = maxLength / length;
  return { x: x * scale, y: y * scale };
}
function getSaturatedPushResponse(playerPushPower, type) {
  const pushResistance = type.pushResistance || 1;
  const effectivePushPower = playerPushPower / pushResistance;
  if (effectivePushPower < type.requiredPush) {
    return { accelScale: 0, speedCap: 0 };
  }

  const range = Math.max(type.saturationPush - type.requiredPush, 0.001);
  const normalized = clamp((effectivePushPower - type.requiredPush) / range, 0, 1);
  const curve = 1 - Math.pow(1 - normalized, 2.4);
  const speedCap = type.maxPushSpeed * (0.35 + curve * 0.65);

  return {
    accelScale: 0.35 + curve * 0.65,
    speedCap,
  };
}

function getPlayerPushPower() {
  return pushForce * getUpgradeEffect("chassis.pushPower", 1);
}

function isScoopToolActive() {
  return activeTool.behaviorType === "scoopSecure";
}

function isDrillToolActive() {
  return activeTool.id === "drill";
}

function isHammerToolActive() {
  return activeTool.id === "hammer";
}

function isPushOnlyToolActive() {
  return activeTool.behaviorType === "pushOnly";
}

function getDrillTipWorldPosition() {
  const tip = getDrillTipColliderWorldPosition(TOOL_TYPES.drill);
  return { x: tip.x, y: tip.y, radius: drillTipContactRadius };
}

function getHammerHitAreaWorldPosition(tool = TOOL_TYPES.hammer) {
  const headCollider = getHammerToolColliders(tool).find((collider) => collider.kind === "hammerHead");
  const localX = (headCollider.ax + headCollider.bx) / 2;
  const localY = (headCollider.ay + headCollider.by) / 2;
  const position = bladeLocalToWorld(localX, localY);
  return { x: position.x, y: position.y, radius: hammerHitRadius };
}

function getCurrentToolBoundaryConfig(blade = getCurrentBladeConfig()) {
  if (isScoopToolActive()) return blade;

  return {
    id: activeTool.id,
    displayName: activeTool.displayName,
    shape: activeTool.visualShape,
    width: activeTool.width,
    length: activeTool.length,
    lipThickness: activeTool.boundaryThickness,
    sideLipThickness: activeTool.boundaryThickness,
    innerBackLipThickness: activeTool.boundaryThickness,
  };
}

function getCurrentBladeConfig() {
  const bladeType = TOOL_TYPES.scoop.bladeType;
  const lipCollision = bladeType.lipCollision;
  const assist = bladeType.specialAssist;
  return {
    ...bladeType,
    width: bladeType.width + getUpgradeEffect("blade.width", 0),
    capacity: bladeType.capacity + getUpgradeEffect("blade.capacity", 0),
    innerBackLipThickness: lipCollision.innerBackLipThickness,
    innerBackLipFriction: lipCollision.innerBackLipFriction,
    innerBackLipPushForce: lipCollision.innerBackLipPushForce,
    sideLipThickness: lipCollision.sideLipThickness,
    sideLipRestitution: lipCollision.sideLipRestitution,
    sideLipFriction: lipCollision.sideLipFriction,
    sideLipInwardForce: assist.sideLipInwardForce,
  };
}

function getCurrentBladeCapacity() {
  return getCurrentBladeConfig().capacity;
}

function getUpgradeEffect(effectName, fallback) {
  if (!upgraded) return fallback;
  return applyUpgradeEffects(activeUpgradeDef.effects, effectName, fallback);
}

function applyUpgradeEffects(effects, target, baseValue) {
  return effects
    .filter((effect) => effect.target === target)
    .reduce((value, effect) => applyUpgradeEffect(value, effect), baseValue);
}

function applyUpgradeEffect(value, effect) {
  if (effect.op === "multiply") return value * effect.value;
  if (effect.op === "add") return value + effect.value;
  if (effect.op === "set") return effect.value;
  return value;
}

function capMineralSpeed(mineral, speedCap) {
  const cap = Math.min(speedCap, maxMineralSpeed);
  const speed = Math.hypot(mineral.vx, mineral.vy);
  if (speed <= cap || speed <= 0.001) return;
  const scale = cap / speed;
  mineral.vx *= scale;
  mineral.vy *= scale;
}

function updateSecuredOre(mineral, blade, dt) {
  const localVehicleVelocity = worldVectorToBladeLocal(vehicle.vx, vehicle.vy);

  // Secured ore is stable logic, but visually it still has inertia relative to
  // the scoop so the carried pile feels loose rather than frozen.
  mineral.securedVx += (-localVehicleVelocity.x * securedOreSloshAmount - mineral.securedOffsetX * securedOreSettleSpeed) * dt;
  mineral.securedVy += (-localVehicleVelocity.y * securedOreSloshAmount - mineral.securedOffsetY * securedOreSettleSpeed) * dt;

  const damping = Math.pow(securedOreLocalDamping, dt * 60);
  mineral.securedVx *= damping;
  mineral.securedVy *= damping;
  mineral.securedOffsetX += mineral.securedVx * dt;
  mineral.securedOffsetY += mineral.securedVy * dt;

  const capped = capVector(mineral.securedOffsetX, mineral.securedOffsetY, securedOreMaxVisualOffset);
  mineral.securedOffsetX = capped.x;
  mineral.securedOffsetY = capped.y;

  const local = clampSecuredOreLocalPosition(
    mineral.securedLocalX + mineral.securedOffsetX,
    mineral.securedLocalY + mineral.securedOffsetY,
    mineral.radius,
    blade
  );
  const worldPos = bladeLocalToWorld(local.x, local.y);
  mineral.x = worldPos.x;
  mineral.y = worldPos.y;
  mineral.vx = vehicle.vx;
  mineral.vy = vehicle.vy;
}

function updateDeliveredOre(mineral, index, dt) {
  mineral.deliveryAge += dt;
  const t = clamp(mineral.deliveryAge / Math.max(mineral.deliveryDuration, 0.001), 0, 1);
  const eased = 1 - Math.pow(1 - t, 2.2);
  const arc = Math.sin(t * Math.PI) * 10;

  // Delivery stays visible and fast: secured rocks dump into the crusher, then
  // the background batch owns processing and payout feedback.
  mineral.x = mineral.deliveryStartX + (mineral.deliveryTargetX - mineral.deliveryStartX) * eased;
  mineral.y = mineral.deliveryStartY + (mineral.deliveryTargetY - mineral.deliveryStartY) * eased - arc;
  mineral.drawScale = 1 - t * 0.62;

  if (t >= 1) {
    finishDeliveredOre(index, mineral);
  }
}

function updateScoopCaptureCandidates(blade, dt) {
  const candidates = [];
  const captureRules = blade.captureRules;
  const capacityLeft = blade.capacity - currentSecuredOre;

  for (const mineral of minerals) {
    if (!isPhysicalOre(mineral)) continue;

    const score = getScoopInsideScore(mineral, blade);
    mineral.insideRatio = score.insideRatio;

    // Full scoop means no new secured ore. The mineral remains physical and can
    // still be pushed around by the blade.
    if (capacityLeft <= 0 || score.insideRatio < captureRules.resetThreshold) {
      mineral.state = mineralState.looseOre;
      mineral.captureDwell = 0;
      continue;
    }

    if (score.insideRatio >= captureRules.insideThreshold) {
      mineral.state = mineralState.captureCandidate;
      mineral.captureDwell += dt;

      if (mineral.captureDwell >= captureRules.dwellTime) {
        candidates.push(mineral);
      }
    } else {
      mineral.state = mineralState.looseOre;
      mineral.captureDwell = Math.max(0, mineral.captureDwell - dt * 2);
    }
  }

  if (capacityLeft <= 0 || candidates.length === 0) return;

  candidates.sort((a, b) => {
    const ratioDiff = b.insideRatio - a.insideRatio;
    if (Math.abs(ratioDiff) > 0.01) return ratioDiff;
    return b.captureDwell - a.captureDwell;
  });

  let slots = capacityLeft;
  for (const mineral of candidates) {
    const capacityCost = getMineralCapacityCost(mineral);
    if (slots < capacityCost) {
      mineral.state = mineralState.looseOre;
      mineral.captureDwell = 0;
      continue;
    }

    secureMineral(mineral, blade);
    slots -= capacityCost;
  }
}

function resetScoopCaptureCandidates() {
  for (const mineral of minerals) {
    if (mineral.state !== mineralState.captureCandidate) continue;
    mineral.state = mineralState.looseOre;
    mineral.captureDwell = 0;
    mineral.insideRatio = 0;
    mineral.containedInScoop = false;
    mineral.containGrace = 0;
  }
}

function getScoopInsideScore(mineral, blade) {
  let inside = 0;
  const points = getMineralSamplePoints(mineral);

  // Nine point sampling is a cheap approximation of "mostly inside" for P0.
  // It avoids instant capture from a single edge touch.
  for (const point of points) {
    const local = worldToBladeLocal(point.x, point.y);
    if (isPointInsideScoopLoadZone(local, blade, mineral.radius)) inside += 1;
  }

  return {
    inside,
    total: points.length,
    insideRatio: inside / points.length,
  };
}

function getMineralSamplePoints(mineral) {
  const points = [{ x: mineral.x, y: mineral.y }];

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    points.push({
      x: mineral.x + Math.cos(angle) * mineral.radius,
      y: mineral.y + Math.sin(angle) * mineral.radius,
    });
  }

  return points;
}

function isPointInsideScoopLoadZone(local, blade, mineralRadius = 0) {
  const bladeStart = getBladeStart();
  const bladeEnd = bladeStart + blade.length;
  const halfWidth = blade.width / 2;
  const sidePadding = Math.max(blade.sideLipThickness * 0.48, 4);
  const backPadding = Math.max(blade.innerBackLipThickness * 0.45, 3);
  const frontPadding = Math.max(mineralRadius * 0.2, 1);

  // The load zone follows the scoop shape and leaves the mouth open; it is not
  // a rectangular cargo box.
  return (
    local.x >= bladeStart + backPadding &&
    local.x <= bladeEnd - frontPadding &&
    Math.abs(local.y) <= halfWidth - sidePadding
  );
}

function secureMineral(mineral, blade) {
  const local = worldToBladeLocal(mineral.x, mineral.y);
  const randomX = random(-securedOreRandomOffset, securedOreRandomOffset);
  const randomY = random(-securedOreRandomOffset, securedOreRandomOffset);
  const securedLocal = clampSecuredOreLocalPosition(local.x + randomX, local.y + randomY, mineral.radius, blade);

  // Preserve the captured local position so secured ore looks like the pile the
  // player actually scooped, not a snapped or centered storage item.
  mineral.state = mineralState.securedOre;
  mineral.captureDwell = 0;
  mineral.insideRatio = 1;
  mineral.securedLocalX = securedLocal.x;
  mineral.securedLocalY = securedLocal.y;
  mineral.securedOffsetX = 0;
  mineral.securedOffsetY = 0;
  mineral.securedVx = 0;
  mineral.securedVy = 0;
  mineral.vx = vehicle.vx;
  mineral.vy = vehicle.vy;
  mineral.containedInScoop = true;
  mineral.containGrace = containedStateHysteresis;
  currentSecuredOre += getMineralCapacityCost(mineral);
}

function clampSecuredOreLocalPosition(localX, localY, radius, blade) {
  const bladeStart = getBladeStart();
  const bladeEnd = bladeStart + blade.length;
  const halfWidth = blade.width / 2;
  const sidePadding = blade.sideLipThickness * 0.5 + radius * 0.25;
  const backPadding = blade.innerBackLipThickness * 0.55 + radius * 0.2;
  const frontPadding = radius * 0.65;

  // Keep secured visuals behind the open mouth and inside the lips while still
  // allowing irregular positions within that scoop-shaped space.
  return {
    x: clamp(localX, bladeStart + backPadding, bladeEnd - frontPadding),
    y: clamp(localY, -halfWidth + sidePadding, halfWidth - sidePadding),
  };
}

function tryStartSecuredOreDelivery() {
  const load = getCurrentCrusherLoad();
  if (load.currentLoad <= 0) return;

  // Unload when either the vehicle body or the carried scoop pile reaches the
  // side crusher, without requiring the player to park and wait.
  const scoopNose = bladeLocalToWorld(getBladeStart() + getCurrentBladeConfig().length * 0.55, 0);
  const vehicleDistance = distance(vehicle.x, vehicle.y, crusher.x, crusher.y);
  const scoopDistance = distance(scoopNose.x, scoopNose.y, crusher.x, crusher.y);
  if (Math.min(vehicleDistance, scoopDistance) > crusher.sellRadius) return;

  const securedOre = minerals.filter((mineral) => mineral.state === mineralState.securedOre);
  if (securedOre.length === 0) return;

  const batch = createCrusherBatch(securedOre, load.loadRatio);
  securedOre.forEach((mineral, index) => startSecuredOreDelivery(mineral, batch, index, securedOre.length));
  syncScoopLoadCount();
  messageEl.textContent = `Unloading ${batch.amount} ore.`;
  updateHud();
}

function getCurrentCrusherLoad() {
  const currentLoad = currentSecuredOre;
  const maxLoad = getCurrentBladeCapacity();
  const loadRatio = maxLoad > 0 ? clamp(currentLoad / maxLoad, 0, 1) : 0;
  return { currentLoad, maxLoad, loadRatio };
}

function createCrusherBatch(oreList, loadRatio) {
  const amount = oreList.length;
  const payout = calculateCrusherPayout(oreList, crusher.type);
  return {
    id: nextCrusherBatchId,
    amount,
    capacityLoad: oreList.reduce((total, mineral) => total + getMineralCapacityCost(mineral), 0),
    loadRatio,
    oreCounts: countOreTypes(oreList),
    payout,
    particleColor: getBatchParticleColor(oreList),
    unloadingRemaining: amount,
    unloadDuration: getCrusherUnloadDuration(loadRatio),
    processingAge: 0,
    processingDuration: getCrusherProcessingDuration(amount),
    phase: "unloading",
  };
}

function countOreTypes(oreList) {
  return oreList.reduce((counts, mineral) => {
    const oreType = getMineralOreType(mineral);
    counts[oreType.id] = (counts[oreType.id] || 0) + 1;
    return counts;
  }, {});
}

function calculateCrusherPayout(oreList, crusherType) {
  const payout = oreList.reduce((total, mineral) => {
    const oreType = getMineralOreType(mineral);
    const multipliers = getCrusherOreMultipliers(crusherType, oreType);
    total.coins += oreType.baseCoins * multipliers.coinMultiplier;
    total.specialCurrency += oreType.baseSpecialCurrency * multipliers.specialCurrencyMultiplier;
    return total;
  }, { coins: 0, specialCurrency: 0 });

  return {
    coins: Math.round(payout.coins),
    specialCurrency: Math.round(payout.specialCurrency),
  };
}

function getCrusherOreMultipliers(crusherType, oreType) {
  const oreRule = crusherType.oreMultipliers[oreType.id] || crusherType.oreMultipliers.default || {};
  return {
    coinMultiplier: (crusherType.coinMultiplier || 1) * (oreRule.coinMultiplier ?? 1),
    specialCurrencyMultiplier: (crusherType.specialCurrencyMultiplier || 1) * (oreRule.specialCurrencyMultiplier ?? 1),
  };
}

function getBatchParticleColor(oreList) {
  return oreList.length > 0 ? getMineralOreType(oreList[0]).particleColor : DEFAULT_ORE_TYPE.particleColor;
}

function getCrusherUnloadDuration(loadRatio) {
  const ratio = clamp(loadRatio, 0, 1);
  if (ratio <= 0) return 0;
  if (ratio <= crusherSmallLoadRatioMax) {
    const t = ratio / crusherSmallLoadRatioMax;
    return lerp(crusherSmallUnloadDurationMin, crusherSmallUnloadDurationMax, t);
  }

  if (ratio <= crusherMediumLoadRatioMax) {
    const t = (ratio - crusherSmallLoadRatioMax) / (crusherMediumLoadRatioMax - crusherSmallLoadRatioMax);
    return lerp(crusherSmallUnloadDurationMax, crusherMediumUnloadDurationMax, t);
  }

  if (ratio <= crusherLargeLoadRatioMax) {
    const t = (ratio - crusherMediumLoadRatioMax) / (crusherLargeLoadRatioMax - crusherMediumLoadRatioMax);
    return lerp(crusherMediumUnloadDurationMax, crusherLargeUnloadDurationMax, t);
  }

  return crusherFullUnloadDuration;
}

function getCrusherProcessingDuration(amount) {
  if (amount <= 10) return crusherProcessingDurationMin;
  if (amount <= 100) {
    return clamp(2 + ((amount - 10) / 90), 2, crusherProcessingDurationMax);
  }
  return crusherProcessingDurationMax;
}

function startCrusherProcessing(batch) {
  batch.phase = "processing";
  batch.processingAge = 0;
  playOreCrushSound(batch.amount);
  if (!complete) {
    messageEl.textContent = "Crusher processing ore.";
  }
}

function getCrusherBatch(batchId) {
  return crusherBatches.find((batch) => batch.id === batchId);
}

function finishDeliveredOre(index, mineral) {
  const batch = getCrusherBatch(mineral.crusherBatchId);
  minerals.splice(index, 1);
  collected += 1;
  spawnCrusherImpactParticles(mineral.x, mineral.y, getMineralOreType(mineral));

  if (!complete && collected >= completionTarget) {
    complete = true;
    messageEl.textContent = "Area Cleared.";
  }

  if (batch) {
    batch.unloadingRemaining -= 1;
    if (batch.unloadingRemaining <= 0) {
      startCrusherProcessing(batch);
    }
  }

  updateHud();
}

function startSecuredOreDelivery(mineral, batch, index, total) {
  if (!crusherBatches.includes(batch)) {
    crusherBatches.push(batch);
    nextCrusherBatchId += 1;
  }

  const drawPos = getMineralDrawPosition(mineral);
  const spread = total > 1 ? (index / (total - 1) - 0.5) : 0;
  const targetX = crusher.x + random(-crusher.pitWidth * 0.26, crusher.pitWidth * 0.26);
  const targetY = crusher.y + spread * crusher.pitHeight * 0.5 + random(-5, 5);
  mineral.state = mineralState.deliveredOre;
  mineral.deliveryAge = 0;
  mineral.deliveryDuration = batch.unloadDuration * random(0.74, 1);
  mineral.deliveryStartX = drawPos.x;
  mineral.deliveryStartY = drawPos.y;
  mineral.deliveryTargetX = targetX;
  mineral.deliveryTargetY = targetY;
  mineral.crusherBatchId = batch.id;
  mineral.x = drawPos.x;
  mineral.y = drawPos.y;
  mineral.vx = 0;
  mineral.vy = 0;
  mineral.drawScale = 1;
}

function updateCrusherBatches(dt) {
  const activeProcessing = crusherBatches.some((batch) => batch.phase === "processing");
  const spinSpeed = activeProcessing ? crusherRollerActiveSpin : crusherRollerBaseSpin;
  crusherRollerSpin += spinSpeed * dt;
  updateCrusherLoopSound(activeProcessing);

  for (const mineral of minerals) {
    if (mineral.state === mineralState.deliveredOre) {
      spawnCrusherAmbientTrail(mineral, dt);
    }
  }

  for (let i = crusherBatches.length - 1; i >= 0; i -= 1) {
    const batch = crusherBatches[i];
    if (batch.phase !== "processing") continue;

    batch.processingAge += dt;
    spawnCrusherProcessingParticles(batch, dt);

    if (batch.processingAge >= batch.processingDuration) {
      completeCrusherBatch(batch);
      crusherBatches.splice(i, 1);
    }
  }
}

function completeCrusherBatch(batch) {
  spawnCoinPayout(batch.payout.coins);
  playCoinBurstSound(batch.payout.coins);
  if (!complete) {
    messageEl.textContent = "Ore sold.";
  }
}

function updateMinerals(dt) {
  const blade = getCurrentBladeConfig();
  const scoopActive = isScoopToolActive();
  const passiveScoopResponse = { accelScale: 0, speedCap: maxMineralSpeed };

  for (let i = minerals.length - 1; i >= 0; i -= 1) {
    const mineral = minerals[i];

    // Each ore state owns its own movement model: delivered ore animates out,
    // secured ore rides with the scoop, and only loose/candidate ore remains
    // fully physical on the ground.
    if (mineral.state === mineralState.deliveredOre) {
      updateDeliveredOre(mineral, i, dt);
      continue;
    }

    if (mineral.state === mineralState.securedOre) {
      updateSecuredOre(mineral, blade, dt);
      continue;
    }

    applyStuckCorrection(mineral, dt);

    mineral.x += mineral.vx * dt;
    mineral.y += mineral.vy * dt;

    const damping = Math.pow(mineralFriction, dt * 60);
    mineral.vx *= damping;
    mineral.vy *= damping;
    if (scoopActive) {
      applyScoopAreaDamping(mineral, dt);
      resolveBladeLipContactsForMineral(mineral, blade, dt, passiveScoopResponse, null, false);
    } else if (isPushOnlyToolActive()) {
      resolvePushOnlyToolContactsForMineral(mineral, activeTool, dt);
    }
    capMineralSpeed(mineral, maxMineralSpeed);
    mineral.shake = Math.max(0, mineral.shake - dt);

    resolveWallContact(mineral);

  }

  resolveMineralContacts();
  syncScoopLoadCount();

  // Capture is evaluated after physics so minerals must actually settle into
  // the scoop for a moment before becoming secured.
  if (scoopActive) {
    updateScoopCaptureCandidates(blade, dt);
    tryStartSecuredOreDelivery();
  } else {
    resetScoopCaptureCandidates();
  }
  syncScoopLoadCount();
  updateHud();
}

function resolveWallContact(mineral) {
  const bounds = getPlayableBounds(mineral.radius);

  if (mineral.x < bounds.minX) {
    mineral.x = bounds.minX;
    if (mineral.vx < 0) mineral.vx = -mineral.vx * wallBounceFactor;
  } else if (mineral.x <= bounds.minX + wallContactTolerance && mineral.vx < 0) {
    mineral.vx = -mineral.vx * wallBounceFactor;
  }

  if (mineral.x > bounds.maxX) {
    mineral.x = bounds.maxX;
    if (mineral.vx > 0) mineral.vx = -mineral.vx * wallBounceFactor;
  } else if (mineral.x >= bounds.maxX - wallContactTolerance && mineral.vx > 0) {
    mineral.vx = -mineral.vx * wallBounceFactor;
  }

  if (mineral.y < bounds.minY) {
    mineral.y = bounds.minY;
    if (mineral.vy < 0) mineral.vy = -mineral.vy * wallBounceFactor;
  } else if (mineral.y <= bounds.minY + wallContactTolerance && mineral.vy < 0) {
    mineral.vy = -mineral.vy * wallBounceFactor;
  }

  if (mineral.y > bounds.maxY) {
    mineral.y = bounds.maxY;
    if (mineral.vy > 0) mineral.vy = -mineral.vy * wallBounceFactor;
  } else if (mineral.y >= bounds.maxY - wallContactTolerance && mineral.vy > 0) {
    mineral.vy = -mineral.vy * wallBounceFactor;
  }

  resolveMineralCollisionZoneContacts(mineral);
}

function applyStuckCorrection(mineral, dt) {
  const inward = getWallInwardVector(mineral);
  const nearWall = inward.x !== 0 || inward.y !== 0;
  const slow = Math.hypot(mineral.vx, mineral.vy) < 4;

  if (!nearWall || !slow) {
    mineral.stuckFrames = 0;
    return;
  }

  mineral.stuckFrames += 1;
  if (mineral.stuckFrames < stuckFrameThreshold) return;

  const length = Math.hypot(inward.x, inward.y) || 1;
  mineral.vx += (inward.x / length) * stuckCorrectionForce * dt;
  mineral.vy += (inward.y / length) * stuckCorrectionForce * dt;
}

function getWallInwardVector(mineral) {
  const bounds = getPlayableBounds(mineral.radius);
  const nearDistance = wallContactTolerance + 2;
  let x = 0;
  let y = 0;

  if (mineral.x <= bounds.minX + nearDistance) x += 1;
  if (mineral.x >= bounds.maxX - nearDistance) x -= 1;
  if (mineral.y <= bounds.minY + nearDistance) y += 1;
  if (mineral.y >= bounds.maxY - nearDistance) y -= 1;

  const zoneVector = getCollisionZoneAvoidanceVector(mineral, nearDistance);
  x += zoneVector.x;
  y += zoneVector.y;

  return { x, y };
}

function resolveMineralContacts() {
  // Contact solving is iterative instead of perfect. More small passes look
  // steadier than one large correction when many minerals are squeezed together.
  for (let iteration = 0; iteration < mineralContactIterations; iteration += 1) {
    for (let i = 0; i < minerals.length; i += 1) {
      for (let j = i + 1; j < minerals.length; j += 1) {
        const a = minerals[i];
        const b = minerals[j];
        if (!isPhysicalOre(a) || !isPhysicalOre(b)) continue;
        const hit = getOverlap(a, b);
        if (!hit) continue;

        const correctionDepth = Math.max(hit.depth - mineralContactSlop, 0);
        const separate = Math.min(correctionDepth * 0.5 * mineralContactCorrectionRatio, maxMineralContactCorrectionPerIteration);
        a.x -= hit.x * separate;
        a.y -= hit.y * separate;
        b.x += hit.x * separate;
        b.y += hit.y * separate;

        if (iteration === 0) {
          const relativeVelocity = (b.vx - a.vx) * hit.x + (b.vy - a.vy) * hit.y;
          if (relativeVelocity < 0) {
            const impulse = clamp(relativeVelocity * 0.24, -maxImpulsePerMineralPerFrame * 0.35, maxImpulsePerMineralPerFrame * 0.35);
            a.vx += impulse * hit.x;
            a.vy += impulse * hit.y;
            b.vx -= impulse * hit.x;
            b.vy -= impulse * hit.y;
          }
        }
      }
    }

    for (const mineral of minerals) {
      if (!isPhysicalOre(mineral)) continue;
      resolveWallContact(mineral);
    }
  }

  for (const mineral of minerals) {
    if (!isPhysicalOre(mineral)) continue;
    capMineralSpeed(mineral, maxMineralSpeed);
  }
}

function spawnHammerBurstParticles(segment, hammerConfig, oreCount) {
  const count = clamp(hammerBurstParticleBase + oreCount * 2, 6, 20);
  const radius = hammerConfig.burstScatterRadius ?? hammerBurstScatterRadius;

  for (let i = 0; i < count; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(28, 86);
    particles.push({
      kind: i % 3 === 0 ? "spark" : "oreDust",
      x: segment.x + Math.cos(angle) * random(4, radius * 0.45),
      y: segment.y + Math.sin(angle) * random(4, radius * 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: random(2, 4),
      life: random(0.18, 0.34),
      age: 0,
      color: i % 3 === 0 ? "#f0c46b" : DEFAULT_ORE_TYPE.dustColor,
      space: "world",
    });
  }
}

function spawnCrusherImpactParticles(x, y, oreType) {
  const count = clamp(Math.ceil(getOreParticleIntensity(oreType) * 4), 4, 14);
  for (let i = 0; i < count; i += 1) {
    particles.push({
      kind: "oreDust",
      x,
      y,
      vx: random(-34, 34),
      vy: random(-38, 20),
      age: 0,
      life: random(0.22, 0.42),
      radius: random(1.8, 4),
      color: random(0, 1) > 0.78 ? "#f0d06a" : oreType.dustColor,
    });
  }
}

function spawnCrusherAmbientTrail(mineral, dt) {
  if (random(0, 1) > dt * 12) return;
  const oreType = getMineralOreType(mineral);
  particles.push({
    kind: "oreDust",
    x: mineral.x + random(-4, 4),
    y: mineral.y + random(-4, 4),
    vx: random(-18, 18),
    vy: random(-22, 8),
    age: 0,
    life: random(0.18, 0.32),
    radius: random(1.4, 2.8),
    color: oreType.particleColor,
  });
}

function spawnCrusherProcessingParticles(batch, dt) {
  const intensity = clamp(1 + batch.amount / 8, 1, 8);
  const expected = intensity * 18 * dt;
  const count = Math.floor(expected) + (random(0, 1) < expected % 1 ? 1 : 0);

  for (let i = 0; i < count; i += 1) {
    const side = random(0, 1) > 0.5 ? 1 : -1;
    particles.push({
      kind: random(0, 1) > 0.82 ? "spark" : "oreDust",
      x: crusher.x + random(-crusher.pitWidth * 0.38, crusher.pitWidth * 0.38),
      y: crusher.y + random(-crusher.pitHeight * 0.34, crusher.pitHeight * 0.34),
      vx: side * random(12, 58),
      vy: random(-42, 20),
      age: 0,
      life: random(0.2, 0.48),
      radius: random(1.2, 3.2),
      color: random(0, 1) > 0.82 ? "#f4d66b" : batch.particleColor,
    });
  }
}

function getOreParticleIntensity(oreType) {
  return oreType.mass || 1;
}

function spawnCoinPayout(amount) {
  if (amount <= 0) return;
  const target = getCoinHudCanvasTarget();
  const coinCount = Math.min(amount, crusherMaxCoinParticles);
  let remainingValue = amount;

  particles.push({
    kind: "coinBurst",
    x: crusher.x,
    y: crusher.y,
    age: 0,
    life: 0.34,
    radius: 26 + Math.min(amount, 30) * 0.45,
  });

  for (let i = 0; i < coinCount; i += 1) {
    const remainingCoins = coinCount - i;
    const value = Math.ceil(remainingValue / remainingCoins);
    const worldStartX = crusher.x + random(-crusher.pitWidth * 0.28, crusher.pitWidth * 0.28);
    const worldStartY = crusher.y + random(-crusher.pitHeight * 0.24, crusher.pitHeight * 0.24);
    const start = getPayoutScreenStart(worldStartX, worldStartY);
    remainingValue -= value;
    particles.push({
      kind: "coin",
      space: "screen",
      x: start.x,
      y: start.y,
      startX: start.x,
      startY: start.y,
      targetX: target.x + random(-6, 6),
      targetY: target.y + random(-3, 3),
      value,
      paid: false,
      age: -i * 0.018,
      life: crusherCoinFlightDuration,
      radius: random(4.2, 5.6),
    });
  }
}

function getPayoutScreenStart(worldX, worldY) {
  const screen = worldToScreen(worldX, worldY);
  return {
    x: clamp(screen.x, 12, viewport.width - 12),
    y: clamp(screen.y, 12, viewport.height - 12),
  };
}

function getCoinHudCanvasTarget() {
  const canvasRect = canvas.getBoundingClientRect();
  const coinRect = coinsEl.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height || !coinRect.width) {
    return { x: 38, y: 6 };
  }

  return {
    x: clamp(((coinRect.left + coinRect.width / 2 - canvasRect.left) / canvasRect.width) * viewport.width, 12, viewport.width - 12),
    y: ((coinRect.top + coinRect.height / 2 - canvasRect.top) / canvasRect.height) * viewport.height,
  };
}

function updateCrusherLoopSound(active) {
  if (crusherLoopSoundActive === active) return;
  crusherLoopSoundActive = active;
  playCrusherLoopSound(active);
}

function playCrusherLoopSound(active) {
  // Future sound hook: start/stop a crusher loop while processing batches exist.
}

function playOreCrushSound(amount) {
  // Future sound hook: one-shot ore crunch, scaled by amount.
}

function playCoinBurstSound(amount) {
  // Future sound hook: payout burst, scaled by amount.
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.age += dt;
    if (particle.age < 0) continue;

    if (particle.kind === "coin") {
      const t = clamp(particle.age / particle.life, 0, 1);
      const eased = 1 - Math.pow(1 - t, 2.6);
      const arc = Math.sin(t * Math.PI) * 22;
      particle.x = particle.startX + (particle.targetX - particle.startX) * eased;
      particle.y = particle.startY + (particle.targetY - particle.startY) * eased - arc;

      if (!particle.paid && t >= 1) {
        particle.paid = true;
        coins += particle.value;
        updateHud();
      }

      if (t >= 1) particles.splice(i, 1);
      continue;
    }

    particle.x += (particle.vx || 0) * dt;
    particle.y += (particle.vy || -18) * dt;
    if (particle.age >= particle.life) {
      particles.splice(i, 1);
    }
  }
}

function updateHud() {
  coinsEl.textContent = coins;
  collectedEl.textContent = `${collected} / ${mineralCount}`;
  pushStateEl.textContent = upgraded ? "Upgraded" : "Base";
  scoopStateEl.textContent = `${currentSecuredOre} / ${getCurrentBladeCapacity()}`;

  if (upgraded) {
    upgradeButton.textContent = `${activeUpgradeDef.displayName} Upgraded`;
    upgradeButton.disabled = true;
  } else {
    upgradeButton.textContent = `${activeUpgradeDef.displayName} - ${formatUpgradeCosts(activeUpgradeDef)}`;
    upgradeButton.disabled = !canBuyUpgrade(activeUpgradeDef);
  }
}

function switchToolByKey(key) {
  const toolId = TOOL_KEY_BINDINGS[key];
  if (!toolId) return false;
  return trySwitchTool(toolId);
}

function trySwitchTool(toolId) {
  const nextTool = TOOL_TYPES[toolId];
  if (!nextTool || nextTool.id === activeTool.id) return false;

  syncScoopLoadCount();
  if (!canSwitchToolsNow()) {
    showToolDebugNotice("Unload before switching tools", 1.35);
    return false;
  }

  activeTool = nextTool;
  resetScoopCaptureCandidates();
  showToolDebugNotice(`${activeTool.displayName} selected`, 0.85);
  updateHud();
  return true;
}

function canSwitchToolsNow() {
  return currentSecuredOre <= 0 && !minerals.some((mineral) => mineral.state === mineralState.securedOre);
}

function showToolDebugNotice(text, duration) {
  toolDebugNotice = text;
  toolDebugNoticeTimer = duration;
}

function updateToolDebugNotice(dt) {
  if (toolDebugNoticeTimer <= 0) return;
  toolDebugNoticeTimer -= dt;
  if (toolDebugNoticeTimer <= 0) {
    toolDebugNotice = "";
    toolDebugNoticeTimer = 0;
  }
}

function buyUpgrade() {
  if (!canBuyUpgrade(activeUpgradeDef)) return;
  spendUpgradeCosts(activeUpgradeDef);
  upgraded = true;
  messageEl.textContent = "Push power upgraded.";
  updateHud();
  canvas.focus();
}

function canBuyUpgrade(upgradeDef) {
  return !upgraded && canAffordUpgrade(upgradeDef) && meetsUpgradeRequirements(upgradeDef);
}

function canAffordUpgrade(upgradeDef) {
  return Object.entries(upgradeDef.costs).every(([currency, amount]) => getCurrencyAmount(currency) >= amount);
}

function spendUpgradeCosts(upgradeDef) {
  coins -= getUpgradeCost(upgradeDef, "coins");
}

function getUpgradeCost(upgradeDef, currency) {
  return upgradeDef.costs[currency] || 0;
}

function getCurrencyAmount(currency) {
  if (currency === "coins") return coins;
  if (currency === "specialCurrency") return 0;
  return 0;
}

function meetsUpgradeRequirements(upgradeDef) {
  const context = getUpgradeRequirementContext();
  return Object.entries(upgradeDef.requirements).every(([requirement, expected]) => {
    if (requirement === "unlockedUpgrades") {
      return expected.every((upgradeId) => context.unlockedUpgrades.includes(upgradeId));
    }

    if (requirement === "unlockFlags") {
      return expected.every((flag) => context.unlockFlags.includes(flag));
    }

    return getRequirementValue(context, requirement) >= expected;
  });
}

function getUpgradeRequirementContext() {
  return {
    baseCampLevel: 0,
    cartCapacityLevel: 0,
    moveSpeedLevel: 0,
    pushPowerLevel: upgraded ? 1 : 0,
    unlockedUpgrades: upgraded ? [activeUpgradeDef.id] : [],
    unlockFlags: [],
  };
}

function getRequirementValue(context, requirement) {
  return context[requirement] || 0;
}

function formatUpgradeCosts(upgradeDef) {
  const parts = [];
  const coinCost = getUpgradeCost(upgradeDef, "coins");
  const specialCost = getUpgradeCost(upgradeDef, "specialCurrency");
  if (coinCost > 0) parts.push(coinCost);
  if (specialCost > 0) parts.push(`${specialCost} SC`);
  return parts.length > 0 ? parts.join(" + ") : "Free";
}

function draw() {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  applyCameraTransform();
  drawGround();
  drawVeins();
  drawCrusher();
  drawBladeSurface();
  for (const mineral of minerals) drawMineral(mineral);
  drawBladeRimAndVehicle();
  drawDrillBiteIndicator();
  drawParticles("world");
  ctx.restore();
  drawParticles("screen");
  drawToolDebugOverlay();
  drawJoystickOverlay();
  if (complete) drawCompletionBanner();
}

function drawGround() {
  const bounds = getWorldBounds();
  const playableBounds = getPlayableBounds();
  const wall = MAP_CONFIG.wallThickness;

  ctx.fillStyle = "#31251e";
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

  ctx.fillStyle = "#182023";
  ctx.fillRect(bounds.x, bounds.y, bounds.width, wall);
  ctx.fillRect(bounds.x, bounds.y + bounds.height - wall, bounds.width, wall);
  ctx.fillRect(bounds.x, bounds.y, wall, bounds.height);
  ctx.fillRect(bounds.x + bounds.width - wall, bounds.y, wall, bounds.height);

  ctx.strokeStyle = "rgba(244, 240, 223, 0.06)";
  ctx.lineWidth = 1;
  for (let x = playableBounds.minX; x <= playableBounds.maxX; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, playableBounds.minY);
    ctx.lineTo(x, playableBounds.maxY);
    ctx.stroke();
  }
  for (let y = playableBounds.minY; y <= playableBounds.maxY; y += 36) {
    ctx.beginPath();
    ctx.moveTo(playableBounds.minX, y);
    ctx.lineTo(playableBounds.maxX, y);
    ctx.stroke();
  }

  drawCollisionZones();
}

function drawCollisionZones() {
  for (const zone of world.collisionZones) {
    ctx.fillStyle = "rgba(24, 32, 35, 0.86)";
    ctx.strokeStyle = "rgba(240, 196, 107, 0.28)";
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
  }
}

function drawVeins() {
  for (const vein of veins) {
    ctx.save();
    ctx.strokeStyle = "rgba(120, 102, 77, 0.45)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    vein.segments.forEach((segment, index) => {
      if (index === 0) {
        ctx.moveTo(segment.x, segment.y);
      } else {
        ctx.lineTo(segment.x, segment.y);
      }
    });
    ctx.stroke();
    ctx.restore();

    for (const segment of vein.segments) {
      drawVeinSegment(vein, segment);
    }
  }
}

function drawDrillBiteIndicator() {
  if (!activeDrillBite) return;

  const pulse = 1 + Math.sin(performance.now() * 0.05) * 0.22;
  ctx.save();
  ctx.translate(activeDrillBite.x, activeDrillBite.y);
  ctx.strokeStyle = "rgba(240, 196, 107, 0.86)";
  ctx.fillStyle = "rgba(240, 196, 107, 0.62)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7 * pulse, 0);
  ctx.lineTo(7 * pulse, 0);
  ctx.moveTo(0, -7 * pulse);
  ctx.lineTo(0, 7 * pulse);
  ctx.stroke();
  ctx.restore();
}

function drawVeinSegment(vein, segment) {
  const active = isActiveVeinSegment(vein, segment);
  const color = getVeinSegmentColor(segment.visualState);
  const solid = segment.solidBody;
  const radius = segment.visualState === "depleted" ? solid.radius * 0.58 : solid.radius;

  ctx.save();
  ctx.translate(segment.x, segment.y);

  ctx.fillStyle = color.fill;
  ctx.strokeStyle = active ? "#f0c46b" : color.stroke;
  ctx.lineWidth = active ? 4 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (segment.visualState !== "depleted") {
    ctx.strokeStyle = "rgba(244, 240, 223, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, segment.mineArea.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawVeinCracks(segment, radius, active);

  ctx.fillStyle = segment.visualState === "depleted" ? "rgba(244, 240, 223, 0.45)" : "#f4f0df";
  ctx.font = "700 10px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(getVeinSegmentLabel(segment), 0, 2);

  if (active) {
    ctx.strokeStyle = "rgba(240, 196, 107, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 7 + Math.sin(performance.now() * 0.018) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawVeinCracks(segment, radius, active) {
  if (segment.visualState === "intact") return;

  const crackCount = segment.visualState === "heavy_cracked" ? 4 : 2;
  ctx.strokeStyle = active ? "rgba(255, 232, 150, 0.85)" : "rgba(24, 32, 35, 0.62)";
  ctx.lineWidth = segment.visualState === "heavy_cracked" ? 2 : 1.4;

  for (let i = 0; i < crackCount; i += 1) {
    const angle = -0.8 + i * 0.55;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.16, Math.sin(angle) * radius * 0.16);
    ctx.lineTo(Math.cos(angle + 0.4) * radius * 0.52, Math.sin(angle + 0.4) * radius * 0.52);
    ctx.lineTo(Math.cos(angle - 0.18) * radius * 0.76, Math.sin(angle - 0.18) * radius * 0.76);
    ctx.stroke();
  }
}

function getVeinSegmentColor(visualState) {
  if (visualState === "depleted") {
    return { fill: "#303332", stroke: "#4d5652" };
  }
  if (visualState === "heavy_cracked") {
    return { fill: "#5f513e", stroke: "#b28352" };
  }
  if (visualState === "cracked") {
    return { fill: "#6f664f", stroke: "#a89569" };
  }
  return { fill: "#6d745d", stroke: "#9baa7c" };
}

function getVeinSegmentLabel(segment) {
  if (segment.visualState === "heavy_cracked") return "heavy";
  if (segment.visualState === "depleted") return "done";
  return segment.visualState;
}

function isActiveVeinSegment(vein, segment) {
  if (activeDrillTarget && activeDrillTarget.veinId === vein.id && activeDrillTarget.segmentId === segment.id) {
    return true;
  }

  return activeHammerTargets.some((target) => target.veinId === vein.id && target.segmentId === segment.id);
}

function drawCrusher() {
  const active = crusherBatches.some((batch) => batch.phase === "processing" || batch.phase === "unloading");
  const pulse = active ? 0.5 + Math.sin(performance.now() * 0.018) * 0.5 : 0;

  ctx.save();
  ctx.translate(crusher.x, crusher.y);

  ctx.fillStyle = "#263035";
  ctx.strokeStyle = "#4d5a5c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-crusher.sellRadius - 8, -crusher.sellRadius + 2, crusher.sellRadius * 2 + 16, crusher.sellRadius * 2 - 4, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1a2022";
  ctx.strokeStyle = active ? `rgba(244, 214, 107, ${0.42 + pulse * 0.24})` : "#5b6764";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-crusher.pitWidth / 2, -crusher.pitHeight / 2, crusher.pitWidth, crusher.pitHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.fillRect(-crusher.pitWidth / 2 + 7, -crusher.pitHeight / 2 + 7, crusher.pitWidth - 14, crusher.pitHeight - 14);

  drawCrusherRoller(-13, 1, active);
  drawCrusherRoller(13, -1, active);

  ctx.strokeStyle = "rgba(244, 240, 223, 0.16)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.strokeRect(-crusher.sellRadius, -crusher.sellRadius + 10, crusher.sellRadius * 2, crusher.sellRadius * 2 - 20);
  ctx.setLineDash([]);

  ctx.restore();
}

function drawCrusherRoller(offsetX, direction, active) {
  const rollerWidth = 16;
  const rollerHeight = crusher.pitHeight - 12;
  const spin = ((crusherRollerSpin * direction) % 1 + 1) % 1;

  ctx.fillStyle = active ? "#7d8280" : "#5b6262";
  ctx.strokeStyle = "#202627";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(offsetX - rollerWidth / 2, -rollerHeight / 2, rollerWidth, rollerHeight, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = active ? "#f4d66b" : "#2e3738";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const y = -rollerHeight / 2 + (((i / 6 + spin) % 1) * rollerHeight);
    ctx.beginPath();
    ctx.moveTo(offsetX - rollerWidth / 2 + 3, y);
    ctx.lineTo(offsetX + rollerWidth / 2 - 3, y + direction * 3);
    ctx.stroke();
  }

  ctx.fillStyle = "#22292a";
  ctx.beginPath();
  ctx.arc(offsetX, -rollerHeight / 2 + 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(offsetX, rollerHeight / 2 - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBladeSurface() {
  if (!isScoopToolActive()) {
    drawPlaceholderToolSurface(activeTool);
    return;
  }

  const blade = getCurrentBladeConfig();
  const start = getBladeStart();
  const end = start + blade.length;
  const halfWidth = blade.width / 2;

  ctx.save();
  applyVehicleDrawTransform();
  ctx.fillStyle = `rgba(240, 200, 90, ${blade.surfaceAlpha})`;
  ctx.beginPath();
  ctx.moveTo(start, -halfWidth);
  ctx.lineTo(end, -halfWidth);
  ctx.lineTo(end, halfWidth);
  ctx.lineTo(start, halfWidth);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBladeRimAndVehicle() {
  const skin = vehicle.skin;

  ctx.save();
  applyVehicleDrawTransform();

  if (isScoopToolActive()) {
    drawScoopToolRim(getCurrentBladeConfig());
  } else {
    drawPlaceholderToolRim(activeTool);
  }

  ctx.fillStyle = skin.bodyFill;
  ctx.strokeStyle = skin.bodyStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-15, -11, 28, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = skin.cabinFill;
  ctx.fillRect(-4, -7, 12, 14);

  ctx.fillStyle = skin.treadFill;
  ctx.fillRect(-12, -15, 8, 5);
  ctx.fillRect(-12, 10, 8, 5);
  ctx.fillRect(3, -15, 8, 5);
  ctx.fillRect(3, 10, 8, 5);
  ctx.restore();
}

function drawScoopToolRim(blade) {
  const start = getBladeStart();
  const end = start + blade.length;
  const halfWidth = blade.width / 2;

  ctx.strokeStyle = "#d5a845";
  ctx.lineWidth = blade.lipThickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(start, -halfWidth);
  ctx.lineTo(start, halfWidth);
  ctx.moveTo(start, -halfWidth);
  ctx.lineTo(end, -halfWidth);
  ctx.moveTo(start, halfWidth);
  ctx.lineTo(end, halfWidth);
  ctx.stroke();

  ctx.strokeStyle = "#775727";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start, -halfWidth);
  ctx.lineTo(start, halfWidth);
  ctx.moveTo(start, -halfWidth);
  ctx.lineTo(end, -halfWidth);
  ctx.moveTo(start, halfWidth);
  ctx.lineTo(end, halfWidth);
  ctx.stroke();
}

function drawPlaceholderToolSurface(tool) {
  ctx.save();
  applyVehicleDrawTransform();
  ctx.globalAlpha = 0.16;

  if (tool.visualShape === "drill") {
    drawDrillToolShape(tool, true);
  } else if (tool.visualShape === "hammer") {
    drawHammerToolShape(tool, true);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlaceholderToolRim(tool) {
  if (tool.visualShape === "drill") {
    drawDrillToolShape(tool, false);
  } else if (tool.visualShape === "hammer") {
    drawHammerToolShape(tool, false);
  }
}

function drawDrillToolShape(tool, surfaceOnly) {
  const start = getBladeStart();
  const end = start + tool.length;
  const halfWidth = tool.width / 2;

  ctx.fillStyle = surfaceOnly ? tool.fillColor : "#41565c";
  ctx.strokeStyle = surfaceOnly ? tool.fillColor : tool.strokeColor;
  ctx.lineWidth = surfaceOnly ? 1 : 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(start, -halfWidth * 0.58);
  ctx.lineTo(end, 0);
  ctx.lineTo(start, halfWidth * 0.58);
  ctx.closePath();
  ctx.fill();
  if (!surfaceOnly) ctx.stroke();

  if (surfaceOnly) return;

  ctx.strokeStyle = tool.accentColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const x = start + 8 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x, -halfWidth * 0.38);
    ctx.lineTo(x + 8, halfWidth * 0.24);
    ctx.stroke();
  }
}

function drawHammerToolShape(tool, surfaceOnly) {
  const metrics = getHammerToolMetrics(tool);
  const start = metrics.start;
  const headX = metrics.headX;
  const halfWidth = tool.width / 2;
  const headWidth = metrics.headWidth;
  const headHeight = metrics.headHeight;

  ctx.fillStyle = surfaceOnly ? tool.fillColor : "#584d48";
  ctx.strokeStyle = surfaceOnly ? tool.fillColor : tool.strokeColor;
  ctx.lineWidth = surfaceOnly ? 1 : 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(headX - headWidth / 2, -headHeight / 2, headWidth, headHeight, 5);
  ctx.fill();
  if (!surfaceOnly) ctx.stroke();

  if (surfaceOnly) return;

  ctx.strokeStyle = tool.accentColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(start - 2, 0);
  ctx.lineTo(headX - headWidth / 2, 0);
  ctx.stroke();

  ctx.fillStyle = tool.accentColor;
  ctx.beginPath();
  ctx.arc(headX - headWidth / 2, -halfWidth * 0.2, 3, 0, Math.PI * 2);
  ctx.arc(headX + headWidth / 2, halfWidth * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function getHammerToolMetrics(tool) {
  const start = getBladeStart() + 6;
  return {
    start,
    headX: start + tool.length * 0.52,
    headWidth: tool.length * 0.64,
    headHeight: tool.width * 0.46,
  };
}

function drawToolDebugOverlay() {
  const panelWidth = 210;
  const statusLine = toolDebugNotice || (activeDrillBite ? "Drilling" : "");
  const panelHeight = statusLine ? 42 : 24;
  ctx.save();
  ctx.font = "700 12px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(24, 32, 35, 0.72)";
  ctx.fillRect(10, 10, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(244, 240, 223, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, panelWidth, panelHeight);
  ctx.fillStyle = "#f4f0df";
  ctx.fillText(`Tool: ${activeTool.displayName}`, 18, 16);
  if (statusLine) {
    ctx.font = "11px Arial";
    ctx.fillStyle = "#f0c46b";
    ctx.fillText(statusLine, 18, 32);
  }
  ctx.restore();
}

function applyVehicleDrawTransform() {
  const sideX = -vehicle.dirY;
  const sideY = vehicle.dirX;
  const shake = vehicle.overloadShake > 0 ? Math.sin(performance.now() * 0.08) * vehicle.overloadShake : 0;
  ctx.translate(vehicle.x + sideX * shake, vehicle.y + sideY * shake);
  ctx.rotate(Math.atan2(vehicle.dirY, vehicle.dirX));
}

function drawMineral(mineral) {
  const drawPos = getMineralDrawPosition(mineral);
  const shakeOffset = mineral.shake > 0 ? Math.sin(performance.now() * 0.08 + mineral.x) * 1.4 : 0;
  const scale = mineral.drawScale || 1;
  const oreType = getMineralOreType(mineral);

  ctx.save();
  ctx.translate(drawPos.x + shakeOffset, drawPos.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = oreType.color;
  ctx.strokeStyle = oreType.strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, mineral.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = oreType.highlightColor;
  ctx.beginPath();
  ctx.arc(-2.4, -2.4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getMineralDrawPosition(mineral) {
  if (mineral.state !== mineralState.securedOre) {
    return { x: mineral.x, y: mineral.y };
  }

  // Jitter is render-only. It breaks up perfect arrangements without changing
  // the secured ore's actual captured local position.
  const time = performance.now() * 0.006 + mineral.securedSeed;
  const jitterX = Math.sin(time * 1.7) * securedOreJitterAmount;
  const jitterY = Math.cos(time * 1.3) * securedOreJitterAmount;
  const blade = getCurrentBladeConfig();
  const local = clampSecuredOreLocalPosition(
    mineral.securedLocalX + mineral.securedOffsetX + jitterX,
    mineral.securedLocalY + mineral.securedOffsetY + jitterY,
    mineral.radius,
    blade
  );

  return bladeLocalToWorld(local.x, local.y);
}

function drawParticles(space = "world") {
  for (const particle of particles) {
    if ((particle.space || "world") !== space) continue;
    if (particle.age < 0) continue;
    const t = particle.age / particle.life;
    ctx.globalAlpha = 1 - t;
    if (particle.kind === "coin") {
      ctx.fillStyle = "#f4d66b";
      ctx.strokeStyle = "#8f6b20";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.arc(particle.x - particle.radius * 0.3, particle.y - particle.radius * 0.35, particle.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.kind === "coinBurst") {
      ctx.strokeStyle = "#f4d66b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (0.5 + t), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = particle.color || "#f4d66b";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fill();

      if (particle.kind === "spark") {
        ctx.strokeStyle = "rgba(244, 214, 107, 0.65)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - (particle.vx || 0) * 0.06, particle.y - (particle.vy || 0) * 0.06);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawJoystickOverlay() {
  if (!pointerControl.active) return;

  const dx = pointerControl.currentX - pointerControl.startX;
  const dy = pointerControl.currentY - pointerControl.startY;
  const length = Math.hypot(dx, dy) || 1;
  const knobDistance = Math.min(length, joystickMaxRadius);
  const knobX = pointerControl.startX + (dx / length) * knobDistance;
  const knobY = pointerControl.startY + (dy / length) * knobDistance;

  ctx.save();
  ctx.strokeStyle = "rgba(244, 240, 223, 0.28)";
  ctx.fillStyle = "rgba(244, 240, 223, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pointerControl.startX, pointerControl.startY, joystickMaxRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(244, 240, 223, 0.22)";
  ctx.beginPath();
  ctx.arc(knobX, knobY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCompletionBanner() {
  ctx.fillStyle = "rgba(24, 32, 35, 0.82)";
  ctx.fillRect(44, 276, 272, 76);
  ctx.strokeStyle = "#e2ba62";
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 276, 272, 76);
  ctx.fillStyle = "#f4f0df";
  ctx.font = "700 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Area Cleared", viewport.width / 2, 314);
}

function getBladeStart() {
  return vehicle.radius + 1;
}

function worldToBladeLocal(x, y) {
  // Blade-local x points forward through the scoop mouth; y spans left/right
  // across the lips. Most scoop logic is easier in this frame.
  const forwardX = vehicle.dirX;
  const forwardY = vehicle.dirY;
  const sideX = -forwardY;
  const sideY = forwardX;
  const dx = x - vehicle.x;
  const dy = y - vehicle.y;

  return {
    x: dx * forwardX + dy * forwardY,
    y: dx * sideX + dy * sideY,
  };
}

function localToWorldVector(x, y) {
  // Converts a direction or offset from blade-local space back to world space.
  // Positions still need the vehicle origin added afterward.
  const forwardX = vehicle.dirX;
  const forwardY = vehicle.dirY;
  const sideX = -forwardY;
  const sideY = forwardX;

  return {
    x: forwardX * x + sideX * y,
    y: forwardY * x + sideY * y,
  };
}

function worldVectorToBladeLocal(x, y) {
  // Vector conversion skips translation; this is used for velocities and slosh.
  const forwardX = vehicle.dirX;
  const forwardY = vehicle.dirY;
  const sideX = -forwardY;
  const sideY = forwardX;

  return {
    x: x * forwardX + y * forwardY,
    y: x * sideX + y * sideY,
  };
}

function bladeLocalToWorld(x, y) {
  // Full position conversion for points captured relative to the moving scoop.
  const offset = localToWorldVector(x, y);
  return {
    x: vehicle.x + offset.x,
    y: vehicle.y + offset.y,
  };
}

function getOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distanceBetween = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;

  if (distanceBetween >= minDistance) return null;

  const fallbackX = vehicle.dirX || 1;
  const fallbackY = vehicle.dirY || 0;
  const nx = distanceBetween > 0.001 ? dx / distanceBetween : fallbackX;
  const ny = distanceBetween > 0.001 ? dy / distanceBetween : fallbackY;

  return {
    x: nx,
    y: ny,
    depth: minDistance - distanceBetween,
  };
}

function clampToWalls(body, radius) {
  const bounds = getPlayableBounds(radius);
  body.x = clamp(body.x, bounds.minX, bounds.maxX);
  body.y = clamp(body.y, bounds.minY, bounds.maxY);
}

function clampVehicleAndBladeToWalls(blade = getCurrentBladeConfig()) {
  // Wall limits use the combined vehicle+scoop footprint, so the scoop cannot
  // pass through walls while the body remains inside.
  const correction = getVehicleAndBladeWallCorrection(blade);
  vehicle.x += correction.x;
  vehicle.y += correction.y;
  return correction;
}

function getVehicleAndBladeWallCorrection(blade) {
  const bounds = getVehicleAndBladeWorldBounds(blade);
  const playableBounds = getPlayableBounds();
  let x = 0;
  let y = 0;

  if (bounds.minX < playableBounds.minX) {
    x = playableBounds.minX - bounds.minX;
  } else if (bounds.maxX > playableBounds.maxX) {
    x = playableBounds.maxX - bounds.maxX;
  }

  if (bounds.minY < playableBounds.minY) {
    y = playableBounds.minY - bounds.minY;
  } else if (bounds.maxY > playableBounds.maxY) {
    y = playableBounds.maxY - bounds.maxY;
  }

  return { x, y };
}

function resolveVehicleAndToolCollisionZones(toolBoundary) {
  const totalCorrection = { x: 0, y: 0 };

  for (let iteration = 0; iteration < corridorCollisionIterations; iteration += 1) {
    const correction = resolveSingleVehicleAndToolZoneContactPass(toolBoundary);
    totalCorrection.x += correction.x;
    totalCorrection.y += correction.y;
    if (Math.abs(correction.x) + Math.abs(correction.y) <= 0.001) break;
  }

  return totalCorrection;
}

function resolveSingleVehicleAndToolZoneContactPass(toolBoundary) {
  const correction = { x: 0, y: 0 };

  for (const probe of getVehicleAndToolWallProbeCircles(toolBoundary)) {
    for (const zone of world.collisionZones) {
      const contact = getCircleRectContact(probe, zone);
      if (!contact) continue;

      vehicle.x += contact.x;
      vehicle.y += contact.y;
      correction.x += contact.x;
      correction.y += contact.y;
    }
  }

  return correction;
}

function getVehicleAndToolWallProbeCircles(toolBoundary) {
  const probes = [{ x: vehicle.x, y: vehicle.y, radius: vehicle.bodyRadius }];

  for (const collider of getCurrentToolSolidColliders(toolBoundary)) {
    if (collider.type === "circle") {
      const point = bladeLocalToWorld(collider.cx, collider.cy);
      probes.push({ x: point.x, y: point.y, radius: collider.radius });
    } else {
      addSegmentWallProbeCircles(probes, collider);
    }
  }

  return probes;
}

function addSegmentWallProbeCircles(probes, collider) {
  const points = [
    { x: collider.ax, y: collider.ay },
    { x: (collider.ax + collider.bx) / 2, y: (collider.ay + collider.by) / 2 },
    { x: collider.bx, y: collider.by },
  ];

  for (const point of points) {
    const worldPoint = bladeLocalToWorld(point.x, point.y);
    probes.push({ x: worldPoint.x, y: worldPoint.y, radius: collider.radius });
  }
}

function resolveMineralCollisionZoneContacts(mineral) {
  for (const zone of world.collisionZones) {
    const contact = getCircleRectContact(mineral, zone);
    if (!contact) continue;

    mineral.x += contact.x;
    mineral.y += contact.y;
    const normalSpeed = mineral.vx * contact.normalX + mineral.vy * contact.normalY;
    if (normalSpeed < 0) {
      mineral.vx -= (1 + wallBounceFactor) * normalSpeed * contact.normalX;
      mineral.vy -= (1 + wallBounceFactor) * normalSpeed * contact.normalY;
    }
  }
}

function getCollisionZoneAvoidanceVector(mineral, nearDistance) {
  let x = 0;
  let y = 0;

  for (const zone of world.collisionZones) {
    const contact = getCircleRectContact(mineral, zone, nearDistance);
    if (!contact) continue;
    x += contact.normalX;
    y += contact.normalY;
  }

  return { x, y };
}

function getCircleRectContact(circle, rect, tolerance = 0) {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;
  const closestX = clamp(circle.x, minX, maxX);
  const closestY = clamp(circle.y, minY, maxY);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const radius = circle.radius + tolerance;
  const inside = circle.x >= minX && circle.x <= maxX && circle.y >= minY && circle.y <= maxY;

  if (inside) {
    const left = circle.x - minX;
    const right = maxX - circle.x;
    const top = circle.y - minY;
    const bottom = maxY - circle.y;
    const nearest = Math.min(left, right, top, bottom);
    if (nearest === left) return makeRectContact(-1, 0, circle.radius + left);
    if (nearest === right) return makeRectContact(1, 0, circle.radius + right);
    if (nearest === top) return makeRectContact(0, -1, circle.radius + top);
    return makeRectContact(0, 1, circle.radius + bottom);
  }

  const distanceSq = dx * dx + dy * dy;
  if (distanceSq >= radius * radius) return null;

  const distanceBetween = Math.sqrt(distanceSq);
  if (distanceBetween <= 0.001) return null;
  const depth = radius - distanceBetween;
  return makeRectContact(dx / distanceBetween, dy / distanceBetween, depth);
}

function makeRectContact(normalX, normalY, depth) {
  return {
    normalX,
    normalY,
    depth,
    x: normalX * depth,
    y: normalY * depth,
  };
}

function resolveVehicleAndToolVeinContacts(toolBoundary) {
  const totalCorrection = { x: 0, y: 0 };

  for (let iteration = 0; iteration < getVeinCollisionIterationCount(); iteration += 1) {
    const correction = resolveSingleVehicleAndToolVeinContactPass(toolBoundary);
    totalCorrection.x += correction.x;
    totalCorrection.y += correction.y;
    if (Math.abs(correction.x) + Math.abs(correction.y) <= 0.001) break;
  }

  return totalCorrection;
}

function getVeinCollisionIterationCount() {
  return veins.reduce((maxIterations, vein) => {
    return Math.max(maxIterations, vein.config?.drill?.collisionIterations || veinCollisionIterations);
  }, veinCollisionIterations);
}

function resolveSingleVehicleAndToolVeinContactPass(toolBoundary) {
  const correction = { x: 0, y: 0 };

  for (const vein of veins) {
    for (const segment of vein.segments) {
      if (!isVeinSegmentSolid(segment)) continue;

      const bodyCorrection = resolveVehicleBodyVeinContact(segment);
      correction.x += bodyCorrection.x;
      correction.y += bodyCorrection.y;

      const toolCorrection = resolveToolVeinContact(segment, toolBoundary);
      correction.x += toolCorrection.x;
      correction.y += toolCorrection.y;
    }
  }

  return correction;
}

function resolveVehicleBodyVeinContact(segment) {
  if (!isVeinSegmentSolid(segment)) return { x: 0, y: 0 };

  const solid = segment.solidBody;
  const dx = vehicle.x - solid.x;
  const dy = vehicle.y - solid.y;
  const distanceBetween = Math.hypot(dx, dy);
  const combinedRadius = vehicle.bodyRadius + solid.radius;
  if (distanceBetween >= combinedRadius) return { x: 0, y: 0 };

  const normalX = distanceBetween > 0.001 ? dx / distanceBetween : -vehicle.dirX;
  const normalY = distanceBetween > 0.001 ? dy / distanceBetween : -vehicle.dirY;
  const depth = combinedRadius - distanceBetween + 0.01;
  const x = normalX * depth;
  const y = normalY * depth;
  vehicle.x += x;
  vehicle.y += y;
  return { x, y };
}

function resolveToolVeinContact(segment, toolBoundary) {
  if (!isVeinSegmentSolid(segment)) return { x: 0, y: 0 };

  let correction = { x: 0, y: 0 };
  const solid = segment.solidBody;

  for (const collider of getCurrentToolSolidColliders(toolBoundary)) {
    const solidLocal = worldToBladeLocal(solid.x, solid.y);
    const contact = collider.type === "circle"
      ? getCircleToolContactAgainstSolid(collider, solidLocal, solid.radius)
      : getSegmentToolContactAgainstSolid(collider, solidLocal, solid.radius);
    if (!contact || contact.depth <= 0) continue;

    const normal = localToWorldVector(contact.normal.x, contact.normal.y);
    const pushOut = Math.min(contact.depth + 0.01, maxScoopLipCorrectionPerSubstep);
    const x = -normal.x * pushOut;
    const y = -normal.y * pushOut;
    vehicle.x += x;
    vehicle.y += y;
    correction.x += x;
    correction.y += y;
  }

  return correction;
}

function getVehicleAndBladeWorldBounds(blade) {
  const bladeStart = getBladeStart();
  const bladeEnd = bladeStart + blade.length;
  const halfWidth = blade.width / 2;
  const sideRadius = blade.sideLipThickness / 2;
  const backRadius = blade.innerBackLipThickness / 2;
  const cornerRadius = Math.max(sideRadius, backRadius, blade.lipThickness / 2);
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };

  // A small set of endpoint circles is enough for wall clamping because the
  // scoop is convex in each facing direction and the lips are straight segments.
  expandBoundsWithLocalCircle(bounds, 0, 0, vehicle.radius);
  expandBoundsWithLocalCircle(bounds, bladeStart, -halfWidth, cornerRadius);
  expandBoundsWithLocalCircle(bounds, bladeStart, halfWidth, cornerRadius);
  expandBoundsWithLocalCircle(bounds, bladeEnd, -halfWidth, sideRadius);
  expandBoundsWithLocalCircle(bounds, bladeEnd, halfWidth, sideRadius);

  return bounds;
}

function expandBoundsWithLocalCircle(bounds, localX, localY, radius) {
  const offset = localToWorldVector(localX, localY);
  const x = vehicle.x + offset.x;
  const y = vehicle.y + offset.y;

  bounds.minX = Math.min(bounds.minX, x - radius);
  bounds.maxX = Math.max(bounds.maxX, x + radius);
  bounds.minY = Math.min(bounds.minY, y - radius);
  bounds.maxY = Math.max(bounds.maxY, y + radius);
}

function getCanvasPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
  return start + (end - start) * clamp(t, 0, 1);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (TOOL_KEY_BINDINGS[key]) {
    event.preventDefault();
    switchToolByKey(key);
    return;
  }

  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
}

function handleKeyUp(event) {
  keys.delete(event.key.toLowerCase());
}

function startPointerControl(point, pointerId = "mouse") {
  pointerControl.active = true;
  pointerControl.pointerId = pointerId;
  pointerControl.startX = point.x;
  pointerControl.startY = point.y;
  pointerControl.currentX = point.x;
  pointerControl.currentY = point.y;
  canvas.focus();
}

function movePointerControl(point, pointerId = "mouse") {
  if (!pointerControl.active || pointerControl.pointerId !== pointerId) return;
  pointerControl.currentX = point.x;
  pointerControl.currentY = point.y;
}

function stopPointerControl(pointerId = "mouse") {
  if (pointerControl.pointerId !== pointerId) return;
  pointerControl.active = false;
  pointerControl.pointerId = null;
}

function handlePointerDown(event) {
  startPointerControl(getCanvasPointerPosition(event), event.pointerId);
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handlePointerMove(event) {
  movePointerControl(getCanvasPointerPosition(event), event.pointerId);
  event.preventDefault();
}

function handlePointerUp(event) {
  stopPointerControl(event.pointerId);
  try {
    if (canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    // Pointer capture may already be released by the browser.
  }
  event.preventDefault();
}

function handleMouseDown(event) {
  startPointerControl(getCanvasPointerPosition(event));
  event.preventDefault();
}

function handleMouseMove(event) {
  movePointerControl(getCanvasPointerPosition(event));
  event.preventDefault();
}

function handleMouseUp(event) {
  stopPointerControl();
  event.preventDefault();
}

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);
canvas.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mousemove", handleMouseMove);
document.addEventListener("mouseup", handleMouseUp);
upgradeButton.addEventListener("click", buyUpgrade);
resetButton.addEventListener("click", resetGame);
canvas.addEventListener("click", () => canvas.focus());

resetGame();
requestAnimationFrame(update);







