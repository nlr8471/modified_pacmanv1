function drawMap() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = map[y][x];
      const px = x * TILE;
      const py = y * TILE + HUD_HEIGHT;

      if (tile === '#') {
        // VHS Wall aesthetic: Dark purple fill with vibrant neon magenta borders
        ctx.fillStyle = '#230b3b';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#ff2a85';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      } else {
        ctx.fillStyle = '#080212';
        ctx.fillRect(px, py, TILE, TILE);

        if (tile === '.') {
          ctx.fillStyle = '#ffe16b';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'o') {
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function clear() {
  ctx.fillStyle = '#080212';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBackgroundGrid() {
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
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
