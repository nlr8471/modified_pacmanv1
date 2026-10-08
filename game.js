const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const stateEl = document.getElementById('state');
const playAgainBtn = document.getElementById('playAgainBtn');

const TILE = 28;
const HUD_HEIGHT = 60;
const COLS = 20;
const ROWS = 20;

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 }
};

const layout = [
  '####################',
  '#........##........#',
  '#.####.#.##.#.####.#',
  '#o####.#.##.#.####o#',
  '#..................#',
  '#.####.######.####.#',
  '#......##..##......#',
  '######.##..##.######',
  '#....#...GG...#....#',
  '#.##.#.######.#.##.#',
  '#.........P........#',
  '######.##..##.######',
  '#......##..##......#',
  '#.####.######.####.#',
  '#..................#',
  '#o####.#.##.#.####o#',
  '#...##.#.##.#.##...#',
  '###....#....#....###',
  '#........##........#',
  '####################'
];

const map = layout.map((row) => row.split(''));

function tileCenterX(tx) {
  return tx * TILE + TILE / 2;
}

function tileCenterY(ty) {
  return HUD_HEIGHT + ty * TILE + TILE / 2;
}

let pelletsLeft = 0;
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (map[y][x] === '.' || map[y][x] === 'o') pelletsLeft++;
  }
}

const player = {
  x: tileCenterX(10),
  y: tileCenterY(10),
  radius: TILE * 0.4,
  speed: 130,
  dir: { ...DIRS.left },
  nextDir: { ...DIRS.left },
  mouth: 0,
  lives: 3,
  score: 0
};

const ghostStarts = [
  { x: 9, y: 8, color: '#ff4d4d' },
  { x: 10, y: 8, color: '#ff99ff' },
  { x: 11, y: 8, color: '#5bd3ff' }
];

// Get difficulty from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const difficulty = urlParams.get('difficulty') || 'medium';

// Set ghost speed multiplier based on difficulty
let speedMultiplier = 1;
if (difficulty === 'easy') {
  speedMultiplier = 0.5;  // Very slow
} else if (difficulty === 'hard') {
  speedMultiplier = 1.4;  // Fast
}

const ghosts = ghostStarts.map((g, index) => ({
  x: tileCenterX(g.x),
  y: tileCenterY(g.y),
  radius: TILE * 0.38,
  speed: (90 + index * 8) * speedMultiplier,
  dir: [DIRS.left, DIRS.right, DIRS.up][index],
  color: g.color
}));

let running = false;
let gameOver = false;
let win = false;
let previous = performance.now();

function tileAtPixel(px, py) {
  return {
    x: Math.floor(px / TILE),
    y: Math.floor((py - HUD_HEIGHT) / TILE)
  };
}

function isWallTile(tx, ty) {
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
  return map[ty][tx] === '#';
}

function collidesWithWall(entity, dir, distance) {
  const nx = entity.x + dir.x * distance;
  const ny = entity.y + dir.y * distance;
  const r = entity.radius - 2;

  const points = [
    [nx - r, ny - r],
    [nx + r, ny - r],
    [nx - r, ny + r],
    [nx + r, ny + r]
  ];

  return points.some(([px, py]) => {
    const tile = tileAtPixel(px, py);
    return isWallTile(tile.x, tile.y);
  });
}

function drawMap() {
  const pulse = Math.sin(performance.now() * 0.006);

  // Retro 8-bit sticker label palette presets
  const labelPalettes = [
    { label: '#ece6d8', accent: '#ff2a85', text: '#120024' }, // Neon Pink T-120
    { label: '#e5dec9', accent: '#00f0ff', text: '#00202e' }, // Electric Cyan
    { label: '#f4ebd0', accent: '#f59e0b', text: '#2e1c00' }, // Gold Arcade
    { label: '#dedede', accent: '#10b981', text: '#022c22' }, // Mint Edition
    { label: '#ebdcf7', accent: '#a855f7', text: '#1e0038' }  // Synth Purple
  ];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE + HUD_HEIGHT;

      if (tile === '#') {
        // --- 8-BIT DETAILED STACKED VHS TAPES ---
        ctx.fillStyle = '#05020a';
        ctx.fillRect(px, py, TILE, TILE);

        // Draw 2 stacked 14px high cassettes per 28px wall tile
        for (let i = 0; i < 2; i++) {
          const ty = py + i * 14;
          const palette = labelPalettes[(y * 3 + x * 2 + i) % labelPalettes.length];

          // 1. Black Outer Plastic Casing (28x13px)
          ctx.fillStyle = '#121218';
          ctx.fillRect(px, ty, TILE, 13);

          // 2. 8-Bit Bevels (Top Highlight, Bottom Shadow)
          ctx.fillStyle = '#3a3a4c';
          ctx.fillRect(px, ty, TILE, 1); // Top light edge
          ctx.fillStyle = '#000000';
          ctx.fillRect(px, ty + 12, TILE, 1); // Bottom shadow seam
          ctx.fillRect(px, ty + 13, TILE, 1); // Gap between stacked tapes

          // 3. Cassette Side Grip Ribs (Far Left Notch)
          ctx.fillStyle = '#08080c';
          ctx.fillRect(px + 1, ty + 2, 2, 9);
          ctx.fillStyle = '#22222c';
          ctx.fillRect(px + 1, ty + 3, 2, 1);
          ctx.fillRect(px + 1, ty + 6, 2, 1);
          ctx.fillRect(px + 1, ty + 9, 2, 1);

          // 4. Paper Sticker Label (Recessed Center)
          ctx.fillStyle = palette.label;
          ctx.fillRect(px + 4, ty + 2, 19, 9);

          // 5. Retro Label Accent Stripe
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + 4, ty + 2, 19, 2);

          // 6. 8-Bit Simulated Text / Title Blocks (3x2 pixel blocks)
          ctx.fillStyle = palette.text;
          ctx.fillRect(px + 5, ty + 5, 4, 2);  // "VHS" logo block
          ctx.fillRect(px + 10, ty + 5, 6, 1); // Title text line
          ctx.fillRect(px + 10, ty + 7, 4, 1); // Subtitle line

          // 7. Simulated Barcode / T-120 Markings (Pixel Dots)
          ctx.fillStyle = '#000000';
          ctx.fillRect(px + 17, ty + 5, 1, 3);
          ctx.fillRect(px + 19, ty + 5, 1, 3);
          ctx.fillRect(px + 21, ty + 5, 1, 3);

          // 8. Right-side Lock Notch & Reel Window Aperture
          ctx.fillStyle = '#08080c';
          ctx.fillRect(px + 24, ty + 2, 3, 9);
          ctx.fillStyle = '#1c1c24';
          ctx.fillRect(px + 25, ty + 4, 1, 5); // Tape spool lock window
        }

      } else {
        // --- FLOOR & PELLETS ---
        ctx.fillStyle = '#080212';
        ctx.fillRect(px, py, TILE, TILE);

        const cx = px + TILE / 2;
        const cy = py + TILE / 2;

        if (tile === '.') {
          ctx.shadowColor = '#ff2a85';
          ctx.shadowBlur = 6;
          ctx.fillStyle = '#ff7bb3';
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

        } else if (tile === 'o') {
          const size = 8 + pulse * 2;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ffffff';

          ctx.beginPath();
          ctx.moveTo(cx, cy - size);
          ctx.lineTo(cx + size * 0.35, cy - size * 0.35);
          ctx.lineTo(cx + size, cy);
          ctx.lineTo(cx + size * 0.35, cy + size * 0.35);
          ctx.lineTo(cx, cy + size);
          ctx.lineTo(cx - size * 0.35, cy + size * 0.35);
          ctx.lineTo(cx - size, cy);
          ctx.lineTo(cx - size * 0.35, cy - size * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }
}
function drawPacman(time) {
  const speedFactor = Math.hypot(player.dir.x, player.dir.y);
  player.mouth = 0.18 + Math.abs(Math.sin(time * 0.012)) * 0.24 * speedFactor;

  let angle = 0;
  if (player.dir.x === 1) angle = 0;
  else if (player.dir.x === -1) angle = Math.PI;
  else if (player.dir.y === -1) angle = -Math.PI / 2;
  else if (player.dir.y === 1) angle = Math.PI / 2;

  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(
    player.x,
    player.y,
    player.radius,
    angle + player.mouth,
    angle - player.mouth + Math.PI * 2
  );
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const r = ghost.radius;
  const x = ghost.x;
  const y = ghost.y;

  ctx.fillStyle = ghost.color;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r);

  for (let i = 0; i < 3; i++) {
    const sx = x + r - ((i + 1) * 2 * r) / 3;
    ctx.quadraticCurveTo(sx + r / 6, y + r * 0.6, sx - r / 3, y + r);
  }

  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1b2a6d';
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.arc(x + r * 0.4, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud() {
  scoreEl.textContent = `Score: ${player.score}`;
  livesEl.textContent = `Lives: ${player.lives}`;
  if (playAgainBtn) playAgainBtn.hidden = !gameOver;

  if (gameOver) {
    stateEl.textContent = win ? 'You Win! Refresh to replay' : 'Game Over! Refresh to retry';
    stateEl.style.color = win ? '#8cff9b' : '#ff8f8f';
  } else {
    stateEl.textContent = running ? 'Collect all pellets' : 'Press Arrow Keys to Start';
    stateEl.style.color = '#8ee7ff';
  }
}

function eatPellet() {
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor((player.y - HUD_HEIGHT) / TILE);
  const tile = map[ty]?.[tx];

  if (tile === '.') {
    map[ty][tx] = ' ';
    player.score += 10;
    pelletsLeft -= 1;
  } else if (tile === 'o') {
    map[ty][tx] = ' ';
    player.score += 50;
    pelletsLeft -= 1;
  }

  if (pelletsLeft <= 0) {
    gameOver = true;
    win = true;
    running = false;
  }
}

function resetPositions() {
  player.x = tileCenterX(10);
  player.y = tileCenterY(10);
  player.dir = { ...DIRS.left };
  player.nextDir = { ...DIRS.left };

  ghosts.forEach((ghost, i) => {
    ghost.x = tileCenterX(ghostStarts[i].x);
    ghost.y = tileCenterY(ghostStarts[i].y);
    ghost.dir = [DIRS.left, DIRS.right, DIRS.up][i];
  });
}

function tryTurn(entity, desiredDir) {
  if (!collidesWithWall(entity, desiredDir, 2)) {
    entity.dir = desiredDir;
  }
}

function updatePlayer(dt) {
  tryTurn(player, player.nextDir);

  const distance = player.speed * dt;
  if (!collidesWithWall(player, player.dir, distance)) {
    player.x += player.dir.x * distance;
    player.y += player.dir.y * distance;
  }

  eatPellet();
}

function chooseGhostDir(ghost) {
  const options = [];

  for (const dir of Object.values(DIRS)) {
    const reverse = dir.x === -ghost.dir.x && dir.y === -ghost.dir.y;
    if (reverse) continue;
    if (!collidesWithWall(ghost, dir, 8)) options.push(dir);
  }

  if (!options.length) {
    ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
    return;
  }

  options.sort((a, b) => {
    const da = Math.hypot(player.x - (ghost.x + a.x * TILE), player.y - (ghost.y + a.y * TILE));
    const db = Math.hypot(player.x - (ghost.x + b.x * TILE), player.y - (ghost.y + b.y * TILE));
    return da - db;
  });

  ghost.dir = Math.random() < 0.75 ? options[0] : options[Math.floor(Math.random() * options.length)];
}

function updateGhosts(dt) {
  let playerHitThisFrame = false;

  ghosts.forEach((ghost) => {
    if (playerHitThisFrame || gameOver) return;

    const centerX = Math.abs((ghost.x - TILE / 2) % TILE) < 2;
    const centerY = Math.abs((ghost.y - HUD_HEIGHT - TILE / 2) % TILE) < 2;

    if (centerX && centerY) {
      chooseGhostDir(ghost);
    }

    const distance = ghost.speed * dt;
    if (!collidesWithWall(ghost, ghost.dir, distance)) {
      ghost.x += ghost.dir.x * distance;
      ghost.y += ghost.dir.y * distance;
    } else {
      chooseGhostDir(ghost);
    }

    const hit = Math.hypot(player.x - ghost.x, player.y - ghost.y) < player.radius + ghost.radius - 4;
    if (hit) {
      playerHitThisFrame = true;
      player.lives -= 1;
      if (player.lives <= 0) {
        gameOver = true;
        running = false;
      }
      resetPositions();
    }
  });
}

function clear() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBackgroundGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE, HUD_HEIGHT);
    ctx.lineTo(x * TILE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT + y * TILE);
    ctx.lineTo(canvas.width, HUD_HEIGHT + y * TILE);
    ctx.stroke();
  }
}

function frame(time) {
  const dt = Math.min((time - previous) / 1000, 0.05);
  previous = time;

  if (running && !gameOver) {
    updatePlayer(dt);
    updateGhosts(dt);
  }

  clear();
  drawBackgroundGrid();
  drawMap();
  drawPacman(time);
  ghosts.forEach(drawGhost);
  drawHud();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, HUD_HEIGHT, canvas.width, canvas.height - HUD_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '700 44px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(win ? 'YOU WIN' : 'GAME OVER', canvas.width / 2, canvas.height / 2 + 10);
  }

  requestAnimationFrame(frame);
}

function setDirectionByKey(key) {
  const normalized = key.toLowerCase();
  let moved = false;

  if (normalized === 'arrowleft' || normalized === 'a') player.nextDir = DIRS.left;
  if (normalized === 'arrowleft' || normalized === 'a') moved = true;
  if (normalized === 'arrowright' || normalized === 'd') {
    player.nextDir = DIRS.right;
    moved = true;
  }
  if (normalized === 'arrowup' || normalized === 'w') {
    player.nextDir = DIRS.up;
    moved = true;
  }
  if (normalized === 'arrowdown' || normalized === 's') {
    player.nextDir = DIRS.down;
    moved = true;
  }

  if (!running && !gameOver && moved) running = true;

  return moved;
}

window.addEventListener('keydown', (e) => {
  const moved = setDirectionByKey(e.key);
  if (moved) e.preventDefault();
});

if (playAgainBtn) {
  playAgainBtn.addEventListener('click', () => {
    window.location.reload();
  });
}

function init() {
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE + HUD_HEIGHT;
  resetPositions();
  drawHud();
  requestAnimationFrame(frame);
}

init();
