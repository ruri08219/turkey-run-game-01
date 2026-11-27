// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Every sprite is drawn in canvas code — a plump
// turkey with a fanned tail, a straw-hatted farmer with a vision cone, hay bales,
// corn rows, sliding carving knives and a glowing kitchen oven — in one coherent
// autumn palette. No images, no network.

import { CORN, FIELD, FONT, LIVES, OVEN, PALETTE, PLAYER, STAGES } from './config.js';
import { FARMER_HUNT, FARMER_PATROL, FARMER_SEARCH } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

const LIFE_SIZE = 22;
const LIFE_GAP = 8;
/** Outdoor stages get sun, clouds and hills; indoor ones (Barn, Farmhouse, Kitchen) do not. */
const OUTDOOR = new Set([0, 2]);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  // ---------- scenery ----------

  function drawSky(stage, index) {
    const g = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    g.addColorStop(0, stage.skyTop);
    g.addColorStop(1, stage.sky);
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    if (!OUTDOOR.has(index)) return; // indoors: no sun, no clouds, no hills
    // Low autumn sun.
    context.fillStyle = '#ffe9a8';
    context.beginPath();
    context.arc(1120, 110, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 233, 168, 0.25)';
    context.beginPath();
    context.arc(1120, 110, 70, 0, Math.PI * 2);
    context.fill();
    // Drifting clouds.
    context.fillStyle = 'rgba(253, 243, 224, 0.75)';
    const clouds = [[180, 90], [520, 60], [830, 130]];
    for (const [cx, cy] of clouds) {
      context.beginPath();
      context.ellipse(cx, cy, 70, 20, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 6, 52, 16, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Rolling hills.
    context.fillStyle = 'rgba(90, 52, 18, 0.35)';
    context.beginPath();
    context.moveTo(0, FIELD.groundY - 60);
    context.quadraticCurveTo(320, FIELD.groundY - 150, 640, FIELD.groundY - 70);
    context.quadraticCurveTo(960, FIELD.groundY - 130, 1280, FIELD.groundY - 60);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.closePath();
    context.fill();
  }

  function drawStageProps(state, index) {
    const t = state.elapsed;
    if (index === 0) {
      // Farmyard: red barn silhouette + picket fence.
      context.fillStyle = '#7c2d1e';
      context.fillRect(60, FIELD.groundY - 210, 220, 210);
      context.beginPath();
      context.moveTo(40, FIELD.groundY - 210);
      context.lineTo(170, FIELD.groundY - 300);
      context.lineTo(300, FIELD.groundY - 210);
      context.closePath();
      context.fill();
      context.fillStyle = '#fdf3e0';
      context.fillRect(150, FIELD.groundY - 130, 40, 60);
      context.strokeStyle = '#e8dcc8';
      context.lineWidth = 4;
      context.strokeRect(96, FIELD.groundY - 180, 44, 44);
      context.strokeRect(200, FIELD.groundY - 180, 44, 44);
      // Picket fence along the ground.
      context.fillStyle = '#c9a06a';
      for (let x = 340; x < 1280; x += 46) {
        context.fillRect(x, FIELD.groundY - 44, 10, 44);
        context.beginPath();
        context.moveTo(x, FIELD.groundY - 44);
        context.lineTo(x + 5, FIELD.groundY - 56);
        context.lineTo(x + 10, FIELD.groundY - 44);
        context.closePath();
        context.fill();
      }
      context.fillRect(340, FIELD.groundY - 34, 940, 6);
      context.fillRect(340, FIELD.groundY - 18, 940, 6);
    } else if (index === 1) {
      // Barn interior: timber beams and hanging lantern.
      context.fillStyle = 'rgba(0,0,0,0.18)';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.fillStyle = '#4e3018';
      context.fillRect(0, 120, FIELD.width, 26);
      context.fillRect(0, 300, FIELD.width, 22);
      for (let x = 120; x < 1280; x += 240) context.fillRect(x, 0, 26, FIELD.groundY);
      const sway = Math.sin(t * 1.4) * 8;
      context.strokeStyle = '#2e1c0c';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(640 + sway, 146);
      context.lineTo(640 + sway, 190);
      context.stroke();
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.arc(640 + sway, 210, 22, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffdf6b';
      context.beginPath();
      context.arc(640 + sway, 210, 12, 0, Math.PI * 2);
      context.fill();
    } else if (index === 2) {
      // Cornfield: tall corn rows behind the run lane.
      for (let x = 20; x < 1280; x += 64) {
        const h = 150 + ((x * 7) % 60);
        context.strokeStyle = '#5d7a2e';
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(x, FIELD.groundY);
        context.lineTo(x + 6, FIELD.groundY - h);
        context.stroke();
        context.fillStyle = '#7fae4c';
        context.beginPath();
        context.ellipse(x + 16, FIELD.groundY - h + 30, 26, 10, -0.5, 0, Math.PI * 2);
        context.ellipse(x - 12, FIELD.groundY - h + 60, 24, 9, 0.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.corn;
        context.beginPath();
        context.ellipse(x + 10, FIELD.groundY - h + 70, 9, 20, 0.2, 0, Math.PI * 2);
        context.fill();
      }
    } else if (index === 3) {
      // Farmhouse: wallpaper, window with evening light, side table.
      context.fillStyle = 'rgba(0,0,0,0.22)';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.fillStyle = '#e8dcc8';
      context.fillRect(90, 120, 150, 180);
      context.fillStyle = '#f6b352';
      context.fillRect(100, 130, 130, 160);
      context.strokeStyle = '#7a4a26';
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(165, 130);
      context.lineTo(165, 290);
      context.moveTo(100, 210);
      context.lineTo(230, 210);
      context.stroke();
      context.fillStyle = '#5d3418';
      context.fillRect(1020, FIELD.groundY - 120, 190, 120);
      context.fillStyle = '#e8a33c';
      context.fillRect(1030, FIELD.groundY - 150, 170, 34);
      context.fillStyle = '#e5534b';
      context.beginPath();
      context.arc(1115, FIELD.groundY - 165, 18, 0, Math.PI * 2);
      context.fill();
    } else {
      // Kitchen: tiled wall, hanging pans, big oven on the right.
      context.fillStyle = 'rgba(0,0,0,0.25)';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.strokeStyle = 'rgba(253,243,224,0.14)';
      context.lineWidth = 2;
      for (let y = 40; y < FIELD.groundY; y += 56) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(FIELD.width, y);
        context.stroke();
      }
      for (let x = 30; x < 1000; x += 90) {
        context.fillStyle = '#2e2a26';
        context.beginPath();
        context.arc(x, 90, 26, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#4a4238';
        context.beginPath();
        context.arc(x, 90, 18, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#6e4520';
      context.fillRect(120, FIELD.groundY - 130, 300, 130);
      context.fillStyle = '#8a5a2b';
      context.fillRect(120, FIELD.groundY - 146, 300, 16);
    }
  }

  function drawGround(state) {
    const stage = STAGES[state.stageIndex];
    context.fillStyle = stage.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = stage.grass;
    context.fillRect(0, FIELD.groundY, FIELD.width, 8);
    // Scattered autumn leaves.
    context.fillStyle = 'rgba(232, 163, 60, 0.7)';
    for (let i = 0; i < 14; i += 1) {
      const lx = (i * 173 + 40) % 1280;
      const ly = FIELD.groundY + 22 + ((i * 37) % 64);
      context.beginPath();
      context.ellipse(lx, ly, 7, 3, (i % 5) * 0.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBale(bale) {
    const by = FIELD.groundY - bale.height;
    context.fillStyle = PALETTE.bale;
    roundRect(context, bale.x, by, bale.width, bale.height, 10);
    context.fill();
    context.strokeStyle = PALETTE.baleDark;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(bale.x + 6, by + 18);
    context.lineTo(bale.x + bale.width - 6, by + 18);
    context.moveTo(bale.x + 6, by + bale.height - 18);
    context.lineTo(bale.x + bale.width - 6, by + bale.height - 18);
    context.stroke();
    context.fillStyle = PALETTE.baleDark;
    context.beginPath();
    context.ellipse(bale.x + bale.width / 2, by + bale.height / 2, 12, 20, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawGate(state) {
    const stage = STAGES[state.stageIndex];
    const gx = FIELD.width - 46;
    const gy = FIELD.groundY - 190;
    if (state.gateOpen) {
      const pulse = 0.6 + Math.sin(state.elapsed * 6) * 0.25;
      context.fillStyle = `rgba(127, 214, 127, ${pulse})`;
      context.fillRect(gx - 8, gy - 8, 62, 206);
      context.fillStyle = '#fdf3e0';
      context.fillRect(gx, gy, 46, 198);
      context.fillStyle = '#2e7d32';
      text('EXIT', gx + 23, gy + 100, 20, '#2e7d32', 'center', true);
    } else {
      context.fillStyle = 'rgba(253,243,224,0.35)';
      context.fillRect(gx, gy, 46, 198);
      const remain = Math.max(0, Math.ceil((stage.length - state.distance) / 20));
      text(`${remain}m`, gx + 23, gy - 12, 18, PALETTE.text, 'center', true);
    }
  }

  function drawOven(state) {
    const ox = OVEN.x;
    const oy = FIELD.groundY - 210;
    const flicker = Math.sin(state.elapsed * 11) * 6;
    // Heat glow.
    context.fillStyle = 'rgba(255, 90, 60, 0.35)';
    context.fillRect(ox - 20, oy - 10, OVEN.width + 40, 230);
    context.fillStyle = '#3a3a3a';
    roundRect(context, ox, oy, OVEN.width, 210, 8);
    context.fill();
    context.fillStyle = '#555';
    context.fillRect(ox + 14, oy + 14, OVEN.width - 28, 70);
    // Fire in the oven window.
    context.fillStyle = '#ff7a2e';
    context.beginPath();
    context.moveTo(ox + 40, oy + 70);
    context.quadraticCurveTo(ox + 70, oy + 10 + flicker, ox + 100, oy + 70);
    context.quadraticCurveTo(ox + 130, oy + 20 - flicker, ox + 160, oy + 70);
    context.quadraticCurveTo(ox + 180, oy + 76, ox + 40, oy + 70);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffd23c';
    context.beginPath();
    context.ellipse(ox + 110, oy + 62, 34, 12, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#222';
    context.fillRect(ox + 14, oy + 100, OVEN.width - 28, 96);
    context.strokeStyle = '#888';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(ox + 30, oy + 130);
    context.lineTo(ox + OVEN.width - 30, oy + 130);
    context.moveTo(ox + 30, oy + 164);
    context.lineTo(ox + OVEN.width - 30, oy + 164);
    context.stroke();
    // Heat waves rising.
    context.strokeStyle = 'rgba(255, 180, 90, 0.6)';
    context.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const wx = ox + 40 + i * 70;
      context.beginPath();
      context.moveTo(wx, oy - 6);
      context.quadraticCurveTo(wx + 10, oy - 30, wx, oy - 54);
      context.stroke();
    }
    text('HOT OVEN', ox + OVEN.width / 2, oy - 64, 20, PALETTE.danger, 'center', true);
    const exposure = state.player.ovenExposure;
    if (exposure > 0) {
      context.fillStyle = PALETTE.danger;
      context.fillRect(ox, oy - 40, OVEN.width * Math.min(1, exposure / 1.2), 8);
      text('BURNING!', ox + OVEN.width / 2, oy - 84, 22, PALETTE.danger, 'center', true);
    }
  }

  function drawCorn(corn) {
    const bobY = Math.sin(corn.bob * 3) * 3;
    const x = corn.x;
    const y = corn.y + bobY;
    context.fillStyle = PALETTE.cornHusk;
    context.beginPath();
    context.moveTo(x - 4, y + CORN.size);
    context.lineTo(x - 14, y + CORN.size + 12);
    context.lineTo(x + 6, y + CORN.size + 4);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.corn;
    context.beginPath();
    context.ellipse(x + CORN.size / 2, y + CORN.size / 2, 11, 17, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#d9a441';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + CORN.size / 2 - 5, y + 6);
    context.lineTo(x + CORN.size / 2 - 5, y + CORN.size - 6);
    context.moveTo(x + CORN.size / 2 + 5, y + 6);
    context.lineTo(x + CORN.size / 2 + 5, y + CORN.size - 6);
    context.stroke();
  }

  function drawKnife(knife) {
    if (knife.kind === 'slider') {
      const tip = knife.x;
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(tip, knife.y + knife.height / 2);
      context.lineTo(tip + knife.width * 0.62, knife.y + 2);
      context.lineTo(tip + knife.width * 0.62, knife.y + knife.height - 2);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.knifeHandle;
      roundRect(context, tip + knife.width * 0.62, knife.y + 3, knife.width * 0.34, knife.height - 6, 5);
      context.fill();
      context.fillStyle = '#e8dcc8';
      context.fillRect(tip + knife.width * 0.62, knife.y + knife.height / 2 - 2, knife.width * 0.1, 4);
    } else {
      const handle = knife.height * 0.32;
      context.fillStyle = PALETTE.knifeHandle;
      context.fillRect(knife.x + knife.width * 0.38, knife.y, knife.width * 0.24, handle);
      context.fillStyle = PALETTE.knifeBlade;
      context.beginPath();
      context.moveTo(knife.x, knife.y + handle);
      context.lineTo(knife.x + knife.width, knife.y + handle);
      context.lineTo(knife.x + knife.width / 2, knife.y + knife.height);
      context.closePath();
      context.fill();
    }
  }

  // ---------- characters ----------

  function drawTurkey(player, t) {
    const cx = player.x + player.width / 2;
    const base = player.y + player.height;
    const moving = Math.abs(player.vx) > 20;
    const stepPhase = moving ? Math.sin(t * 14) * 7 : 0;
    const squash = player.crouching || player.hidden ? 0.72 : 1;
    const flip = player.facing < 0 ? -1 : 1;
    context.save();
    context.translate(cx, base);
    context.scale(flip, squash);
    context.translate(-cx, -base);
    // Legs.
    context.strokeStyle = '#f2a541';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(cx - 10, base - 8);
    context.lineTo(cx - 10 + stepPhase, base);
    context.moveTo(cx + 10, base - 8);
    context.lineTo(cx + 10 - stepPhase, base);
    context.stroke();
    // Tail fan.
    for (let i = 0; i < 4; i += 1) {
      context.fillStyle = PALETTE.turkeyTail[i];
      context.beginPath();
      context.arc(cx - 16, base - 34, 30 - i * 4, Math.PI * 0.85, Math.PI * 1.9);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx, base - 26, 26, 24, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx + 4, base - 18, 16, 12, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx - 2, base - 28, 14, 9, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head, beak, wattle, eye.
    const hx = cx + 22;
    const hy = base - 52;
    context.fillStyle = PALETTE.turkeyHead;
    context.beginPath();
    context.arc(hx, hy, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(hx + 10, hy - 2);
    context.lineTo(hx + 24, hy + 3);
    context.lineTo(hx + 10, hy + 7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(hx + 6, hy + 12, 4, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#222';
    context.beginPath();
    context.arc(hx + 5, hy - 4, 2.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (player.hidden) {
      text('HIDDEN', cx, player.y - 14, 16, PALETTE.good, 'center', true);
    }
  }

  function drawFarmer(state) {
    const f = state.farmer;
    const def = STAGES[state.stageIndex];
    const cx = f.x + f.width / 2;
    const base = f.y + f.height;
    const bobY = Math.sin(f.bob * 9) * 2;
    const hunting = f.state === FARMER_HUNT;
    // Vision cone.
    const range = def.vision;
    const dir = f.dir;
    const coneColor = hunting ? 'rgba(255, 60, 40, 0.20)' : 'rgba(255, 207, 60, 0.13)';
    context.fillStyle = coneColor;
    context.beginPath();
    context.moveTo(cx, f.y + 26);
    context.lineTo(cx + dir * range, f.y - 30);
    context.lineTo(cx + dir * range, f.y + 110);
    context.closePath();
    context.fill();
    context.save();
    context.translate(cx, base + bobY);
    context.scale(dir, 1);
    context.translate(-cx, -(base + bobY));
    // Legs (overalls).
    context.fillStyle = PALETTE.farmerOveralls;
    const legSwing = Math.sin(f.bob * 9) * 6;
    context.fillRect(cx - 16, base - 46, 13, 46);
    context.fillRect(cx + 4, base - 46, 13, 46);
    context.fillStyle = '#3a2c1c';
    context.fillRect(cx - 18 + legSwing, base - 8, 17, 8);
    context.fillRect(cx + 2 - legSwing, base - 8, 17, 8);
    // Torso (shirt + overalls).
    context.fillStyle = PALETTE.farmerShirt;
    roundRect(context, cx - 22, base - 96, 44, 54, 8);
    context.fill();
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(cx - 18, base - 62, 36, 22);
    context.fillStyle = '#d9b98a';
    context.fillRect(cx - 3, base - 62, 6, 22);
    // Arm + pitchfork when hunting.
    context.strokeStyle = PALETTE.farmerShirt;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(cx + 16, base - 88);
    context.lineTo(cx + 34, base - 58);
    context.stroke();
    if (hunting) {
      context.strokeStyle = '#8a6a3a';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(cx + 34, base - 110);
      context.lineTo(cx + 44, base - 30);
      context.stroke();
      context.strokeStyle = '#c9ced6';
      context.lineWidth = 3;
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(cx + 44 + i * 7, base - 30);
        context.lineTo(cx + 44 + i * 7, base - 46);
        context.stroke();
      }
    }
    // Head.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(cx + 4, base - 108, 16, 0, Math.PI * 2);
    context.fill();
    // Nose + moustache.
    context.fillStyle = '#d99a6a';
    context.beginPath();
    context.arc(cx + 20, base - 106, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#5d3418';
    context.fillRect(cx + 8, base - 98, 18, 4);
    // Straw hat.
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(cx + 4, base - 120, 26, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(cx + 4, base - 122, 13, Math.PI, 0);
    context.fill();
    context.fillStyle = '#c0392b';
    context.fillRect(cx - 9, base - 124, 26, 5);
    context.restore();
    // State tag above his head.
    const label = f.state === FARMER_HUNT ? 'HUNTING!' : f.state === FARMER_SEARCH ? 'SEARCHING…' : 'PATROLLING';
    const color = f.state === FARMER_HUNT ? PALETTE.danger : f.state === FARMER_SEARCH ? '#ffb347' : PALETTE.text;
    text(label, cx, f.y - 16, 18, color, 'center', true);
    if (f.detection > 0.05 && f.state !== FARMER_HUNT) {
      context.fillStyle = PALETTE.detection;
      context.fillRect(cx - 40, f.y - 8, 80 * f.detection, 5);
    }
  }

  // ---------- HUD ----------

  function drawHud(state, best) {
    const stage = STAGES[state.stageIndex];
    const p = state.player;
    // Top bar.
    context.fillStyle = 'rgba(20, 10, 2, 0.72)';
    context.fillRect(0, 0, FIELD.width, 66);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, 66, FIELD.width, 3);
    text(`STAGE ${state.stageIndex + 1}/5 · ${stage.name.toUpperCase()}`, 20, 30, 24, PALETTE.text, 'left', true);
    text(stage.objective, 20, 56, 15, PALETTE.muted, 'left');
    // Centre: score, distance, timer. Distance is capped at the stage goal:
    // the turkey still has to run to the exit after the gate opens, and the
    // meter should read full, not over-full, while it does.
    text(`SCORE ${state.score}`, 560, 30, 24, PALETTE.corn, 'center', true);
    const goalM = Math.ceil(stage.length / 20);
    const distM = Math.min(Math.floor(state.distance / 20), goalM);
    text(`DIST ${distM}/${goalM}m`, 560, 56, 15, PALETTE.text, 'center');
    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    text(`TIME ${mins}:${String(secs).padStart(2, '0')}`, 760, 30, 20, PALETTE.text, 'center', true);
    text(`BEST ${best}`, 760, 56, 15, PALETTE.muted, 'center');
    // Lives (hearts).
    text('LIVES', 900, 30, 16, PALETTE.text, 'left', true);
    for (let i = 0; i < LIVES; i += 1) {
      const hx = 900 + i * (LIFE_SIZE + LIFE_GAP);
      const hy = 40;
      context.fillStyle = i < state.lives ? '#e5534b' : 'rgba(253,243,224,0.25)';
      context.beginPath();
      context.moveTo(hx + 11, hy + 18);
      context.bezierCurveTo(hx - 2, hy + 8, hx + 2, hy - 2, hx + 11, hy + 5);
      context.bezierCurveTo(hx + 20, hy - 2, hx + 24, hy + 8, hx + 11, hy + 18);
      context.fill();
    }
    // Detection meter.
    const det = state.farmer.detection;
    const detLabel = p.hidden ? 'HIDDEN' : state.farmer.state === FARMER_HUNT ? 'SPOTTED!' : det > 0.35 ? 'SUSPICIOUS' : 'UNSEEN';
    const detColor = p.hidden ? PALETTE.good : state.farmer.state === FARMER_HUNT ? PALETTE.danger : PALETTE.detection;
    text(`FARMER ${detLabel}`, 1060, 22, 14, detColor, 'left', true);
    context.fillStyle = 'rgba(253,243,224,0.25)';
    roundRect(context, 1060, 30, 200, 12, 6);
    context.fill();
    context.fillStyle = detColor;
    roundRect(context, 1060, 30, 200 * det, 12, 6);
    context.fill();
    // Stamina bar.
    text('SPRINT', 1060, 58, 13, PALETTE.stamina, 'left', true);
    context.fillStyle = 'rgba(253,243,224,0.25)';
    roundRect(context, 1120, 48, 140, 10, 5);
    context.fill();
    context.fillStyle = p.stamina < PLAYER.sprintMin ? PALETTE.danger : PALETTE.stamina;
    roundRect(context, 1120, 48, 140 * (p.stamina / 100), 10, 5);
    context.fill();
    // Stage progress strip.
    const prog = Math.min(1, state.distance / stage.length);
    context.fillStyle = 'rgba(253,243,224,0.2)';
    context.fillRect(0, 69, FIELD.width, 5);
    context.fillStyle = state.gateOpen ? PALETTE.good : PALETTE.corn;
    context.fillRect(0, 69, FIELD.width * prog, 5);
    // Bottom legend.
    context.fillStyle = 'rgba(20, 10, 2, 0.6)';
    context.fillRect(0, FIELD.height - 30, FIELD.width, 30);
    text('← → / A D move · SPACE jump / flap · SHIFT sprint · H / ↓ hide behind hay · P pause · M mute', 16, FIELD.height - 10, 15, PALETTE.muted, 'left');
    text('🌽 corn +10 · 🔪 knife −1♥ · 🔥 oven burns · 🚪 reach EXIT when the bar is full', FIELD.width - 16, FIELD.height - 10, 15, PALETTE.muted, 'right');
    // Stage banner.
    if (state.banner > 0) {
      const a = Math.min(1, state.banner);
      context.fillStyle = `rgba(20, 10, 2, ${0.55 * a})`;
      roundRect(context, FIELD.width / 2 - 260, 120, 520, 64, 12);
      context.fill();
      text(`STAGE ${state.stageIndex + 1} — ${stage.name.toUpperCase()}`, FIELD.width / 2, 148, 28, PALETTE.text, 'center', true);
      text(stage.objective, FIELD.width / 2, 172, 16, PALETTE.muted, 'center');
    }
    // Hurt flash.
    if (state.hurtFlash > 0) {
      context.fillStyle = `rgba(255, 60, 40, ${state.hurtFlash * 0.7})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawField(state) {
    drawSky(STAGES[state.stageIndex], state.stageIndex);
    drawStageProps(state, state.stageIndex);
    drawGround(state);
    const hidden = state.player.hidden;
    // Hay bales behind the turkey; when hidden, a second bale pass covers it.
    for (const b of state.bales) drawBale(b);
    drawGate(state);
    if (state.stageIndex === STAGES.length - 1) drawOven(state);
    for (const c of state.corns) if (c.active) drawCorn(c);
    for (const k of state.knives) if (k.active) drawKnife(k);
    drawFarmer(state);
    const player = state.player;
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      drawTurkey(player, state.elapsed);
    }
    if (hidden) for (const b of state.bales) drawBale(b);
  }

  // ---------- panels & buttons ----------

  function drawButton(rect, label, accent) {
    context.fillStyle = accent ? '#e8a33c' : 'rgba(253,243,224,0.16)';
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.fill();
    context.strokeStyle = accent ? '#7a4a26' : PALETTE.muted;
    context.lineWidth = 2;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.stroke();
    text(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 8, 22, accent ? '#2e1c0c' : PALETTE.text, 'center', true);
  }

  function panelRect(lines) {
    const width = 640;
    const height = 150 + lines.length * 32 + 96;
    return { x: (FIELD.width - width) / 2, y: (FIELD.height - height) / 2, width, height };
  }

  function drawPanel(title, lines, buttons, titleColor) {
    const rect = panelRect(lines);
    context.fillStyle = 'rgba(10, 5, 1, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 16);
    context.stroke();
    text(title, FIELD.width / 2, rect.y + 66, 46, titleColor || PALETTE.text, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, rect.y + 116 + i * 32, 20, PALETTE.muted, 'center');
    }
    for (const b of buttons) drawButton(b.rect, b.label, b.accent);
    return rect;
  }

  function drawTitle(state, best) {
    drawField(state);
    const lines = [
      'Thanksgiving is coming — and YOU are the dinner.',
      'Outrun the farmer through 5 stages: Farmyard → Barn → Cornfield → Farmhouse → Kitchen.',
      'Hide behind hay, sprint when he hunts, jump the knives, and never stand in the oven.',
      `Best score: ${best}`,
    ];
    const buttons = [{ id: 'start', label: '▶  START THE ESCAPE', accent: true, rect: { x: 470, y: 470, width: 340, height: 56 } }];
    // Panel first (its dim overlay would wash out anything drawn before it),
    // then the big title above the panel, clear of it.
    drawPanel('Escape or be dinner', lines, buttons);
    text('🦃  GOBBLE RUN', FIELD.width / 2, 108, 64, '#f2c94c', 'center', true);
    text('5 Stages from Farmyard to Kitchen', FIELD.width / 2, 142, 22, PALETTE.text, 'center');
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
      return;
    }
    drawField(state);
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      const buttons = [
        { id: 'resume', label: '▶  RESUME', accent: true, rect: { x: 380, y: 430, width: 220, height: 54 } },
        { id: 'restart', label: '↻  RESTART', accent: false, rect: { x: 680, y: 430, width: 220, height: 54 } },
      ];
      drawPanel('Paused', ['The farmer is waiting. The oven is still hot.', ''], buttons);
    } else if (screen === SCREEN_CAUGHT) {
      const lines = [
        `The farmer caught you on Stage ${state.stageIndex + 1} — ${STAGES[state.stageIndex].name}.`,
        `Score ${state.score} · Best ${best} · Distance ${Math.floor(state.distance / 20)}m`,
        'Tip: hide behind hay when the meter turns yellow, sprint only when he hunts.',
      ];
      const buttons = [{ id: 'restart', label: '↻  TRY AGAIN', accent: true, rect: { x: 470, y: 470, width: 340, height: 56 } }];
      drawPanel('CAUGHT FOR DINNER', lines, buttons, PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      const lines = [
        'You slipped out the kitchen door and into the woods — FREE!',
        `Score ${state.score} · Best ${best} · Time ${Math.floor(state.elapsed / 60)}:${String(Math.floor(state.elapsed % 60)).padStart(2, '0')}`,
        'The farmer is still searching the cornfield. Gobble gobble!',
      ];
      const buttons = [{ id: 'restart', label: '↻  RUN AGAIN', accent: true, rect: { x: 470, y: 470, width: 340, height: 56 } }];
      drawPanel('🦃  ESCAPED!', lines, buttons, PALETTE.good);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

/** Clickable buttons for a screen, in logical 1280x720 coordinates. */
export function buttonRects(screen) {
  if (screen === SCREEN_TITLE) {
    return [{ id: 'start', x: 470, y: 470, width: 340, height: 56 }];
  }
  if (screen === SCREEN_PAUSED) {
    return [
      { id: 'resume', x: 380, y: 430, width: 220, height: 54 },
      { id: 'restart', x: 680, y: 430, width: 220, height: 54 },
    ];
  }
  if (screen === SCREEN_CAUGHT || screen === SCREEN_WIN) {
    return [{ id: 'restart', x: 470, y: 470, width: 340, height: 56 }];
  }
  return [];
}
