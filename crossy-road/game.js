// ─────────────────────────────────────────────
//  Crossy Road  –  Oblique projection renderer
//  Matches the original game's camera angle:
//  very shallow top-down with strong front faces
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Canvas size ───────────────────────────────
canvas.width  = 640;
canvas.height = 560;

// ── Projection constants ──────────────────────
// The original uses a cabinet/cavalier oblique projection:
// x-axis goes right, "depth" axis goes up-right at ~30°.
// Each GRID column = CELL_W pixels wide
// Each GRID row    = CELL_D pixels of vertical screen space (the "depth" recession)
// Objects have a pixel HEIGHT (CELL_H) that draws straight down.

const COLS   = 13;    // columns across
const ROWS   = 10;    // visible rows
const CELL_W = 52;    // pixels per grid column
const CELL_D = 44;    // pixels of screen-Y per row (how much rows recede)
const CELL_H = 28;    // default block face height (front face)

// Camera: worldRow at top of screen
let cameraRow = 0;

// Screen position of grid cell (col, row) — returns top-left of ground tile
function proj(col, row) {
  return {
    x: col * CELL_W,
    y: (row - cameraRow) * CELL_D,
  };
}

// ── Colour palette ────────────────────────────
const C = {
  // Grass
  grassTop   : '#78c832',
  grassFront : '#5aaa18',
  grassShadow: '#4a9010',
  // Road
  roadTop    : '#888888',
  roadFront  : '#606060',
  roadDash   : '#cccccc',
  // Water
  waterTop   : '#52c8f0',
  waterFront : '#38aad8',
  waterFoam  : 'rgba(255,255,255,0.5)',
  // Log
  logTop     : '#8b4a1a',
  logFront   : '#6b3010',
  logShadow  : 'rgba(0,0,0,0.25)',
  // Trees – lime green chunky blocks
  tree1Top   : '#78c832',
  tree1Front : '#5aaa18',
  tree2Top   : '#5aaa18',
  tree2Front : '#3e8808',
  tree3Top   : '#3e8808',
  tree3Front : '#2a6600',
  trunkTop   : '#8b5e2a',
  trunkFront : '#6b4010',
  // Cars
  cars: [
    // orange-red (most common in screenshot)
    { top:'#d84820', front:'#b83010', roof:'#f0f0f0', roofFront:'#d0d0d0' },
    { top:'#d84820', front:'#b83010', roof:'#f0f0f0', roofFront:'#d0d0d0' },
    // purple
    { top:'#9060c8', front:'#7040a8', roof:'#f0f0f0', roofFront:'#d0d0d0' },
    // dark green
    { top:'#406030', front:'#284018', roof:'#f0f0f0', roofFront:'#d0d0d0' },
    // blue
    { top:'#3068c0', front:'#1848a0', roof:'#f0f0f0', roofFront:'#d0d0d0' },
    // yellow
    { top:'#d8c030', front:'#b89a10', roof:'#f0f0f0', roofFront:'#d0d0d0' },
  ],
  // Chicken
  chickenBody : '#f8f8f8',
  chickenFront: '#dcdcdc',
  chickenComb : '#dd2222',
  chickenBeak : '#e07818',
  chickenEye  : '#111111',
  // Outline
  outline: '#111111',
  shadow : 'rgba(0,0,0,0.22)',
};

// ── Core voxel primitive ──────────────────────
// Draw a box in oblique projection.
// (sx, sy) = screen position of the top-left corner of the TOP face
// w  = pixel width of top face
// d  = pixel "depth" of top face (recedes upward on screen)
// h  = pixel height of front face (draws downward)
// elevPx = lift the whole block up by this many pixels (for stacking)
function box(sx, sy, w, d, h, topCol, frontCol, leftCol, elevPx) {
  const e = elevPx || 0;
  sy -= e;

  // Top face (parallelogram: goes right, and up-right for depth)
  ctx.beginPath();
  ctx.moveTo(sx,         sy + d);          // bottom-left
  ctx.lineTo(sx + w,     sy + d);          // bottom-right
  ctx.lineTo(sx + w,     sy);              // top-right  (receded)
  ctx.lineTo(sx,         sy);              // top-left
  ctx.closePath();
  ctx.fillStyle = topCol;
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2; ctx.stroke();

  // Front face (rectangle, goes down from bottom edge of top face)
  ctx.beginPath();
  ctx.moveTo(sx,         sy + d);
  ctx.lineTo(sx + w,     sy + d);
  ctx.lineTo(sx + w,     sy + d + h);
  ctx.lineTo(sx,         sy + d + h);
  ctx.closePath();
  ctx.fillStyle = frontCol;
  ctx.fill();
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2; ctx.stroke();

  // Left face (optional, when leftCol provided — parallelogram on left)
  if (leftCol) {
    ctx.beginPath();
    ctx.moveTo(sx,         sy + d);
    ctx.lineTo(sx,         sy);
    ctx.lineTo(sx,         sy - h * 0);    // same x — no left face visible in this angle
    ctx.closePath();
    // In this oblique projection the left face is hidden (camera faces front+right)
    // So we skip it — matches the original game which also hides left faces
  }
}

// Convenience: draw a ground-level box at grid position (col, row)
// colW, rowD in grid units; h in pixels
function gridBox(col, row, colW, rowD, h, topCol, frontCol, elevPx) {
  const p = proj(col, row);
  box(p.x, p.y, colW * CELL_W, rowD * CELL_D, h, topCol, frontCol, null, elevPx);
}

// ── Shadow ────────────────────────────────────
function gridShadow(col, row, colW, rowD) {
  const p = proj(col, row);
  ctx.fillStyle = C.shadow;
  ctx.beginPath();
  ctx.moveTo(p.x + 4,             p.y + rowD * CELL_D + 4);
  ctx.lineTo(p.x + colW * CELL_W + 4, p.y + rowD * CELL_D + 4);
  ctx.lineTo(p.x + colW * CELL_W + 4, p.y + rowD * CELL_D + 10);
  ctx.lineTo(p.x + 4,             p.y + rowD * CELL_D + 10);
  ctx.closePath();
  ctx.fill();
}

// ── Lane types ────────────────────────────────
const LANE_SAFE  = 'safe';
const LANE_ROAD  = 'road';
const LANE_WATER = 'water';

// ── World state ───────────────────────────────
let lanes     = [];
let player    = {};
let score     = 0;
let highScore = 0;
let gameState = 'start';
let animFrame = 0;
let lastTime  = 0;
let hopAnim   = { active: false, progress: 1, fromCol: 0, fromRow: 0, toCol: 0, toRow: 0 };

// ── Seeded RNG for decorations ────────────────
function rng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function genDecos(worldRow) {
  const r   = rng(worldRow * 5413 + 1234);
  const out = [];
  const n   = Math.floor(r() * 3);   // 0-2 trees
  const used = new Set();
  for (let i = 0; i < n; i++) {
    let c;
    let t = 0;
    do { c = Math.floor(r() * (COLS - 2)) + 1; t++; } while (used.has(c) && t < 8);
    if (!used.has(c)) {
      used.add(c);
      out.push({ col: c, h: 0.8 + r() * 0.6 });
    }
  }
  return out;
}

// ── Lane generation ───────────────────────────
function makeLane(worldRow) {
  if (worldRow >= 0 && worldRow <= 2) return makeSafeLane(worldRow);
  const recent = lanes.filter(l => l.worldRow > worldRow - 6 && l.type === LANE_SAFE).length;
  const roll   = Math.random();
  if (recent === 0 || roll < 0.20) return makeSafeLane(worldRow);
  if (roll < 0.62)                 return makeRoadLane(worldRow);
  return makeWaterLane(worldRow);
}

function makeSafeLane(wr) {
  return { type: LANE_SAFE, worldRow: wr, obstacles: [], decos: genDecos(wr) };
}

function makeRoadLane(wr) {
  const dir   = Math.random() < 0.5 ? 1 : -1;
  const speed = (1.4 + Math.random() * 2.6) * dir;
  const count = 2 + Math.floor(Math.random() * 3);
  const cp    = C.cars[Math.floor(Math.random() * C.cars.length)];
  const gap   = COLS / count;
  const obs   = [];
  for (let i = 0; i < count; i++) {
    const isTruck = Math.random() < 0.25;
    const w = isTruck ? 2.0 + Math.random() * 0.5 : 1.3 + Math.random() * 0.5;
    obs.push({ x: i * gap + Math.random() * gap * 0.35, w, isTruck, cp });
  }
  return { type: LANE_ROAD, worldRow: wr, speed, obstacles: obs };
}

function makeWaterLane(wr) {
  const dir   = Math.random() < 0.5 ? 1 : -1;
  const speed = (0.8 + Math.random() * 1.4) * dir;
  const count = 2 + Math.floor(Math.random() * 2);
  const gap   = COLS / count;
  const obs   = [];
  for (let i = 0; i < count; i++) {
    const w = 1.8 + Math.random() * 1.6;
    obs.push({ x: i * gap + Math.random() * gap * 0.3, w });
  }
  return { type: LANE_WATER, worldRow: wr, speed, obstacles: obs };
}

function initWorld() {
  lanes = [];
  for (let r = -(ROWS + 8); r <= 5; r++) lanes.push(makeLane(r));
}

function getLane(r) { return lanes.find(l => l.worldRow === r); }

function ensureLanes(worldRow) {
  lanes = lanes.filter(l => l.worldRow >= worldRow - ROWS - 3);
  const top = Math.min(...lanes.map(l => l.worldRow));
  for (let r = top - 1; r >= worldRow - ROWS - 12; r--)
    if (!getLane(r)) lanes.push(makeLane(r));
}

// ── Player ────────────────────────────────────
function initPlayer() {
  player = {
    col: Math.floor(COLS / 2),
    row: 0,
    facing: 'right',
    dead: false,
    deathType: '',
    deathAnim: 0,
  };
  score     = 0;
  cameraRow = -Math.floor(ROWS * 0.55);
  hopAnim   = { active: false, progress: 1 };
}

// ── Input ─────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (gameState === 'playing') handleMove(e.code);
  if ((gameState === 'start' || gameState === 'dead') &&
      (e.code === 'Space' || e.code === 'Enter')) startGame();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

let tx0 = 0, ty0 = 0;
canvas.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
canvas.addEventListener('touchend', e => {
  if (gameState !== 'playing') return;
  const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
  handleMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
}, { passive: true });

function handleMove(code) {
  if (hopAnim.active || player.dead) return;
  let dc = 0, dr = 0;
  if      (code === 'ArrowUp'    || code === 'KeyW') { dr = -1; player.facing = 'up'; }
  else if (code === 'ArrowDown'  || code === 'KeyS') { dr =  1; player.facing = 'down'; }
  else if (code === 'ArrowLeft'  || code === 'KeyA') { dc = -1; player.facing = 'left'; }
  else if (code === 'ArrowRight' || code === 'KeyD') { dc =  1; player.facing = 'right'; }
  else return;

  const newCol = Math.round(player.col) + dc;
  const newRow = player.row + dr;

  if (newCol < 0 || newCol >= COLS) return;

  // Block movement into a tree cell on safe lanes
  const targetLane = getLane(newRow);
  if (targetLane && targetLane.type === LANE_SAFE) {
    if (targetLane.decos.some(d => d.col === newCol)) return;
  }

  hopAnim = {
    active: true, progress: 0,
    fromCol: player.col, fromRow: player.row,
    toCol: newCol, toRow: newRow,
  };
  player.col = newCol;
  player.row = newRow;
  ensureLanes(player.row);

  if (dr < 0 && -player.row > score) {
    score = -player.row;
    document.getElementById('score-display').textContent = `Score: ${score}`;
  }

  const target = player.row - Math.floor(ROWS * 0.55);
  if (target < cameraRow) cameraRow = target;
}

// ── Update ────────────────────────────────────
function update(dt) {
  if (gameState !== 'playing') return;
  animFrame += dt;

  if (hopAnim.active) {
    hopAnim.progress = Math.min(1, hopAnim.progress + dt * 11);
    if (hopAnim.progress >= 1) hopAnim.active = false;
  }

  for (const lane of lanes) {
    if (lane.type !== LANE_SAFE) {
      for (const obs of lane.obstacles) {
        obs.x += lane.speed * dt;
        if (lane.speed > 0 && obs.x > COLS + obs.w)  obs.x -= COLS + obs.w * 2;
        if (lane.speed < 0 && obs.x < -obs.w * 2)    obs.x += COLS + obs.w * 2;
      }
    }
  }

  if (player.dead) {
    player.deathAnim += dt;
    if (player.deathAnim > 1.2) triggerGameOver();
    return;
  }

  const lane = getLane(player.row);
  if (!lane) return;
  const px = player.col + 0.5;

  if (lane.type === LANE_ROAD) {
    for (const obs of lane.obstacles) {
      if (px > obs.x + 0.12 && px < obs.x + obs.w - 0.12) { killPlayer('squish'); return; }
    }
  }

  if (lane.type === LANE_WATER) {
    // Skip all water checks while mid-hop — player is airborne
    if (!hopAnim.active) {
      // Drift player with log movement every frame
      player.col += lane.speed * dt;

      // Check if the player's actual position is over any log
      const cx = player.col + 0.5;   // physical center in grid units
      let onLog = false;
      for (const obs of lane.obstacles) {
        if (cx > obs.x && cx < obs.x + obs.w) {
          onLog = true;
          break;
        }
      }

      // Fell off the edge of the screen or not on any log → drown
      if (!onLog || player.col < 0 || player.col > COLS - 1) {
        killPlayer('drown');
        return;
      }
    }
  }

  if (player.row - cameraRow > ROWS + 1) killPlayer('squish');
}

function killPlayer(type) {
  if (player.dead) return;
  player.dead = true; player.deathType = type; player.deathAnim = 0;
}

function triggerGameOver() {
  gameState = 'dead';
  if (score > highScore) highScore = score;
  document.getElementById('final-score').textContent        = `Score: ${score}`;
  document.getElementById('high-score-display').textContent = `Best: ${highScore}`;
  document.getElementById('best-display').textContent       = `Best: ${highScore}`;
  document.getElementById('gameover-screen').classList.remove('hidden');
}

// ─────────────────────────────────────────────
//  RENDERING
// ─────────────────────────────────────────────

// Draw the ground tile for a whole row (flat slab)
function drawGroundRow(worldRow, topCol, frontCol, faceH) {
  const p  = proj(-0.5, worldRow);
  const w  = (COLS + 1) * CELL_W;
  const d  = CELL_D;
  const fh = faceH || 8;
  box(p.x, p.y, w, d, fh, topCol, frontCol, null, 0);
}

// ── Draw full lane ────────────────────────────
function drawLane(lane) {
  const row = lane.worldRow;
  const sy  = (row - cameraRow) * CELL_D;

  // Cull
  if (sy + CELL_D + CELL_H + 60 < 0 || sy - 20 > canvas.height) return;

  if (lane.type === LANE_SAFE) {
    drawGroundRow(row, C.grassTop, C.grassFront, 10);

    // Grass texture: subtle darker stripes
    const p = proj(-0.5, row);
    for (let c = 0; c < COLS + 1; c += 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(p.x + c * CELL_W, p.y, CELL_W, CELL_D);
    }

    // Trees
    for (const deco of lane.decos) {
      drawTree(deco.col, row, deco.h);
    }

  } else if (lane.type === LANE_ROAD) {
    drawGroundRow(row, C.roadTop, C.roadFront, 8);

    // Centre dashes
    const p = proj(-0.5, row);
    ctx.fillStyle = C.roadDash;
    const dashW = 18, gap = 16;
    for (let dx = 0; dx < (COLS + 1) * CELL_W; dx += dashW + gap) {
      ctx.fillRect(p.x + dx, p.y + CELL_D * 0.45, dashW, 4);
    }

    // Cars
    for (const obs of lane.obstacles) drawCar(obs, row);

  } else if (lane.type === LANE_WATER) {
    // Water is flat — no front face height needed
    const p = proj(-0.5, row);
    ctx.fillStyle = C.waterTop;
    ctx.fillRect(p.x, p.y, (COLS + 1) * CELL_W, CELL_D + 4);
    ctx.strokeStyle = C.outline; ctx.lineWidth = 0.5;
    ctx.strokeRect(p.x, p.y, (COLS + 1) * CELL_W, CELL_D + 4);

    // Foam / shimmer lines
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    const dir = lane.speed > 0 ? 1 : -1;
    const off = ((animFrame * 20 * dir) % ((COLS + 1) * CELL_W));
    for (let fx = -60; fx < (COLS + 1) * CELL_W + 60; fx += 55) {
      const ox = ((fx + off) % ((COLS + 1) * CELL_W + 60));
      ctx.fillRect(p.x + ox, p.y + CELL_D * 0.25, 22, 4);
      ctx.fillRect(p.x + ox + 10, p.y + CELL_D * 0.65, 14, 3);
    }
    ctx.restore();

    // Logs
    for (const obs of lane.obstacles) drawLog(obs, row);
  }
}

// ── Tree ──────────────────────────────────────
// Multi-block stacked tree matching original — wide lime green blocks
function drawTree(col, worldRow, scale) {
  const s   = scale;
  const cw  = 0.85 * s;    // column width in grid units
  const tc  = col + (1 - cw) / 2;  // centered on col

  // Trunk: short brown block
  const trunkH = 12 * s;
  gridBox(tc, worldRow + 0.1, cw * 0.5, 0.75, trunkH, C.trunkTop, C.trunkFront);

  // Foliage: 3 stacked blocks, each slightly narrower
  let elev = trunkH;
  const foliageLayers = [
    { w: cw * 1.1, tc: C.tree1Top, fc: C.tree1Front, h: 14 * s },
    { w: cw * 0.85, tc: C.tree2Top, fc: C.tree2Front, h: 13 * s },
    { w: cw * 0.62, tc: C.tree3Top, fc: C.tree3Front, h: 11 * s },
  ];

  for (const layer of foliageLayers) {
    const lc = col + (1 - layer.w) / 2;
    gridBox(lc, worldRow + (1 - layer.w * 0.8) / 2, layer.w, layer.w * 0.8, layer.h,
      layer.tc, layer.fc, elev);
    elev += layer.h * 0.6;
  }
}

// ── Car ───────────────────────────────────────
// Original cars: boxy body block + large white roof/cabin block
// Width  ≈ 1.3–2 grid units, depth ≈ 0.75 grid units
function drawCar(obs, worldRow) {
  const { x, w, cp } = obs;
  const d  = 0.72;          // depth in grid units
  const rowOff = (1 - d) / 2;

  // Shadow
  const sp = proj(x, worldRow + rowOff + d);
  ctx.fillStyle = 'rgba(0,0,0,0.20)';
  ctx.fillRect(sp.x + 4, sp.y + 2, w * CELL_W - 4, 7);

  // Body
  const bodyH = 18;
  gridBox(x, worldRow + rowOff, w, d, bodyH, cp.top, cp.front, 0);

  // Cabin / roof — large white block centred on body
  const cabW  = obs.isTruck ? w * 0.42 : w * 0.60;
  const cabOff = obs.isTruck ? w * 0.04 : w * 0.20;
  const cabD   = d * 0.88;
  const cabRowOff = (1 - cabD) / 2;
  const cabH   = 16;
  gridBox(x + cabOff, worldRow + cabRowOff, cabW, cabD, cabH, cp.roof, cp.roofFront, bodyH);

  // Windows: two dark rects on front face of cabin
  const cp2 = proj(x + cabOff, worldRow + cabRowOff + cabD);
  const winY = cp2.y + bodyH + 2;
  const winH = cabH - 5;
  const winW = cabW * CELL_W * 0.3;
  ctx.fillStyle = '#111';
  ctx.fillRect(cp2.x + cabW * CELL_W * 0.08, winY, winW, winH);
  ctx.fillRect(cp2.x + cabW * CELL_W * 0.58, winY, winW, winH);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 0.8;
  ctx.strokeRect(cp2.x + cabW * CELL_W * 0.08, winY, winW, winH);
  ctx.strokeRect(cp2.x + cabW * CELL_W * 0.58, winY, winW, winH);

  // Wheel wells (dark rectangles on body front face)
  const bp = proj(x, worldRow + rowOff + d);
  const ww = CELL_W * 0.22, wh2 = bodyH - 3;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(bp.x + w * CELL_W * 0.08,  bp.y + 1, ww, wh2);
  ctx.fillRect(bp.x + w * CELL_W * 0.72,  bp.y + 1, ww, wh2);
  ctx.strokeStyle = C.outline; ctx.lineWidth = 0.8;
  ctx.strokeRect(bp.x + w * CELL_W * 0.08, bp.y + 1, ww, wh2);
  ctx.strokeRect(bp.x + w * CELL_W * 0.72, bp.y + 1, ww, wh2);
}

// ── Log ───────────────────────────────────────
function drawLog(obs, worldRow) {
  const { x, w } = obs;
  const d   = 0.58;
  const lh  = 12;
  const rowOff = (1 - d) / 2;

  // Shadow
  const sp = proj(x, worldRow + rowOff + d);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(sp.x + 4, sp.y + 2, w * CELL_W - 4, 6);

  gridBox(x, worldRow + rowOff, w, d, lh, C.logTop, C.logFront, 0);
}

// ── Chicken ───────────────────────────────────
// Small white boxy figure: body + head + red comb
// facing: 'up' | 'down' | 'left' | 'right'
function drawChickenAt(col, row, elevPx, facing) {
  const e  = elevPx || 0;
  const f  = facing || 'up';
  const cw = 0.40;   // body width in grid units
  const cd = 0.55;   // body depth
  const bh = 14;     // body height px
  const hh = 10;     // head height px

  const bc = col + (1 - cw) / 2;
  const br = row + (1 - cd) / 2;

  // Body
  gridBox(bc, br, cw, cd, bh, C.chickenBody, C.chickenFront, e);

  // Head position shifts based on facing direction
  const hw = cw * 0.78, hd = cd * 0.78;
  let hc = col + (1 - hw) / 2;
  let hr = row + (1 - hd) / 2;
  // Nudge head in the direction of travel so the beak faces that way visually
  if      (f === 'up')    hr = row + (1 - hd) / 2 - 0.15;   // recede (away from viewer)
  else if (f === 'down')  hr = row + (1 - hd) / 2 + 0.15;   // advance (toward viewer)
  else if (f === 'left')  hc = col + (1 - hw) / 2 - 0.12;
  else if (f === 'right') hc = col + (1 - hw) / 2 + 0.12;

  gridBox(hc, hr, hw, hd, hh, C.chickenBody, C.chickenFront, e + bh);

  // Red comb (follows head)
  const cmw = hw * 0.4, cmd = hd * 0.55;
  const cmc = hc + (hw - cmw) / 2;
  const cmr = hr + (hd - cmd) / 2;
  gridBox(cmc, cmr, cmw, cmd, 5, C.chickenComb, darken(C.chickenComb, 0.3), e + bh + hh);

  // Beak: pokes out in the facing direction
  const bkw = 0.12, bkd = 0.14;
  let bkc = hc + (hw - bkw) / 2;
  let bkr = hr + (hd - bkd) / 2;
  if      (f === 'up')    bkr = hr - bkd + 0.02;
  else if (f === 'down')  bkr = hr + hd - 0.02;
  else if (f === 'left')  bkc = hc - bkw + 0.02;
  else if (f === 'right') bkc = hc + hw  - 0.02;

  gridBox(bkc, bkr, bkw, bkd, 5, C.chickenBeak, darken(C.chickenBeak, 0.35), e + bh + hh * 0.3);

  // Eye dots on the head front face — shift L/R based on facing
  const ep = proj(hc, hr + hd);
  // For left/right facing show one eye; for up/down show two
  ctx.fillStyle = C.chickenEye;
  if (f === 'left') {
    // Only left side visible
    ctx.fillRect(ep.x + hw * CELL_W * 0.18, ep.y + e + bh + 2, 4, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(ep.x + hw * CELL_W * 0.19, ep.y + e + bh + 1, 2, 2);
  } else if (f === 'right') {
    // Only right side visible
    ctx.fillRect(ep.x + hw * CELL_W * 0.68, ep.y + e + bh + 2, 4, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(ep.x + hw * CELL_W * 0.69, ep.y + e + bh + 1, 2, 2);
  } else {
    // Both eyes visible (facing toward or away)
    ctx.fillRect(ep.x + hw * CELL_W * 0.18, ep.y + e + bh + 2, 4, 4);
    ctx.fillRect(ep.x + hw * CELL_W * 0.68, ep.y + e + bh + 2, 4, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(ep.x + hw * CELL_W * 0.19, ep.y + e + bh + 1, 2, 2);
    ctx.fillRect(ep.x + hw * CELL_W * 0.69, ep.y + e + bh + 1, 2, 2);
  }
}

// ── Player draw with hop ──────────────────────
function drawPlayer() {
  if (!player) return;

  let col = player.col, row = player.row, elevExtra = 0;

  if (hopAnim.active) {
    const t  = hopAnim.progress;
    col = hopAnim.fromCol + (hopAnim.toCol - hopAnim.fromCol) * t;
    row = hopAnim.fromRow + (hopAnim.toRow - hopAnim.fromRow) * t;
    elevExtra = Math.sin(t * Math.PI) * 20;
  }

  if (player.dead) {
    const t = Math.min(player.deathAnim / 0.6, 1);

    if (player.deathType === 'drown') {
      // Sink downward (reduce elevation into negative = drops below ground)
      // and fade out
      const sinkElev = -t * 18;   // starts at 0, ends sunk 18px below ground
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t * 1.4);
      drawChickenAt(col, row, sinkElev, player.facing);
      ctx.restore();
      return;
    }

    if (player.deathType === 'squish') {
      // Flatten: use canvas scale around the chicken's screen anchor point
      const anchor = proj(col + 0.3, row + 0.5);
      ctx.save();
      ctx.translate(anchor.x, anchor.y + elevExtra);
      ctx.scale(1 + t * 0.7, Math.max(0.05, 1 - t * 0.9));
      ctx.translate(-anchor.x, -anchor.y - elevExtra);
      drawChickenAt(col, row, elevExtra, player.facing);
      ctx.restore();
      return;
    }
  }

  drawChickenAt(col, row, elevExtra, player.facing);
}

// ── Utility ───────────────────────────────────
function darken(hex, f) {
  let r, g, b;
  if (hex.startsWith('#')) {
    const n = parseInt(hex.slice(1), 16);
    r = (n >> 16) & 0xff; g = (n >> 8) & 0xff; b = n & 0xff;
  } else { const m = hex.match(/\d+/g); r = +m[0]; g = +m[1]; b = +m[2]; }
  return `rgb(${Math.round(r*(1-f))},${Math.round(g*(1-f))},${Math.round(b*(1-f))})`;
}

// ── Main render ───────────────────────────────
function render() {
  // Sky gradient (light blue like the screenshot)
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#88ccee');
  grad.addColorStop(1, '#b8e4f8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sort rows back-to-front (lowest worldRow = furthest = draw first)
  const sorted = [...lanes]
    .filter(l => {
      const sy = (l.worldRow - cameraRow) * CELL_D;
      return sy > -100 && sy < canvas.height + 80;
    })
    .sort((a, b) => a.worldRow - b.worldRow);

  for (const lane of sorted) {
    drawLane(lane);

    // Draw player on the correct row in the sorted order
    if (!player.dead) {
      if (hopAnim.active) {
        const ir = hopAnim.fromRow + (hopAnim.toRow - hopAnim.fromRow) * hopAnim.progress;
        if (Math.round(ir) === lane.worldRow) drawPlayer();
      } else if (player.row === lane.worldRow) {
        drawPlayer();
      }
    }
  }

  // Dead player always drawn on top
  if (player.dead) drawPlayer();
}

// ── Game loop ─────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ── Game control ──────────────────────────────
function startGame() {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('score-display').textContent = 'Score: 0';
  document.getElementById('best-display').textContent  = `Best: ${highScore}`;
  initWorld();
  initPlayer();
  gameState = 'playing';
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

initWorld();
initPlayer();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
