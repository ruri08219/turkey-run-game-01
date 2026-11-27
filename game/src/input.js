// Keyboard and pointer input. Held keys give steering, jumping, sprinting and
// hiding; one-shot presses (confirm, pause, mute) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost and never
// counted twice. Pointer clicks on menu buttons are also queued as confirms
// with the click position, so main.js can hit-test the button rectangles.
//
// Space is both the jump key and a confirm key: on a menu it starts the game
// (the queued jump then gives the turkey a little hop as the run begins), and
// in play it only jumps, because confirms are ignored while playing.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const HIDE = new Set(['KeyH', 'ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let jump = false;
  let jumpQueued = false;
  let sprint = false;
  let hide = false;
  let actions = 0;
  let lastClick = null;

  function releaseAll() {
    left = false;
    right = false;
    jump = false;
    sprint = false;
    hide = false;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) {
      if (!event.repeat) {
        jumpQueued = true;
        if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
      }
      jump = true;
    } else if (SPRINT.has(event.code)) sprint = true;
    else if (HIDE.has(event.code)) hide = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (JUMP.has(event.code)) jump = false;
    else if (SPRINT.has(event.code)) sprint = false;
    else if (HIDE.has(event.code)) hide = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', releaseAll);

  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    lastClick = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The live control snapshot for this frame. `jump` is edge-triggered (true once per press). */
    controls() {
      const snapshot = {
        move: (right ? 1 : 0) - (left ? 1 : 0),
        jump: jumpQueued,
        sprint,
        hide,
      };
      jumpQueued = false;
      return snapshot;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last pointer click in 0..1 canvas fractions (or null), consumed on read. */
    takeClick() {
      const click = lastClick;
      lastClick = null;
      return click;
    },
  };
}
