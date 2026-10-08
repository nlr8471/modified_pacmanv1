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

  // Label color themes for distinct VHS cassette spines
  const tapePalettes = [
    { labelBg: '#f2ece1', stripe: '#ff2a85', text: '#180028', badge: '#ff2a85' }, // Pink Synth
    { labelBg: '#e6f4f8', stripe: '#00f0ff', text: '#002636', badge: '#00f0ff' }, // Cyan Hi-Fi
    { labelBg: '#f8f1de', stripe: '#f59e0b', text: '#2e1d00', badge: '#f59e0b' }, // Gold Arcade
    { labelBg: '#f0e6f8', stripe: '#a855f7', text: '#21003d', badge: '#a855f7' }, // Purple Retro
    { labelBg: '#e6f7ef', stripe: '#10b981', text: '#002b1c', badge: '#10b981' }  // Mint SP
  ];

  for (let y = 0; y < ROWS; y++) {
    let x = 0;
    while (x < COLS) {
      const tile = map[y][x];

      if (tile === '#') {
        // Find contiguous run of wall tiles horizontally
        const runStart = x;
        while (x < COLS && map[y][x] === '#') {
          x++;
        }
        const runLen = x - runStart;

        // Combine wall tiles into 2 or 3 tile wide tapes (56px or 84px wide)
        let remaining = runLen;
        let curX = runStart;

        while (remaining > 0) {
          const span = (remaining === 4) ? 2 : (remaining >= 3 ? 3 : remaining);
          
          const px = curX * TILE;
          const py = y * TILE + HUD_HEIGHT;
          const w = span * TILE;
          const h = TILE; // 28px height for full cassette spine proportions

          const palette = tapePalettes[(y * 7 + curX * 3) % tapePalettes.length];

          // 1. Black Plastic Cassette Casing
          ctx.fillStyle = '#101018';
          ctx.fillRect(px, py, w, h);

          // Top highlight & bottom drop shadow bevels
          ctx.fillStyle = '#3a3a4e';
          ctx.fillRect(px, py, w, 1);
          ctx.fillStyle = '#040406';
          ctx.fillRect(px, py + h - 2, w, 2);
          // Seam separator on right end
          ctx.fillRect(px + w - 2, py, 2, h);

          // 2. Side Grip Ribs (Left End)
          ctx.fillStyle = '#06060a';
          ctx.fillRect(px + 1, py + 2, 2, h - 4);
          ctx.fillStyle = '#222230';
          ctx.fillRect(px + 1, py + 4, 2, 2);
          ctx.fillRect(px + 1, py + 10, 2, 2);
          ctx.fillRect(px + 1, py + 16, 2, 2);

          // 3. Recessed Sticker Label
          const labelX = px + 5;
          const labelY = py + 3;
          const labelW = w - 12;
          const labelH = h - 7;

          ctx.fillStyle = palette.labelBg;
          ctx.fillRect(labelX, labelY, labelW, labelH);

          // Label Color Stripe
          ctx.fillStyle = palette.stripe;
          ctx.fillRect(labelX, labelY, labelW, 3);

          // 4. Pixel-Art "VHS" Badge (Left side of sticker)
          ctx.fillStyle = palette.badge;
          ctx.fillRect(labelX + 2, labelY + 5, 8, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(labelX + 3, labelY + 6, 2, 2);
          ctx.fillRect(labelX + 5, labelY + 8, 2, 2);
          ctx.fillRect(labelX + 7, labelY + 6, 2, 2);

          // 5. Title & Subtitle Pixel Lines (Center of sticker)
          const titleX = labelX + 12;
          const titleMaxW = labelW - 22;
          if (titleMaxW > 8) {
            ctx.fillStyle = palette.text;
            ctx.fillRect(titleX, labelY + 5, Math.min(titleMaxW, 32), 3);
            ctx.fillRect(titleX, labelY + 10, Math.min(titleMaxW - 6, 20), 2);
          }

          // 6. Barcode (Right side of sticker)
          const bcX = labelX + labelW - 8;
          if (labelW > 24) {
            ctx.fillStyle = '#000000';
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
