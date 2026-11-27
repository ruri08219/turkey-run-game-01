// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// caught and escaped (win). Clicking a menu button or pressing Space/Enter starts,
// resumes and restarts; P or Escape pauses.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|kitchen|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
//
// window.__gobble exposes the live world and screen for automated play-testing
// (read-only from the outside: tests move the turkey by setting state, the game
// itself never reads it).

import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CORN, EVENT_ESCAPED, EVENT_HIT, EVENT_OVER, EVENT_SPOTTED, EVENT_STAGE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
  buttonRects, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let flapSoundAt = 0;

  // Test probe: live screen + world state for automated play-testing.
  window.__gobble = {
    world,
    get screen() {
      return screen;
    },
    get best() {
      return best;
    },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.gobble();
    announce(`Playing. Stage 1 Farmyard. ${LIVES} lives.`);
  }

  function endCaught() {
    screen = SCREEN_CAUGHT;
    audio.lose();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Caught for dinner. Score ${world.state.score}. Best ${best}.`);
  }

  function endEscaped() {
    screen = SCREEN_WIN;
    audio.win();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
  }

  function clickHitsButton(click) {
    if (!click) return null;
    const lx = click.x * FIELD.width;
    const ly = click.y * FIELD.height;
    for (const b of buttonRects(screen)) {
      if (lx >= b.x && lx <= b.x + b.width && ly >= b.y && ly <= b.y + b.height) return b.id;
    }
    return null;
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      const button = clickHitsButton(click);
      if (screen === SCREEN_TITLE && (button === 'start' || !click)) startGame();
      else if (screen === SCREEN_CAUGHT && (button === 'restart' || !click)) startGame();
      else if (screen === SCREEN_WIN && (button === 'restart' || !click)) startGame();
      else if (screen === SCREEN_PAUSED && button === 'resume') {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (screen === SCREEN_PAUSED && button === 'restart') startGame();
      else if (screen === SCREEN_PAUSED && !click) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { move: 0, jump: false, sprint: false, hide: false }, true);
      return;
    }
    const controls = input.controls();
    if (controls.jump && !world.state.player.onGround && world.state.player.flapped) {
      // Flap sound once per air-flap.
      if (performance.now() - flapSoundAt > 300) {
        audio.flap();
        flapSoundAt = performance.now();
      }
    }
    const events = world.step(STEP, controls, false);
    if (events & EVENT_CORN) audio.pickup();
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('Spotted! The farmer is hunting you — hide or sprint!');
    }
    if (events & EVENT_STAGE) {
      audio.stageClear();
      audio.gobble();
      announce(`Stage ${world.state.stageIndex + 1}.`);
    }
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.lives === 1 ? 'Hit! 1 life left.' : `Hit! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_OVER) endCaught();
    else if (events & EVENT_ESCAPED) endEscaped();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Run. Press Space or click Start to escape the farm.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
