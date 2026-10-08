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

  const tapePalettes = [
    { labelBg: '#f2ece1', stripe: '#ff2a85', text: '#180028', badge: '#ff2a85' },
    { labelBg: '#e6f4f8', stripe: '#00f0ff', text: '#002636', badge: '#00f0ff' },
    { labelBg: '#f8f1de', stripe: '#f59e0b', text: '#2e1d00', badge: '#f59e0b' },
    { labelBg: '#f0e6f8', stripe: '#a855f7', text: '#21003d', badge: '#a855f7' },
    { labelBg: '#e6f7ef', stripe: '#10b981', text: '#002b1c', badge: '#10b981' }
  ];

  for (let y = 0; y < ROWS; y++) {
    let x = 0;
    while (x < COLS) {
      const tile = map[y][x];

      if (tile === '#') {
        const runStart = x;
        while (x < COLS && map[y][x] === '#') {
          x++;
        }
        const runLen = x - runStart;

        let remaining = runLen;
        let curX = runStart;

        while (remaining > 0) {
          const span = (remaining === 4) ? 2 : (remaining >= 3 ? 3 : remaining);
          
          const px = curX * TILE;
          const py = y * TILE + HUD_HEIGHT;
          const w = span * TILE;
          const h = TILE;

          const palette = tapePalettes[(y * 7 + curX * 3) % tapePalettes.length];

          ctx.fillStyle = '#101018';
          ctx.fillRect(px, py, w, h);

          ctx.fillStyle = '#3a3a4e';
          ctx.fillRect(px, py, w, 1);
          ctx.fillStyle = '#040406';
          ctx.fillRect(px, py + h - 2, w, 2);
          ctx.fillRect(px + w - 2, py, 2, h);

          ctx.fillStyle = '#06060a';
          ctx.fillRect(px + 1, py + 2, 2, h - 4);
          ctx.fillStyle = '#222230';
          ctx.fillRect(px + 1, py + 4, 2, 2);
          ctx.fillRect(px + 1, py + 10, 2, 2);
          ctx.fillRect(px + 1, py + 16, 2, 2);

          const labelX = px + 5;
          const labelY = py + 3;
          const labelW = w - 12;
          const labelH = h - 7;

          ctx.fillStyle = palette.labelBg;
          ctx.fillRect(labelX, labelY, labelW, labelH);

          ctx.fillStyle = palette.stripe;
          ctx.fillRect(labelX, labelY, labelW, 3);

          ctx.fillStyle = palette.badge;
          ctx.fillRect(labelX + 2, labelY + 5, 8, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(labelX + 3, labelY + 6, 2, 2);
          ctx.fillRect(labelX + 5, labelY + 8, 2, 2);
          ctx.fillRect(labelX + 7, labelY + 6, 2, 2);

          const titleX = labelX + 12;
          const titleMaxW = labelW - 22;
          if (titleMaxW > 8) {
            ctx.fillStyle = palette.text;
            ctx.fillRect(titleX, labelY + 5, Math.min(titleMaxW, 3
