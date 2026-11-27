// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (jump the sliding knives, chase the nearest corn, hide behind
// hay when the farmer hunts, sprint for the exit when the gate opens), so the
// frame is what a short game really looks like and the same seed always gives
// the same frame.
//
// The play and kitchen scenes are staged in two passes: a short autopilot run
// to get the world moving, then the farmer and a couple of knives are placed
// into the frame (hunting close behind the turkey / searching by the oven) and
// the game steps a little further. A final pose is applied after the settle —
// with no more steps before the paint, the frame is guaranteed to show the
// farmer in the intended state instead of whatever a last-moment knife hit
// reset him to.

import { FIELD, STEP, STAGES } from './config.js';
import { EVENT_ESCAPED, EVENT_OVER } from './world.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_RUN_SECONDS = 3;
const KITCHEN_RUN_SECONDS = 3.5;
const END_LIMIT_SECONDS = 45;

/** The autopilot's decisions for one step, from the live world state. */
function autopilot(state) {
  const p = state.player;
  const f = state.farmer;
  const controls = { move: 1, jump: false, sprint: false, hide: false };

  // Jump a sliding knife that is about to reach the turkey, or flap over the oven.
  for (const k of state.knives) {
    if (!k.active) continue;
    if (k.kind === 'slider' && k.x > p.x - 30 && k.x < p.x + 210 && k.y > FIELD.groundY - 90) {
      controls.jump = true;
    }
    if (k.kind === 'faller' && Math.abs(k.x - p.x) < 70 && k.y > p.y - 260 && k.y < p.y + 40) {
      controls.move = k.x > p.x ? -1 : 1;
    }
  }
  if (state.stageIndex === STAGES.length - 1 && p.onGround && p.x > 960 && p.x < 1180) {
    controls.jump = true;
    controls.sprint = true;
  }

  // Hide behind the nearest bale while the farmer hunts.
  if (f.state === 'hunt') {
    controls.sprint = true;
    let bestBale = null;
    let bestDist = Infinity;
    for (const b of state.bales) {
      const d = Math.abs(b.x + b.width / 2 - (p.x + p.width / 2));
      if (d < bestDist) {
        bestDist = d;
        bestBale = b;
      }
    }
    if (bestBale && bestDist < 260) {
      const centre = bestBale.x + bestBale.width / 2;
      const pc = p.x + p.width / 2;
      if (Math.abs(pc - centre) > 24) {
        controls.move = pc < centre ? 1 : -1;
      } else {
        controls.move = 0;
        controls.hide = true;
      }
      return controls;
    }
  }

  // Chase the nearest low corn when it is safe to reach.
  let corn = null;
  let cornDist = Infinity;
  for (const c of state.corns) {
    if (!c.active) continue;
    const d = Math.abs(c.x - p.x);
    if (d < cornDist) {
      cornDist = d;
      corn = c;
    }
  }
  if (corn && cornDist < 260 && cornDist > 12 && f.state !== 'hunt') {
    controls.move = corn.x > p.x ? 1 : -1;
  }

  // The gate is open: run for the exit.
  if (state.gateOpen) {
    controls.move = 1;
    controls.sprint = true;
  }
  return controls;
}

function runFor(world, seconds, controlsFn) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    events = world.step(STEP, controlsFn(world.state), false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
  }
  return events;
}

/** Drop a knife of the given kind into the frame at (x, y). */
function placeKnife(state, kind, x, y, speed) {
  for (const k of state.knives) {
    if (k.active) continue;
    k.active = true;
    k.kind = kind;
    if (kind === 'slider') {
      k.width = 64;
      k.height = 26;
      k.x = x;
      k.y = FIELD.groundY - k.height;
    } else {
      k.width = 30;
      k.height = 62;
      k.x = x;
      k.y = y;
    }
    k.speed = speed;
    return;
  }
}

/** Final pose for the play shot: the farmer hunting close behind the turkey. */
function poseHunt(state) {
  state.player.hidden = false;
  state.player.crouching = false;
  state.farmer.x = Math.max(60, state.player.x - 210);
  state.farmer.dir = 1;
  state.farmer.state = 'hunt';
  state.farmer.detection = 1;
  state.farmer.lastSeenX = state.player.x;
  state.farmer.noSight = 0;
  placeKnife(state, 'slider', state.player.x + 300, 0, 330);
}

/** Final pose for the kitchen shot: the farmer searching by the glowing oven. */
function poseKitchenSearch(state) {
  state.player.hidden = false;
  state.player.crouching = false;
  state.farmer.x = 880;
  state.farmer.dir = 1;
  state.farmer.state = 'search';
  state.farmer.lastSeenX = 980;
  state.farmer.stateTimer = 0;
  state.farmer.detection = 0.5;
  state.farmer.noSight = 0;
}

/**
 * Set `world` to the named scene (start, play, kitchen or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { move: 0, jump: false, sprint: false, hide: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 1250 };
  }

  if (name === 'play') {
    // Stage 3, Cornfield, mid-run: short autopilot run, then the farmer is
    // placed hunting close behind the turkey with knives in the air.
    world.setStage(2, Math.floor(STAGES[2].length * 0.4));
    runFor(world, PLAY_RUN_SECONDS, autopilot);
    const s = world.state;
    if (!s.escaped && !s.over) {
      poseHunt(s);
      runFor(world, 0.4, autopilot);
      // A knife hit during the settle resets the farmer to patrol; re-pose so
      // the painted frame shows the hunt.
      if (!s.escaped && !s.over) poseHunt(s);
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_CAUGHT : SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'kitchen') {
    // Stage 5, Kitchen: short run, then the turkey is mid-floor with the farmer
    // searching by the glowing oven and a knife sliding in.
    world.setStage(4, Math.floor(STAGES[4].length * 0.4));
    runFor(world, KITCHEN_RUN_SECONDS, autopilot);
    const s = world.state;
    if (!s.escaped && !s.over) {
      s.player.x = 560;
      s.player.y = FIELD.groundY - s.player.height;
      s.player.vy = 0;
      s.player.onGround = true;
      poseKitchenSearch(s);
      placeKnife(s, 'slider', 950, 0, 320);
      placeKnife(s, 'faller', 620, 100, 330);
      runFor(world, 0.4, autopilot);
      if (!s.escaped && !s.over) poseKitchenSearch(s);
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_CAUGHT : SCREEN_PLAY, best: world.state.score };
  }

  // End: the escape. Run the last stretch of the Kitchen with the autopilot;
  // if it somehow stalls, walk the turkey straight into the open gate.
  world.setStage(4, STAGES[4].length - 220);
  let events = runFor(world, END_LIMIT_SECONDS, autopilot);
  if (!(events & EVENT_ESCAPED) && !world.state.escaped) {
    world.state.player.x = FIELD.width - world.state.player.width - 5;
    world.state.player.invulnerable = 2;
    events = world.step(STEP, { move: 1, jump: false, sprint: false, hide: false }, false);
  }
  return { screen: world.state.escaped ? SCREEN_WIN : SCREEN_CAUGHT, best: world.state.score };
}
