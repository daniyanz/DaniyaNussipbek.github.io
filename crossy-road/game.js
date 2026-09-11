const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const startScreen = document.querySelector("#startScreen");
const gameOverScreen = document.querySelector("#gameOver");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const finalScoreElement = document.querySelector("#finalScore");

const laneHeight = 64;
const columns = 13;
const columnWidth = canvas.width / columns;
const player = { column: 6, row: 1, size: 42 };
let lanes = [];
let score = 0;
let best = Number(localStorage.getItem("crossy-roads-best") || 0);
let running = false;
let lastTime = 0;

bestElement.textContent = best;

const colors = {
  grass: ["#68c65e", "#5eb856"],
  road: ["#596269", "#505a61"],
  water: ["#42aada", "#389dcd"],
  cars: ["#ed5549", "#ffce45", "#54a8e8", "#8a66d7", "#f48441"]
};

function randomLane(index) {
  if (index < 2 || index % 5 === 0) return { type: "grass", obstacles: [], speed: 0 };
  const direction = index % 2 ? 1 : -1;
  const speed = direction * (62 + (index % 4) * 22);
  const obstacles = [];
  const gap = 235 + (index % 3) * 55;
  for (let x = -180; x < canvas.width + 250; x += gap) {
    obstacles.push({ x: x + ((index * 71) % 170), width: 92 + (index % 2) * 35 });
  }
  return { type: "road", obstacles, speed };
}

function resetGame() {
  lanes = Array.from({ length: 14 }, (_, index) => randomLane(index));
  player.column = 6;
  player.row = 1;
  score = 0;
  scoreElement.textContent = score;
  gameOverScreen.hidden = true;
  running = true;
  lastTime = performance.now();
}

function startGame() {
  startScreen.hidden = true;
  startScreen.style.display = "none";
  resetGame();
}

function endGame() {
  running = false;
  best = Math.max(best, score);
  localStorage.setItem("crossy-roads-best", best);
  bestElement.textContent = best;
  finalScoreElement.textContent = score;
  gameOverScreen.hidden = false;
}

function move(direction) {
  if (!running) return;
  if (direction === "left") player.column = Math.max(0, player.column - 1);
  if (direction === "right") player.column = Math.min(columns - 1, player.column + 1);
  if (direction === "down") player.row = Math.max(0, player.row - 1);
  if (direction === "up") {
    if (player.row < 6) {
      player.row += 1;
    } else {
      lanes.shift();
      lanes.push(randomLane(score + lanes.length));
    }
    score += 1;
    scoreElement.textContent = score;
  }
}

function roundedRect(x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawTree(x, y, scale = 1) {
  ctx.fillStyle = "#7a4d2d";
  ctx.fillRect(x - 7 * scale, y + 12 * scale, 14 * scale, 26 * scale);
  ctx.fillStyle = "#28884c";
  ctx.fillRect(x - 25 * scale, y - 20 * scale, 50 * scale, 42 * scale);
  ctx.fillStyle = "#3ba25b";
  ctx.fillRect(x - 18 * scale, y - 30 * scale, 36 * scale, 20 * scale);
}

function drawBackground() {
  lanes.forEach((lane, index) => {
    const y = canvas.height - (index + 1) * laneHeight;
    if (y < -laneHeight || y > canvas.height) return;
    const stripe = index % 2;
    ctx.fillStyle = colors[lane.type][stripe];
    ctx.fillRect(0, y, canvas.width, laneHeight);

    if (lane.type === "road") {
      ctx.fillStyle = "rgba(255,255,255,.42)";
      for (let x = 14; x < canvas.width; x += 70) ctx.fillRect(x, y + 30, 35, 4);
    } else {
      for (let x = 48 + (index * 83) % 150; x < canvas.width; x += 260) drawTree(x, y + 22, .7);
    }
  });
}

function drawVehicles() {
  lanes.forEach((lane, index) => {
    if (lane.type !== "road") return;
    const y = canvas.height - (index + 1) * laneHeight;
    lane.obstacles.forEach((vehicle, vehicleIndex) => {
      const color = colors.cars[(index + vehicleIndex) % colors.cars.length];
      roundedRect(vehicle.x, y + 11, vehicle.width, 42, 7, color);
      ctx.fillStyle = "#bfe9f5";
      ctx.fillRect(vehicle.x + 18, y + 16, Math.min(33, vehicle.width / 3), 13);
      ctx.fillStyle = "#25323a";
      ctx.fillRect(vehicle.x + 12, y + 49, 18, 8);
      ctx.fillRect(vehicle.x + vehicle.width - 30, y + 49, 18, 8);
    });
  });
}

function drawPlayer() {
  const x = player.column * columnWidth + columnWidth / 2;
  const y = canvas.height - (player.row + 1) * laneHeight + laneHeight / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(22,35,42,.2)";
  ctx.fillRect(-23, 18, 46, 10);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
  ctx.fillStyle = "#eaf1ef";
  ctx.fillRect(-player.size / 2, 9, player.size, 12);
  ctx.fillStyle = "#ed5549";
  ctx.fillRect(-7, -30, 14, 12);
  ctx.fillStyle = "#16232a";
  ctx.fillRect(-13, -10, 6, 6);
  ctx.fillRect(8, -10, 6, 6);
  ctx.fillStyle = "#f5a13b";
  ctx.fillRect(-8, 1, 16, 9);
  ctx.restore();
}

function update(delta) {
  lanes.forEach((lane) => {
    if (lane.type !== "road") return;
    lane.obstacles.forEach((vehicle) => {
      vehicle.x += lane.speed * delta;
      if (lane.speed > 0 && vehicle.x > canvas.width + 80) vehicle.x = -vehicle.width - 180;
      if (lane.speed < 0 && vehicle.x + vehicle.width < -80) vehicle.x = canvas.width + 180;
    });
  });

  const currentLane = lanes[player.row];
  if (currentLane && currentLane.type === "road") {
    const playerX = player.column * columnWidth + columnWidth / 2;
    const hit = currentLane.obstacles.some((vehicle) =>
      playerX + player.size / 2 > vehicle.x && playerX - player.size / 2 < vehicle.x + vehicle.width
    );
    if (hit) endGame();
  }
}

function loop(time) {
  const delta = Math.min((time - lastTime) / 1000, .05);
  lastTime = time;
  if (running) update(delta);
  drawBackground();
  drawVehicles();
  drawPlayer();
  requestAnimationFrame(loop);
}

document.querySelector("#startButton").addEventListener("click", startGame);
document.querySelector("#restartButton").addEventListener("click", resetGame);
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});

window.addEventListener("keydown", (event) => {
  const directions = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  };
  if (!directions[event.key]) return;
  event.preventDefault();
  move(directions[event.key]);
});

lanes = Array.from({ length: 14 }, (_, index) => randomLane(index));
drawBackground();
drawVehicles();
drawPlayer();
requestAnimationFrame(loop);
