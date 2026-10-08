window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const stateEl = document.getElementById('state');
  const playAgainBtn = document.getElementById('playAgainBtn');

  const TILE = 28;
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

  let map = layout.map((row) => row.split(''));

  function tileCenterX(tx) {
    return tx * TILE + TILE / 2;
  }

  function tileCenterY(ty) {
    return ty * TILE + TILE / 2;
  }

  let pelletsLeft = 0;
  function countPellets() {
    pelletsLeft = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (map[y][x] === '.' || map[y][x] === 'o') pelletsLeft++;
      }
    }
  }

  const player = {
    x: tileCenterX(10),
    y: tileCenterY(10),
    radius: TILE * 0.4,
    speed: 130,
    dir: DIRS.left,
    nextDir: DIRS.left,
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
  if (difficulty === 'easy') speedMultiplier = 0.5;
  if (difficulty === 'hard') speedMultiplier = 1.4;

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
      y: Math.floor(py / TILE)
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
        const py = y * TILE;

        if (tile === '#') {
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
    const radius = player.radius;
    const mouthAngle = 0.2 * (1 + Math.sin(time * 0.01));

    let angle = 0;
    if (player.dir.x === 1) angle = 0;
    if (player.dir.y === 1) angle = Math.PI / 2;
    if (player.dir.x === -1) angle = Math.PI;
    if (player.dir.y === -1) angle = -Math.PI / 2;

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
    ctx.arc(x + r * 0.4, y - r * 0.08, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHud() {
    if (scoreEl) scoreEl.textContent = `Score: ${player.score}`;
    if (livesEl) livesEl.textContent = `Lives: ${player.lives}`;
    if (playAgainBtn) playAgainBtn.hidden = !gameOver;

    if (stateEl) {
      if (gameOver) {
        stateEl.textContent = win ? 'You Win! Click Play Again' : 'Game Over! Click Play Again';
        stateEl.style.color = win ? '#8cff9b' : '#ff8f8f';
      } else {
        stateEl.textContent = running ? 'Collect all pellets' : 'Press Arrow Keys to Start';
        stateEl.style.color = '#8ee7ff';
      }
    }
  }

  function eatPellet() {
    const tx = Math.floor(player.x / TILE);
    const ty = Math.floor(player.y / TILE);
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
    player.dir = DIRS.left;
    player.nextDir = DIRS.left;

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
      const centerY = Math.abs((ghost.y - TILE / 2) % TILE) < 2;

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
    ctx.fillStyle = '#080212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function frame(time) {
    const dt = Math.min((time - previous) / 1000, 0.05);
    previous = time;

    if (running && !gameOver) {
      updatePlayer(dt);
      updateGhosts(dt);
    }

    clear();
    drawMap();
    drawPacman(time);
    ghosts.forEach(drawGhost);
    drawHud();

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '700 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(win ? 'YOU WIN' : 'GAME OVER', canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(frame);
  }

  function setDirectionByKey(key) {
    const normalized = key.toLowerCase();
    let moved = false;

    if (normalized === 'arrowleft' || normalized === 'a') {
      player.nextDir = DIRS.left;
      moved = true;
    }
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
    canvas.height = ROWS * TILE;
    countPellets();
    resetPositions();
    drawHud();
    requestAnimationFrame(frame);
  }

  init();
});
