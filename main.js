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
const activeBladeType = BLADE_TYPES.scoopBlade;
const activeCrusherType = CRUSHER_TYPES.embeddedGroundCrusher;
const activeUpgradeDef = UPGRADE_DEFS.pushPower1;
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
  width: mapWidth,
  height: mapHeight,
  wall: 24,
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
  x: world.wall + 66,
  y: 108,
  sellRadius: crusherSellRadius,
  pitWidth: crusherProcessingPitWidth,
  pitHeight: crusherProcessingPitHeight,
};

// Vehicle position, facing, and motion. bodyRadius is the physical body contact
// size; radius is the larger drawn/footprint size used by wall clamping.
const vehicle = {
  x: world.width / 2,
  y: world.height - 78,
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
let crusherBatches = []; // Background crusher jobs created after fast unload.
let nextCrusherBatchId = 1; // Stable id so delivered ore can notify its processing batch.
let crusherRollerSpin = 0; // Visual rotation phase for the dual crusher shafts.
let crusherLoopSoundActive = false; // Placeholder sound state to avoid repeated loop-start hooks.

function resetGame() {
  vehicle.x = world.width / 2;
  vehicle.y = world.height - 78;
  vehicle.dirX = 0;
  vehicle.dirY = -1;
  vehicle.isReversing = false;
  vehicle.overloadShake = 0;
  vehicle.vx = 0;
  vehicle.vy = 0;
  minerals = createMinerals();
  particles = [];
  crusherBatches = [];
  nextCrusherBatchId = 1;
  crusherRollerSpin = 0;
  crusherLoopSoundActive = false;
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

  while (spawned.length < mineralCount && attempts < mineralCount * 80) {
    attempts += 1;
    const oreType = DEFAULT_ORE_TYPE;
    // Each mineral keeps both physics data and P0.3 scoop-state data. The
    // secured/delivery fields stay dormant while the mineral is loose.
    const mineral = {
      x: random(world.wall + 28, world.width - world.wall - 28),
      y: random(crusher.y + crusher.sellRadius + 42, world.height - world.wall - 44),
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
      type: oreType,
    };

    const awayFromVehicle = distance(mineral.x, mineral.y, vehicle.x, vehicle.y) > 56;
    const awayFromMinerals = spawned.every((other) => distance(mineral.x, mineral.y, other.x, other.y) > mineral.radius * 2.6);

    if (awayFromVehicle && awayFromMinerals) {
      spawned.push(mineral);
    }
  }

  return spawned;
}

function update(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;

  updateVehicle(dt);
  updateMinerals(dt);
  updateCrusherBatches(dt);
  updateParticles(dt);
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
  camera.x = clamp(camera.x, 0, Math.max(0, world.width - getCameraViewWidth()));
  camera.y = clamp(camera.y, 0, Math.max(0, world.height - getCameraViewHeight()));
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

function updateVehicle(dt) {
  const input = getControlInput();
  const movement = getVehicleMovementIntent(input);

  if (input.active && !movement.isReversing) {
    smoothFacing(input.x, input.y, dt);
  }
  vehicle.isReversing = movement.isReversing;

  const blade = getCurrentBladeConfig();
  const currentLoad = input.active ? countScoopLoad(blade) : 0;
  const overload = getOverloadState(currentLoad);
  vehicle.overloadShake = overload.shake;

  const previousX = vehicle.x;
  const previousY = vehicle.y;
  const speedMultiplier = movement.speedMultiplier * overload.speedMultiplier;
  vehicle.x += movement.x * vehicle.chassis.speed * input.strength * speedMultiplier * dt;
  vehicle.y += movement.y * vehicle.chassis.speed * input.strength * speedMultiplier * dt;
  clampVehicleAndBladeToWalls(blade);
  vehicle.vx = (vehicle.x - previousX) / Math.max(dt, 0.001);
  vehicle.vy = (vehicle.y - previousY) / Math.max(dt, 0.001);

  separateVehicleBodyFromMinerals(dt);
  const bladeContactCount = applyBladeLipCollisions(dt, blade, input.active);
  pushingCount = input.active ? bladeContactCount : 0;
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

function getCurrentBladeConfig() {
  const lipCollision = activeBladeType.lipCollision;
  const assist = activeBladeType.specialAssist;
  return {
    ...activeBladeType,
    width: activeBladeType.width + getUpgradeEffect("blade.width", 0),
    capacity: activeBladeType.capacity + getUpgradeEffect("blade.capacity", 0),
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
    applyScoopAreaDamping(mineral, dt);
    resolveBladeLipContactsForMineral(mineral, blade, dt, passiveScoopResponse, null, false);
    capMineralSpeed(mineral, maxMineralSpeed);
    mineral.shake = Math.max(0, mineral.shake - dt);

    resolveWallContact(mineral);

  }

  resolveMineralContacts();
  syncScoopLoadCount();

  // Capture is evaluated after physics so minerals must actually settle into
  // the scoop for a moment before becoming secured.
  updateScoopCaptureCandidates(blade, dt);
  tryStartSecuredOreDelivery();
  syncScoopLoadCount();
  updateHud();
}

function resolveWallContact(mineral) {
  const minX = world.wall + mineral.radius;
  const maxX = world.width - world.wall - mineral.radius;
  const minY = world.wall + mineral.radius;
  const maxY = world.height - world.wall - mineral.radius;

  if (mineral.x < minX) {
    mineral.x = minX;
    if (mineral.vx < 0) mineral.vx = -mineral.vx * wallBounceFactor;
  } else if (mineral.x <= minX + wallContactTolerance && mineral.vx < 0) {
    mineral.vx = -mineral.vx * wallBounceFactor;
  }

  if (mineral.x > maxX) {
    mineral.x = maxX;
    if (mineral.vx > 0) mineral.vx = -mineral.vx * wallBounceFactor;
  } else if (mineral.x >= maxX - wallContactTolerance && mineral.vx > 0) {
    mineral.vx = -mineral.vx * wallBounceFactor;
  }

  if (mineral.y < minY) {
    mineral.y = minY;
    if (mineral.vy < 0) mineral.vy = -mineral.vy * wallBounceFactor;
  } else if (mineral.y <= minY + wallContactTolerance && mineral.vy < 0) {
    mineral.vy = -mineral.vy * wallBounceFactor;
  }

  if (mineral.y > maxY) {
    mineral.y = maxY;
    if (mineral.vy > 0) mineral.vy = -mineral.vy * wallBounceFactor;
  } else if (mineral.y >= maxY - wallContactTolerance && mineral.vy > 0) {
    mineral.vy = -mineral.vy * wallBounceFactor;
  }
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
  const minX = world.wall + mineral.radius;
  const maxX = world.width - world.wall - mineral.radius;
  const minY = world.wall + mineral.radius;
  const maxY = world.height - world.wall - mineral.radius;
  const nearDistance = wallContactTolerance + 2;
  let x = 0;
  let y = 0;

  if (mineral.x <= minX + nearDistance) x += 1;
  if (mineral.x >= maxX - nearDistance) x -= 1;
  if (mineral.y <= minY + nearDistance) y += 1;
  if (mineral.y >= maxY - nearDistance) y -= 1;

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
  drawCrusher();
  drawBladeSurface();
  for (const mineral of minerals) drawMineral(mineral);
  drawBladeRimAndVehicle();
  drawParticles("world");
  ctx.restore();
  drawParticles("screen");
  drawJoystickOverlay();
  if (complete) drawCompletionBanner();
}

function drawGround() {
  ctx.fillStyle = "#31251e";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = "#182023";
  ctx.fillRect(0, 0, world.width, world.wall);
  ctx.fillRect(0, world.height - world.wall, world.width, world.wall);
  ctx.fillRect(0, 0, world.wall, world.height);
  ctx.fillRect(world.width - world.wall, 0, world.wall, world.height);

  ctx.strokeStyle = "rgba(244, 240, 223, 0.06)";
  ctx.lineWidth = 1;
  for (let x = world.wall; x <= world.width - world.wall; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, world.wall);
    ctx.lineTo(x, world.height - world.wall);
    ctx.stroke();
  }
  for (let y = world.wall; y <= world.height - world.wall; y += 36) {
    ctx.beginPath();
    ctx.moveTo(world.wall, y);
    ctx.lineTo(world.width - world.wall, y);
    ctx.stroke();
  }
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
  const blade = getCurrentBladeConfig();
  const skin = vehicle.skin;
  const start = getBladeStart();
  const end = start + blade.length;
  const halfWidth = blade.width / 2;

  ctx.save();
  applyVehicleDrawTransform();

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
  body.x = clamp(body.x, world.wall + radius, world.width - world.wall - radius);
  body.y = clamp(body.y, world.wall + radius, world.height - world.wall - radius);
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
  let x = 0;
  let y = 0;

  if (bounds.minX < world.wall) {
    x = world.wall - bounds.minX;
  } else if (bounds.maxX > world.width - world.wall) {
    x = world.width - world.wall - bounds.maxX;
  }

  if (bounds.minY < world.wall) {
    y = world.wall - bounds.minY;
  } else if (bounds.maxY > world.height - world.wall) {
    y = world.height - world.wall - bounds.maxY;
  }

  return { x, y };
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







