const mineralCount = 60;
const vehicleSpeed = 175;
const joystickMaxRadius = 86;
const inputDeadZone = 8;
const facingSmoothingTime = 0.05;

const bladeWidth = 52;
const bladeLength = 38;
const bladeLipThickness = 8;
const bladeSurfaceAlpha = 0.09;
const innerBackLipPushForce = 920;
const innerBackLipThickness = 9;
const innerBackLipFriction = 0.94;
const sideLipInwardForce = 0;
const bodyMineralPushForce = 0;
const centerPullForce = 0;
const scoopMagnetForce = 0;
const scoopFrictionInside = 0.045;
const scoopVelocityInheritance = 0.08;
const maxAssistDisplacementPerFrame = 0;
const maxAssistAcceleration = 8;
const scoopContainmentTolerance = 5;
const containedStateHysteresis = 10;
const sideEscapeMargin = 4;
const sideLipThickness = 14;
const sideLipRestitution = 0.05;
const sideLipFriction = 0.9;
const sideInwardAttractionForce = 0;
const backLipRestitution = 0.02;
const maxScoopLipCorrectionPerSubstep = 8;
const scoopContainmentRange = 0;

const pushForce = 2.4;
const mineralFriction = 0.88;
const requiredPush = 1;
const saturationPush = 5;
const maxPushSpeed = 118;
const maxMineralSpeed = 126;
const maxCorrectionPerFrame = 1.7;
const mineralDampingInsideScoop = 1;
const physicsSubsteps = 3;
const maxImpulsePerMineralPerFrame = 36;

const wallBounceFactor = 0.22;
const wallContactTolerance = 3;
const stuckFrameThreshold = 24;
const stuckCorrectionForce = 42;

const mineralCounterForceToVehicle = 0;
const overloadMineralCountThreshold = 8;
const overloadSpeedPenalty = 0.38;
const overloadShakeAmount = 0.45;
const maxVehicleKnockback = 0;

const collectorRadius = 56;
const collectorPullForce = 360;
const upgradeCost = 20;
const upgradedPushForceMultiplier = 2.2;
const upgradedBladeWidthBonus = 10;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const coinsEl = document.getElementById("coins");
const collectedEl = document.getElementById("collected");
const pushStateEl = document.getElementById("pushState");
const messageEl = document.getElementById("message");
const upgradeButton = document.getElementById("upgradeButton");
const resetButton = document.getElementById("resetButton");

const world = {
  width: canvas.width,
  height: canvas.height,
  wall: 18,
};

const collector = {
  x: world.width / 2,
  y: 72,
  coreRadius: 15,
};

const vehicle = {
  x: world.width / 2,
  y: world.height - 78,
  radius: 15,
  bodyRadius: 12,
  dirX: 0,
  dirY: -1,
  overloadShake: 0,
  vx: 0,
  vy: 0,
};

const bladeTypes = {
  scoopBlade: {
    key: "scoopBlade",
    width: bladeWidth,
    length: bladeLength,
    lipThickness: bladeLipThickness,
    innerBackLipThickness,
    innerBackLipFriction,
    sideLipThickness,
    sideLipRestitution,
    sideLipFriction,
    surfaceAlpha: bladeSurfaceAlpha,
    innerBackLipPushForce,
    sideLipInwardForce,
  },
  // Future P0 hooks: magneticBlade, pushBlade, drillHead.
};

const activeBladeType = bladeTypes.scoopBlade;

const mineralType = {
  requiredPush,
  saturationPush,
  maxPushSpeed,
};

const pointerControl = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
};

const keys = new Set();
const completionTarget = Math.ceil(mineralCount * 0.8);
let minerals = [];
let particles = [];
let coins = 0;
let collected = 0;
let upgraded = false;
let complete = false;
let lastTime = 0;
let pushingCount = 0;

function resetGame() {
  vehicle.x = world.width / 2;
  vehicle.y = world.height - 78;
  vehicle.dirX = 0;
  vehicle.dirY = -1;
  vehicle.overloadShake = 0;
  vehicle.vx = 0;
  vehicle.vy = 0;
  minerals = createMinerals();
  particles = [];
  coins = 0;
  collected = 0;
  upgraded = false;
  complete = false;
  pushingCount = 0;
  lastTime = performance.now();
  messageEl.textContent = "Drag on the canvas to scoop minerals into the collector.";
  canvas.focus();
  updateHud();
}

function createMinerals() {
  const spawned = [];
  let attempts = 0;

  while (spawned.length < mineralCount && attempts < mineralCount * 80) {
    attempts += 1;
    const mineral = {
      x: random(world.wall + 28, world.width - world.wall - 28),
      y: random(collector.y + collectorRadius + 42, world.height - world.wall - 44),
      vx: 0,
      vy: 0,
      radius: 7,
      shake: 0,
      stuckFrames: 0,
      containedInScoop: false,
      containGrace: 0,
      type: mineralType,
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
  updateParticles(dt);
  draw();

  requestAnimationFrame(update);
}

function updateVehicle(dt) {
  const input = getControlInput();

  if (input.active) {
    smoothFacing(input.x, input.y, dt);
  }

  const blade = getCurrentBladeConfig();
  const currentLoad = input.active ? countScoopLoad(blade) : 0;
  const overload = getOverloadState(currentLoad);
  vehicle.overloadShake = overload.shake;

  const previousX = vehicle.x;
  const previousY = vehicle.y;
  vehicle.x += vehicle.dirX * vehicleSpeed * input.strength * overload.speedMultiplier * dt;
  vehicle.y += vehicle.dirY * vehicleSpeed * input.strength * overload.speedMultiplier * dt;
  clampToWalls(vehicle, vehicle.radius);
  vehicle.vx = (vehicle.x - previousX) / Math.max(dt, 0.001);
  vehicle.vy = (vehicle.y - previousY) / Math.max(dt, 0.001);

  separateVehicleBodyFromMinerals(dt);
  const bladeContactCount = applyBladeLipCollisions(dt, blade, input.active);
  pushingCount = input.active ? bladeContactCount : 0;
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
      clampToWalls(vehicle, vehicle.radius);
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
  return getScoopLocalState(mineral, blade).nearScoop;
}

function updateContainedState(mineral, blade) {
  const state = getScoopLocalState(mineral, blade);
  const clearlyExitedFront = state.local.x > state.bladeEnd + mineral.radius + containedStateHysteresis;
  const clearlyPastSide = Math.abs(state.local.y) > state.halfWidth + mineral.radius + sideEscapeMargin + containedStateHysteresis;
  const clearlyBehindBack = state.local.x < state.bladeStart - mineral.radius - containedStateHysteresis;

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
  const pushResponse = getSaturatedPushResponse(playerPushPower, mineralType);
  const impulseBudget = new Map();
  let loadCount = 0;
  const subDt = dt / physicsSubsteps;

  for (let step = 0; step < physicsSubsteps; step += 1) {
    for (const mineral of minerals) {
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
  if (playerPushPower < type.requiredPush) {
    return { accelScale: 0, speedCap: 0 };
  }

  const range = Math.max(type.saturationPush - type.requiredPush, 0.001);
  const normalized = clamp((playerPushPower - type.requiredPush) / range, 0, 1);
  const curve = 1 - Math.pow(1 - normalized, 2.4);
  const speedCap = type.maxPushSpeed * (0.35 + curve * 0.65);

  return {
    accelScale: 0.35 + curve * 0.65,
    speedCap,
  };
}

function getPlayerPushPower() {
  return upgraded ? pushForce * upgradedPushForceMultiplier : pushForce;
}

function getCurrentBladeConfig() {
  return {
    ...activeBladeType,
    width: activeBladeType.width + (upgraded ? upgradedBladeWidthBonus : 0),
  };
}

function capMineralSpeed(mineral, speedCap) {
  const cap = Math.min(speedCap, maxMineralSpeed);
  const speed = Math.hypot(mineral.vx, mineral.vy);
  if (speed <= cap || speed <= 0.001) return;
  const scale = cap / speed;
  mineral.vx *= scale;
  mineral.vy *= scale;
}

function updateMinerals(dt) {
  const blade = getCurrentBladeConfig();
  const passiveScoopResponse = { accelScale: 0, speedCap: maxMineralSpeed };

  for (let i = minerals.length - 1; i >= 0; i -= 1) {
    const mineral = minerals[i];
    applyStuckCorrection(mineral, dt);

    const toCollectorX = collector.x - mineral.x;
    const toCollectorY = collector.y - mineral.y;
    const collectorDistance = Math.hypot(toCollectorX, toCollectorY);

    if (collectorDistance < collectorRadius) {
      const pull = 1 - collectorDistance / collectorRadius;
      const nx = toCollectorX / Math.max(collectorDistance, 0.001);
      const ny = toCollectorY / Math.max(collectorDistance, 0.001);
      mineral.vx += nx * collectorPullForce * pull * dt;
      mineral.vy += ny * collectorPullForce * pull * dt;
    }

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

    const collectDistance = distance(mineral.x, mineral.y, collector.x, collector.y);
    if (collectDistance < collector.coreRadius) {
      collectMineral(i, mineral.x, mineral.y);
    }
  }

  resolveMineralContacts();
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
  for (let i = 0; i < minerals.length; i += 1) {
    for (let j = i + 1; j < minerals.length; j += 1) {
      const a = minerals[i];
      const b = minerals[j];
      const hit = getOverlap(a, b);
      if (!hit) continue;

      const separate = Math.min(hit.depth * 0.5, maxCorrectionPerFrame);
      a.x -= hit.x * separate;
      a.y -= hit.y * separate;
      b.x += hit.x * separate;
      b.y += hit.y * separate;

      const relativeVelocity = (b.vx - a.vx) * hit.x + (b.vy - a.vy) * hit.y;
      if (relativeVelocity < 0) {
        const impulse = clamp(relativeVelocity * 0.24, -maxImpulsePerMineralPerFrame * 0.35, maxImpulsePerMineralPerFrame * 0.35);
        a.vx += impulse * hit.x;
        a.vy += impulse * hit.y;
        b.vx -= impulse * hit.x;
        b.vy -= impulse * hit.y;
      }

      resolveWallContact(a);
      resolveWallContact(b);
    }
  }
}

function collectMineral(index, x, y) {
  minerals.splice(index, 1);
  coins += 1;
  collected += 1;
  spawnCollectFeedback(x, y);

  if (!complete && collected >= completionTarget) {
    complete = true;
    messageEl.textContent = "Area Cleared.";
  } else if (!complete) {
    messageEl.textContent = "Mineral collected.";
  }

  updateHud();
}

function spawnCollectFeedback(x, y) {
  particles.push({ x, y, age: 0, life: 0.42, radius: 8, text: "+1" });
  for (let i = 0; i < 7; i += 1) {
    const angle = (Math.PI * 2 * i) / 7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * random(20, 48),
      vy: Math.sin(angle) * random(20, 48),
      age: 0,
      life: random(0.24, 0.38),
      radius: random(2, 4),
      text: "",
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.age += dt;
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

  if (upgraded) {
    upgradeButton.textContent = "Push Power Upgraded";
    upgradeButton.disabled = true;
  } else {
    upgradeButton.textContent = `Push Power Upgrade - ${upgradeCost}`;
    upgradeButton.disabled = coins < upgradeCost;
  }
}

function buyUpgrade() {
  if (upgraded || coins < upgradeCost) return;
  coins -= upgradeCost;
  upgraded = true;
  messageEl.textContent = "Push power upgraded.";
  updateHud();
  canvas.focus();
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawGround();
  drawCollector();
  drawBladeSurface();
  for (const mineral of minerals) drawMineral(mineral);
  drawBladeRimAndVehicle();
  drawParticles();
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

function drawCollector() {
  ctx.save();
  ctx.translate(collector.x, collector.y);

  ctx.fillStyle = "rgba(94, 166, 146, 0.16)";
  ctx.beginPath();
  ctx.arc(0, 0, collectorRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6fd0b4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, collectorRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#6fd0b4";
  ctx.beginPath();
  ctx.arc(0, 0, collector.coreRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#10201e";
  ctx.font = "700 11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("IN", 0, 0);
  ctx.restore();
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

  ctx.fillStyle = "#cf6a3c";
  ctx.strokeStyle = "#52291e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-15, -11, 28, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#35464a";
  ctx.fillRect(-4, -7, 12, 14);

  ctx.fillStyle = "#243136";
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
  const shakeOffset = mineral.shake > 0 ? Math.sin(performance.now() * 0.08 + mineral.x) * 1.4 : 0;

  ctx.save();
  ctx.translate(mineral.x + shakeOffset, mineral.y);
  ctx.fillStyle = "#c9b26b";
  ctx.strokeStyle = "#7e6a38";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, mineral.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.beginPath();
  ctx.arc(-2.4, -2.4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    const t = particle.age / particle.life;
    ctx.globalAlpha = 1 - t;
    if (particle.text) {
      ctx.fillStyle = "#f4d66b";
      ctx.font = "700 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(particle.text, particle.x, particle.y - 10 - t * 12);
    } else {
      ctx.fillStyle = "#f4d66b";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * (1 - t * 0.4), 0, Math.PI * 2);
      ctx.fill();
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
  ctx.fillText("Area Cleared", world.width / 2, 314);
}

function getBladeStart() {
  return vehicle.radius + 1;
}

function worldToBladeLocal(x, y) {
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
  const forwardX = vehicle.dirX;
  const forwardY = vehicle.dirY;
  const sideX = -forwardY;
  const sideY = forwardX;

  return {
    x: forwardX * x + sideX * y,
    y: forwardY * x + sideY * y,
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







