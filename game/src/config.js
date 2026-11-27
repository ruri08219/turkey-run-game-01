// GOBBLE RUN — tuning, stages and palette in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  width: 56,
  height: 66,
  walkSpeed: 265,
  sprintSpeed: 430,
  jumpVel: 640,
  gravity: 1650,
  invulnerable: 2.0,
  staminaMax: 100,
  staminaDrain: 42, // per second while sprinting
  staminaRegen: 26, // per second while not sprinting
  sprintMin: 12, // need at least this much stamina to start a sprint
};

export const LIVES = 3;

/** Five stages of rising difficulty, farmyard to kitchen. */
export const STAGES = [
  {
    name: 'Farmyard', length: 1500, knifeInterval: 2.6, fallers: false,
    farmerSpeed: 118, chaseSpeed: 292, vision: 300, corn: 7, bales: 3,
    objective: 'Sneak past the farmer — reach the barn door',
    sky: '#f6b352', skyTop: '#e98f3d', ground: '#8a5a2b', grass: '#c98a3d',
  },
  {
    name: 'Barn', length: 1750, knifeInterval: 2.2, fallers: false,
    farmerSpeed: 128, chaseSpeed: 302, vision: 320, corn: 8, bales: 4,
    objective: 'Slip through the barn — mind the sliding knives',
    sky: '#7a4a26', skyTop: '#5d3418', ground: '#6e4520', grass: '#a06a32',
  },
  {
    name: 'Cornfield', length: 2000, knifeInterval: 1.9, fallers: true,
    farmerSpeed: 138, chaseSpeed: 312, vision: 330, corn: 10, bales: 4,
    objective: 'Hide in the corn rows — knives fall from above now',
    sky: '#f2a541', skyTop: '#d97f2e', ground: '#7d5226', grass: '#b5772f',
  },
  {
    name: 'Farmhouse', length: 2250, knifeInterval: 1.6, fallers: true,
    farmerSpeed: 150, chaseSpeed: 324, vision: 350, corn: 10, bales: 3,
    objective: 'Cross the farmhouse — the farmer is faster and sharper-eyed',
    sky: '#8a5a30', skyTop: '#6b3f1e', ground: '#5f3d1e', grass: '#8f6234',
  },
  {
    name: 'Kitchen', length: 2500, knifeInterval: 1.35, fallers: true,
    farmerSpeed: 162, chaseSpeed: 338, vision: 370, corn: 12, bales: 2,
    objective: 'Escape the kitchen — dodge the knives and the HOT oven!',
    sky: '#a85a28', skyTop: '#7c3d16', ground: '#4e3018', grass: '#7a4e28',
  },
];

export const KNIFE = {
  sliderWidth: 64, sliderHeight: 26, sliderSpeed: 300, sliderSpeedPerStage: 26,
  fallerWidth: 30, fallerHeight: 62, fallerSpeed: 330, fallerSpeedPerStage: 28,
  dodgePoints: 2,
};

export const CORN = { size: 30, points: 10, distancePoints: 5, distanceEvery: 200 };

/** The oven hot zone in the Kitchen stage (stage index 4). */
export const OVEN = { x: 1020, width: 220, burnSeconds: 1.2 };

export const FARMER = {
  width: 54, height: 108,
  detectionRate: 1 / 0.9, // seconds of clear sight to go from calm to HUNTING
  detectionDecay: 1 / 0.45,
  hiddenDecay: 1 / 0.25,
  loseSightSeconds: 2.5, // hunting with no sight this long -> SEARCHING
  searchSeconds: 3.2,
  catchDistance: 30,
};

export const PALETTE = {
  backdrop: '#241608',
  turkeyBody: '#8a5230',
  turkeyDark: '#6e3f22',
  turkeyTail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a1e'],
  turkeyHead: '#e8dcc8',
  wattle: '#e5534b',
  beak: '#f2a541',
  farmerShirt: '#c0392b',
  farmerOveralls: '#3a5a8c',
  farmerSkin: '#e8b98a',
  farmerHat: '#e8c33c',
  knifeBlade: '#dfe4ea',
  knifeHandle: '#5d3418',
  corn: '#f2c94c',
  cornHusk: '#7fae4c',
  panel: '#2e1c0c',
  panelEdge: '#e8a33c',
  text: '#fdf3e0',
  muted: '#d9b98a',
  danger: '#ff5a3c',
  good: '#7fd67f',
  stamina: '#f2c94c',
  detection: '#ffcf3c',
  bale: '#d9a441',
  baleDark: '#b57f2a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
