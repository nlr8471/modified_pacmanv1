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
  lives: 3,
  score: 0
};

const ghostStarts = [
  { x: 9, y: 8, color: '#ff4d4d' },
  { x: 10, y: 8, color: '#ff99ff' },
  { x: 11, y: 8, color: '#5bd3ff' }
];

const urlParams = new URLSearchParams(window.location.search);
const difficulty = urlParams.get('difficulty') || 'medium';

let speedMultiplier = 1;
if (difficulty === 'easy') {
  speedMultiplier = 0.5;
} else if (difficulty === 'hard') {
  speedMultiplier = 1.4;
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

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE + HUD_HEIGHT;

      if (tile === '#') {
        // Simple, clean neon grid walls
        ctx.fillStyle = '#230b3b';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#ff2a85';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      } else {
        ctx.fillStyle = '#080212';
        ctx.fillRect(px, py, TILE, TILE);

        const cx = px + TILE / 2;
        const cy = py + TILE / 2;

        if (tile === '.') {
          // Glowing pink dot
          ctx.shadowColor = '#ff2a85';
          ctx.shadowBlur = 6;
          ctx.fillStyle = '#ff7bb3';
          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (tile === 'o') {
          // Pulsing cyan power star
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
  const radius = player.radius;
  const mouthAngle = 0.2 * (1 + Math.sin(time * 0.01));

  let angle = 0;
  if (player.dir === DIRS.right) angle = 0;
  if (player.dir === DIRS.down) angle = Math.PI / 2;
  if (player.dir === DIRS.left) angle = Math.PI;
  if (player.dir === DIRS.up) angle = -Math.PI / 2;

  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(
    player.x,
    player.y,
    radius,
    angle + mouthAngle,
    angle + Math.PI * 2 - mouthAngle
  );
  ctx.lineTo(player.x, player.y);
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
  ctx.arc(x + r * 0.4, y - r * 0.08, r
