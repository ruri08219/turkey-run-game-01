// The game's rules and state, with no drawing and no browser in it: the turkey's
// run-and-hide movement, the farmer's patrol / hunt / search mind, sliding and
// falling carving knives, the kitchen oven, corn pickups, five stages and lives.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sound, announcements) without the world knowing about screens.
// Distance only counts ground the turkey actually covers: running into a wall
// earns nothing.

import { CORN, FARMER, FIELD, KNIFE, LIVES, OVEN, PLAYER, STAGES } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_STAGE = 16;
export const EVENT_SPOTTED = 32;

export const FARMER_PATROL = 'patrol';
export const FARMER_HUNT = 'hunt';
export const FARMER_SEARCH = 'search';

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: 90, y: FIELD.groundY - PLAYER.height, width: PLAYER.width, height: PLAYER.height,
    vx: 0, vy: 0, onGround: true, facing: 1, flapped: false,
    stamina: PLAYER.staminaMax, invulnerable: 0, hidden: false, crouching: false,
    ovenExposure: 0, animTime: 0, sprinting: false,
  };
  const farmer = {
    x: 700, y: FIELD.groundY - FARMER.height, width: FARMER.width, height: FARMER.height,
    dir: -1, state: FARMER_PATROL, stateTimer: 0, detection: 0,
    lastSeenX: 700, noSight: 0, patrolMin: 420, patrolMax: 1080, bob: 0,
  };
  const knives = [];
  for (let i = 0; i < 24; i += 1) knives.push({ active: false, kind: 'slider', x: 0, y: 0, width: 0, height: 0, speed: 0 });
  const corns = [];
  for (let i = 0; i < 16; i += 1) corns.push({ active: false, x: 0, y: 0, width: CORN.size, height: CORN.size, bob: 0 });
  const bales = [];

  const state = {
    player, farmer, knives, corns, bales,
    stageIndex: 0, distance: 0, score: 0, lives: LIVES,
    elapsed: 0, stageTime: 0, knifeTimer: 2.0, cornTimer: 0.5,
    escaped: false, over: false, gateOpen: false, banner: 0,
    milestone: CORN.distanceEvery, ovenHot: false, hurtFlash: 0,
  };

  function stage() {
    return STAGES[state.stageIndex];
  }

  function placeBales() {
    bales.length = 0;
    const def = stage();
    for (let i = 0; i < def.bales; i += 1) {
      const x = 300 + i * (760 / Math.max(1, def.bales)) + random() * 90;
      bales.push({ x, width: 92, height: 74 });
    }
  }

  function spawnCornAt(index) {
    const c = corns[index];
    c.active = true;
    c.x = 180 + random() * (FIELD.width - 360);
    const raised = random() < 0.35;
    c.y = raised ? FIELD.groundY - 118 : FIELD.groundY - CORN.size - 6;
    c.bob = random() * 6.28;
  }

  function resetStage() {
    const def = stage();
    state.distance = 0;
    state.stageTime = 0;
    state.gateOpen = false;
    state.milestone = CORN.distanceEvery;
    state.knifeTimer = 1.6;
    state.cornTimer = 0.4;
    state.banner = 2.4;
    player.x = 90;
    player.y = FIELD.groundY - PLAYER.height;
    player.vy = 0;
    player.onGround = true;
    player.stamina = PLAYER.staminaMax;
    player.invulnerable = 0;
    player.ovenExposure = 0;
    player.hidden = false;
    farmer.x = 760 + random() * 220;
    farmer.dir = -1;
    farmer.state = FARMER_PATROL;
    farmer.stateTimer = 0;
    farmer.detection = 0;
    farmer.noSight = 0;
    farmer.patrolMin = 430;
    farmer.patrolMax = 1060;
    for (const k of knives) k.active = false;
    placeBales();
    for (let i = 0; i < corns.length; i += 1) {
      corns[i].active = i < def.corn;
      if (corns[i].active) spawnCornAt(i);
    }
  }

  function reset() {
    state.stageIndex = 0;
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.escaped = false;
    state.over = false;
    state.hurtFlash = 0;
    resetStage();
  }

  /** Jump the world to a stage with some distance already run (used by screenshot scenes). */
  function setStage(index, distance) {
    state.stageIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    resetStage();
    state.distance = distance;
    state.gateOpen = distance >= stage().length;
  }

  function freeKnife() {
    for (const k of knives) if (!k.active) return k;
    return null;
  }

  function spawnKnife() {
    const def = stage();
    const k = freeKnife();
    if (k === null) return;
    const faller = def.fallers && random() < 0.45;
    k.active = true;
    if (faller) {
      k.kind = 'faller';
      k.width = KNIFE.fallerWidth;
      k.height = KNIFE.fallerHeight;
      k.x = 120 + random() * (FIELD.width - 240);
      k.y = -k.height;
      k.speed = KNIFE.fallerSpeed + KNIFE.fallerSpeedPerStage * state.stageIndex + random() * 60;
    } else {
      k.kind = 'slider';
      k.width = KNIFE.sliderWidth;
      k.height = KNIFE.sliderHeight;
      k.x = FIELD.width + 10;
      k.y = FIELD.groundY - k.height;
      k.speed = KNIFE.sliderSpeed + KNIFE.sliderSpeedPerStage * state.stageIndex + random() * 70;
    }
  }

  function baleBetween(ax, bx) {
    const lo = Math.min(ax, bx);
    const hi = Math.max(ax, bx);
    for (const b of bales) {
      if (b.x + b.width > lo + 20 && b.x < hi - 20) return true;
    }
    return false;
  }

  function nearBale() {
    const cx = player.x + player.width / 2;
    for (const b of bales) {
      if (cx > b.x - 46 && cx < b.x + b.width + 46) return b;
    }
    return null;
  }

  function hurt(events) {
    state.lives -= 1;
    player.invulnerable = PLAYER.invulnerable;
    player.ovenExposure = 0;
    player.x = Math.max(24, player.x - 90);
    player.y = FIELD.groundY - PLAYER.height;
    player.vy = 0;
    player.onGround = true;
    state.hurtFlash = 0.35;
    farmer.state = FARMER_PATROL;
    farmer.stateTimer = 0;
    farmer.detection = 0;
    farmer.x = Math.min(FIELD.width - 120, farmer.x + 260);
    if (state.lives <= 0) {
      state.lives = 0;
      state.over = true;
      return events | EVENT_HIT | EVENT_OVER;
    }
    return events | EVENT_HIT;
  }

  /**
   * One fixed step. `controls` is { move, jump, sprint, hide }. With `harmless`
   * set (the title screen's backdrop) things move but nothing touches the player
   * and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    if (state.escaped || state.over) return events;
    const def = stage();
    state.elapsed += dt;
    state.stageTime += dt;
    if (state.banner > 0) state.banner -= dt;
    if (state.hurtFlash > 0) state.hurtFlash -= dt;
    player.animTime += dt;
    farmer.bob += dt;

    // --- Turkey movement ---
    const wantSprint = !harmless && controls.sprint && player.stamina > PLAYER.sprintMin && controls.move !== 0;
    player.sprinting = wantSprint;
    const speed = wantSprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (harmless) {
      player.vx = 0;
    } else if (player.hidden) {
      player.vx = 0;
    } else {
      player.vx = controls.move * (player.crouching ? speed * 0.45 : speed);
      if (controls.move !== 0) player.facing = controls.move;
    }
    if (wantSprint) player.stamina = Math.max(0, player.stamina - PLAYER.staminaDrain * dt);
    else player.stamina = Math.min(PLAYER.staminaMax, player.stamina + PLAYER.staminaRegen * dt);

    if (!harmless && controls.jump) {
      if (player.onGround) {
        player.vy = -PLAYER.jumpVel;
        player.onGround = false;
        player.flapped = false;
      } else if (!player.flapped) {
        // One mid-air flap: a second chance over a knife or the oven.
        player.vy = -430;
        player.flapped = true;
      }
    }
    player.vy += PLAYER.gravity * dt;
    const prevX = player.x;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.y >= FIELD.groundY - PLAYER.height) {
      player.y = FIELD.groundY - PLAYER.height;
      player.vy = 0;
      player.onGround = true;
    }
    player.x = Math.min(FIELD.width - player.width - 4, Math.max(24, player.x));
    // Distance counts only ground actually covered (clamped movement earns nothing).
    if (!harmless) {
      const covered = player.x - prevX;
      if (covered > 0) {
        state.distance += covered;
        if (state.distance >= state.milestone) {
          state.score += CORN.distancePoints;
          state.milestone += CORN.distanceEvery;
        }
        if (state.distance >= def.length) state.gateOpen = true;
      }
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    // --- Hiding ---
    const bale = nearBale();
    player.hidden = !harmless && !!controls.hide && !!bale && player.onGround;
    player.crouching = !harmless && !!controls.hide && !player.hidden && player.onGround;

    // --- Farmer AI ---
    const fdx = player.x + player.width / 2 - (farmer.x + farmer.width / 2);
    const inFront = (fdx > 0) === (farmer.dir > 0) || Math.abs(fdx) < 46;
    const blocked = player.hidden || baleBetween(farmer.x + farmer.width / 2, player.x + player.width / 2);
    const inRange = Math.abs(fdx) < def.vision && Math.abs(player.y - farmer.y) < 130;
    const seen = !harmless && inFront && inRange && !blocked;
    if (seen) {
      farmer.lastSeenX = player.x;
      farmer.noSight = 0;
      const rate = FARMER.detectionRate * (player.crouching ? 0.5 : 1);
      const before = farmer.detection;
      farmer.detection = Math.min(1, farmer.detection + rate * dt);
      if (before < 1 && farmer.detection >= 1 && farmer.state !== FARMER_HUNT) {
        farmer.state = FARMER_HUNT;
        farmer.stateTimer = 0;
        events |= EVENT_SPOTTED;
      }
      if (farmer.detection > 0.35 && farmer.state === FARMER_PATROL) {
        farmer.dir = fdx > 0 ? 1 : -1; // suspicious: turns toward the rustle
      }
    } else {
      const decay = player.hidden ? FARMER.hiddenDecay : FARMER.detectionDecay;
      farmer.detection = Math.max(0, farmer.detection - decay * dt);
      farmer.noSight += dt;
    }

    if (farmer.state === FARMER_PATROL) {
      farmer.x += farmer.dir * def.farmerSpeed * dt;
      if (farmer.x < farmer.patrolMin) { farmer.x = farmer.patrolMin; farmer.dir = 1; }
      if (farmer.x > farmer.patrolMax) { farmer.x = farmer.patrolMax; farmer.dir = -1; }
    } else if (farmer.state === FARMER_HUNT) {
      const chaseDir = fdx > 0 ? 1 : -1;
      farmer.dir = chaseDir;
      farmer.x += chaseDir * def.chaseSpeed * dt;
      farmer.x = Math.min(FIELD.width - farmer.width - 4, Math.max(24, farmer.x));
      if (!harmless && Math.abs(fdx) < FARMER.catchDistance && player.invulnerable === 0) {
        events = hurt(events);
        if (events & EVENT_OVER) return events;
      }
      if (farmer.noSight > FARMER.loseSightSeconds) {
        farmer.state = FARMER_SEARCH;
        farmer.stateTimer = 0;
      }
    } else if (farmer.state === FARMER_SEARCH) {
      farmer.stateTimer += dt;
      const sdx = farmer.lastSeenX - farmer.x;
      if (Math.abs(sdx) > 24) {
        farmer.dir = sdx > 0 ? 1 : -1;
        farmer.x += farmer.dir * def.farmerSpeed * 1.25 * dt;
      } else if (farmer.stateTimer > FARMER.searchSeconds) {
        farmer.state = FARMER_PATROL;
        farmer.stateTimer = 0;
        farmer.detection = 0;
      }
    }

    // --- Knives ---
    state.knifeTimer -= dt;
    if (state.knifeTimer <= 0) {
      spawnKnife();
      state.knifeTimer += def.knifeInterval * (0.8 + random() * 0.45);
    }
    for (const k of knives) {
      if (!k.active) continue;
      if (k.kind === 'slider') {
        k.x -= k.speed * dt;
        if (k.x + k.width < 0) {
          k.active = false;
          if (!harmless) state.score += KNIFE.dodgePoints;
          continue;
        }
      } else {
        k.y += k.speed * dt;
        if (k.y > FIELD.groundY) {
          k.active = false;
          continue;
        }
      }
      if (harmless || player.invulnerable > 0 || player.hidden) continue;
      if (overlaps(k, player)) {
        k.active = false;
        events = hurt(events);
        if (events & EVENT_OVER) return events;
      }
    }

    // --- Oven (Kitchen stage only) ---
    state.ovenHot = false;
    if (state.stageIndex === STAGES.length - 1 && !harmless) {
      const inOven = player.onGround && player.x + player.width > OVEN.x && player.x < OVEN.x + OVEN.width;
      if (inOven && player.invulnerable === 0) {
        state.ovenHot = true;
        player.ovenExposure += dt;
        if (player.ovenExposure >= OVEN.burnSeconds) {
          events = hurt(events);
          if (events & EVENT_OVER) return events;
        }
      } else {
        player.ovenExposure = Math.max(0, player.ovenExposure - dt * 2);
      }
    }

    // --- Corn ---
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      for (let i = 0; i < corns.length; i += 1) {
        if (!corns[i].active) { spawnCornAt(i); break; }
      }
      state.cornTimer += 1.2 + random() * 1.6;
    }
    for (const c of corns) {
      if (!c.active) continue;
      c.bob += dt;
      if (harmless) continue;
      if (overlaps({ x: c.x - 6, y: c.y - 6, width: CORN.size + 12, height: CORN.size + 12 }, player)) {
        c.active = false;
        state.score += CORN.points;
        events |= EVENT_CORN;
      }
    }

    // --- Exit gate ---
    if (state.gateOpen && !harmless && player.x + player.width >= FIELD.width - 8) {
      if (state.stageIndex === STAGES.length - 1) {
        state.escaped = true;
        return events | EVENT_ESCAPED;
      }
      state.stageIndex += 1;
      resetStage();
      return events | EVENT_STAGE;
    }
    return events;
  }

  reset();
  return { state, reset, resetStage, setStage, step, stage };
}
