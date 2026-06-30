const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const stageEl = document.querySelector("#stage");
const livesEl = document.querySelector("#lives");
const bestScoreEl = document.querySelector("#bestScore");
const weaponEl = document.querySelector("#weapon");
const shieldEl = document.querySelector("#shield");
const comboEl = document.querySelector("#combo");
const overlay = document.querySelector("#overlay");
const overlayText = document.querySelector("#overlayText");
const primaryAction = document.querySelector("#primaryAction");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");
const fireButton = document.querySelector("#fireButton");
const pauseButton = document.querySelector("#pauseButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const STORAGE_KEY = "star-raid-best-score";

const keys = new Set();
const pressedButtons = new Set();

const enemyCatalog = {
  scout: {
    label: "Scout",
    color: "#8de85f",
    hp: 1,
    speed: 1.2,
    sway: 6,
    points: 20,
    fireWeight: 0.8,
    bulletSpeed: 175,
    width: 28,
    height: 22,
  },
  brute: {
    label: "Brute",
    color: "#ffcc4d",
    hp: 3,
    speed: 0.75,
    sway: 3,
    points: 60,
    fireWeight: 0.45,
    bulletSpeed: 145,
    width: 34,
    height: 26,
  },
  shooter: {
    label: "Shooter",
    color: "#57d9ff",
    hp: 2,
    speed: 0.95,
    sway: 5,
    points: 45,
    fireWeight: 1.1,
    bulletSpeed: 205,
    width: 30,
    height: 24,
  },
  splitter: {
    label: "Splitter",
    color: "#ff5a68",
    hp: 2,
    speed: 0.85,
    sway: 4,
    points: 55,
    fireWeight: 0.65,
    bulletSpeed: 170,
    width: 32,
    height: 24,
  },
};

const weaponCatalog = {
  blaster: {
    label: "Blaster",
    cooldown: 190,
    fire: () => {
      playerShots.push(makeShot(player.x, player.y - 20, 0, -580));
    },
  },
  spread: {
    label: "Spread",
    cooldown: 250,
    fire: () => {
      playerShots.push(makeShot(player.x - 14, player.y - 20, -130, -540));
      playerShots.push(makeShot(player.x, player.y - 20, 0, -560));
      playerShots.push(makeShot(player.x + 14, player.y - 20, 130, -540));
    },
  },
  laser: {
    label: "Laser",
    cooldown: 460,
    fire: () => {
      beams.push({
        x: player.x,
        y: player.y - 30,
        width: 8,
        life: 0.14,
        damageTick: 0,
      });
    },
  },
  homing: {
    label: "Homing",
    cooldown: 260,
    fire: () => {
      playerShots.push(makeHomingShot(player.x, player.y - 20));
    },
  },
};

const itemCatalog = {
  shield: {
    label: "S",
    color: "#57d9ff",
  },
  weapon: {
    label: "W",
    color: "#ffcc4d",
  },
  repair: {
    label: "+",
    color: "#8de85f",
  },
  score: {
    label: "2x",
    color: "#ff5a68",
  },
  bomb: {
    label: "B",
    color: "#d77bff",
  },
  rapid: {
    label: "R",
    color: "#7fd1ff",
  },
};

let state = "ready";
let score = 0;
let bestScore = loadBestScore();
let lives = 3;
let stage = 1;
let comboStreak = 0;
let comboTimer = 0;
let scoreBoostTimer = 0;
let rapidFireTimer = 0;
let weaponTimer = 0;
let currentWeapon = "blaster";
let shieldCharges = 1;
let lastTime = 0;
let enemyFireTimer = 0;
let enemyFireDelay = 900;
let spawnPause = 0;
let playerInvincible = 0;
let formationCenterX = WIDTH / 2;
let formationCenterY = 150;
let formationWave = 0;
let formationDrift = 0.65;
let diveTimer = 0;
let diveCooldown = 0;
let wingTimer = 0;
let wingCooldown = 0;
let boss = null;
let bossIntroTimer = 0;

const player = {
  x: WIDTH / 2,
  y: HEIGHT - 58,
  width: 36,
  height: 32,
  speed: 330,
  cooldown: 0,
};

let playerShots = [];
let enemyShots = [];
let beams = [];
let enemies = [];
let items = [];
let bursts = [];
let stars = [];

function loadBestScore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number.parseInt(raw ?? "0", 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures in file-based or restricted environments.
  }
}

function resetStars() {
  stars = Array.from({ length: 96 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    radius: Math.random() * 1.6 + 0.35,
    speed: Math.random() * 28 + 12,
    alpha: Math.random() * 0.55 + 0.25,
  }));
}

function resetGame() {
  state = "playing";
  score = 0;
  lives = 3;
  stage = 1;
  comboStreak = 0;
  comboTimer = 0;
  scoreBoostTimer = 0;
  rapidFireTimer = 0;
  weaponTimer = 0;
  currentWeapon = "blaster";
  shieldCharges = 1;
  lastTime = 0;
  enemyFireTimer = 0;
  spawnPause = 0;
  playerInvincible = 1100;
  formationCenterX = WIDTH / 2;
  formationCenterY = 150;
  formationWave = 0;
  formationDrift = 0.65;
  diveTimer = 0;
  diveCooldown = 0;
  wingTimer = 0;
  wingCooldown = 0;
  boss = null;
  bossIntroTimer = 0;
  player.cooldown = 0;
  player.x = WIDTH / 2;
  playerShots = [];
  enemyShots = [];
  beams = [];
  items = [];
  bursts = [];
  buildStage();
  resetStars();
  clearInputState();
  syncHud();
  hideOverlay();
  syncPauseButton();
  requestAnimationFrame(loop);
}

function resumeGame() {
  if (state !== "paused") {
    return;
  }

  state = "playing";
  lastTime = 0;
  clearInputState();
  hideOverlay();
  syncPauseButton();
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (state !== "playing") {
    return;
  }

  state = "paused";
  clearInputState();
  showOverlay("Paused", "Enemy waves are holding position.", "Resume");
  syncPauseButton();
}

function togglePause() {
  if (bossIntroTimer > 0) {
    return;
  }

  if (state === "playing") {
    pauseGame();
  } else if (state === "paused") {
    resumeGame();
  }
}

function buildStage() {
  enemies = [];
  enemyFireTimer = 0;
  enemyFireDelay = Math.max(280, 900 - stage * 65);
  formationCenterX = WIDTH / 2;
  formationCenterY = 150;
  formationWave = 0;
  formationDrift = 0.65 + stage * 0.03;
  diveTimer = 0;
  diveCooldown = 800;
  wingTimer = 0;
  wingCooldown = 1400;

  const rows = Math.min(6, 3 + Math.floor(stage / 2));
  const cols = 8;
  const gapX = stage >= 6 ? 40 : 46;
  const gapY = 38;
  const formationWidth = (cols - 1) * gapX;
  const formationHeight = (rows - 1) * gapY;
  const startX = -formationWidth / 2;
  const startY = -formationHeight / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const type = pickEnemyType(row, col, rows, stage);
      const spec = enemyCatalog[type];
      enemies.push({
        anchorX: startX + col * gapX,
        anchorY: startY + row * gapY,
        x: WIDTH / 2 + startX + col * gapX,
        y: formationCenterY + startY + row * gapY,
        width: spec.width,
        height: spec.height,
        row,
        col,
        type,
        hp: spec.hp,
        maxHp: spec.hp,
        phase: Math.random() * Math.PI * 2,
        sway: spec.sway + Math.random() * 2,
        points: spec.points,
        bulletSpeed: spec.bulletSpeed,
        fireWeight: spec.fireWeight,
        fireCooldown: 0.5 + Math.random() * 1.4,
        mini: false,
        mode: "formation",
        diveProgress: 0,
        diveStartX: 0,
        diveStartY: 0,
        diveControlX: 0,
        diveControlY: 0,
      });
    }
  }
}

function startBossIntro() {
  boss = null;
  bossIntroTimer = 2200;
  showOverlay("Boss Incoming", "A command unit is approaching.", "Brace");
}

function spawnBoss() {
  hideOverlay();
  boss = {
    x: WIDTH / 2,
    y: 90,
    width: 120,
    height: 70,
    hp: 36 + stage * 10,
    maxHp: 36 + stage * 10,
    vx: 76,
    phase: 0,
    attackTimer: 0,
    attackPattern: 0,
  };
}

function pickEnemyType(row, col, rows, currentStage) {
  const roll = Math.random();
  if (row === 0) {
    if (currentStage >= 4 && roll < 0.35) return "splitter";
    return roll < 0.5 ? "shooter" : "scout";
  }
  if (row === rows - 1) {
    if (currentStage >= 3 && roll < 0.35) return "brute";
    return roll < 0.7 ? "brute" : "scout";
  }
  if (currentStage >= 5 && roll < 0.25) {
    return "splitter";
  }
  if (roll < 0.35) return "shooter";
  if (roll < 0.7) return "scout";
  return "brute";
}

function syncHud() {
  scoreEl.textContent = score.toString();
  stageEl.textContent = stage.toString();
  livesEl.textContent = lives.toString();
  bestScoreEl.textContent = bestScore.toString();
  weaponEl.textContent = getWeaponLabel();
  shieldEl.textContent = shieldCharges.toString();
  comboEl.textContent = comboTimer > 0 && comboStreak > 1 ? `x${getComboMultiplier()}` : "-";
  syncPauseButton();
}

function getWeaponLabel() {
  if (weaponTimer <= 0) {
    return "Blaster";
  }
  return weaponCatalog[currentWeapon].label;
}

function syncPauseButton() {
  pauseButton.querySelector("span").textContent = state === "paused" ? ">" : "II";
  pauseButton.setAttribute("aria-label", state === "paused" ? "Resume game" : "Pause game");
}

function showOverlay(title, text, actionText) {
  overlay.querySelector("h1").textContent = title;
  overlayText.textContent = text;
  primaryAction.textContent = actionText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function loop(time) {
  if (state !== "playing") {
    return;
  }

  const delta = Math.min(32, time - (lastTime || time));
  lastTime = time;

  update(delta);
  draw();

  requestAnimationFrame(loop);
}

function update(delta) {
  const dt = delta / 1000;

  if (bossIntroTimer > 0) {
    bossIntroTimer -= delta;
    updateStars(dt);
    updateBursts(dt);
    if (bossIntroTimer <= 0) {
      spawnBoss();
    }
    syncHud();
    draw();
    return;
  }

  updateStars(dt);
  updatePlayer(dt, delta);
  updatePlayerShots(dt);
  updateEnemyShots(dt);
  updateBeams(dt);
  updateItems(dt);
  updateEnemies(dt, delta);
  updateBoss(dt, delta);
  updateBursts(dt);
  updateTimers(delta);
  resolveCollisions();
  checkStageState(delta);
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > HEIGHT) {
      star.x = Math.random() * WIDTH;
      star.y = -4;
      star.radius = Math.random() * 1.6 + 0.35;
      star.speed = Math.random() * 28 + 12;
      star.alpha = Math.random() * 0.55 + 0.25;
    }
  }
}

function updatePlayer(dt, delta) {
  let move = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || pressedButtons.has("left")) {
    move -= 1;
  }
  if (keys.has("ArrowRight") || keys.has("KeyD") || pressedButtons.has("right")) {
    move += 1;
  }

  player.x += move * player.speed * dt;
  player.x = clamp(player.x, player.width / 2 + 8, WIDTH - player.width / 2 - 8);
  player.cooldown = Math.max(0, player.cooldown - delta);
  playerInvincible = Math.max(0, playerInvincible - delta);

  if (keys.has("Space") || pressedButtons.has("fire")) {
    firePlayerWeapon();
  }
}

function firePlayerWeapon() {
  if (player.cooldown > 0 || state !== "playing") {
    return;
  }

  const rapidActive = rapidFireTimer > 0;
  const cooldown = rapidActive ? 0.65 : 1;
  const fireSpec = weaponCatalog[weaponTimer > 0 ? currentWeapon : "blaster"];
  fireSpec.fire();
  player.cooldown = fireSpec.cooldown * cooldown;
}

function makeShot(x, y, vx, vy) {
  return {
    kind: "shot",
    x,
    y,
    vx,
    vy,
    width: 5,
    height: 18,
    life: 0,
  };
}

function makeHomingShot(x, y) {
  return {
    kind: "homing",
    x,
    y,
    vx: 0,
    vy: -250,
    width: 7,
    height: 18,
    life: 0,
  };
}

function updatePlayerShots(dt) {
  const activeWeapon = weaponTimer > 0 ? currentWeapon : "blaster";

  for (const shot of playerShots) {
    shot.life += dt;
    if (shot.kind === "homing") {
      steerHomingShot(shot, dt);
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
  }

  playerShots = playerShots.filter(
    (shot) =>
      shot.y + shot.height > -20 &&
      shot.y - shot.height < HEIGHT + 20 &&
      shot.x > -30 &&
      shot.x < WIDTH + 30
  );

  if (activeWeapon === "laser") {
    // Beams are handled separately.
  }
}

function steerHomingShot(shot, dt) {
  const target = findNearestEnemy(shot.x, shot.y);
  if (!target) {
    shot.vx *= 0.98;
    return;
  }

  const dx = target.x - shot.x;
  const desiredVx = clamp(dx * 4.2, -220, 220);
  shot.vx += (desiredVx - shot.vx) * Math.min(1, dt * 5);
  shot.vy -= dt * 18;
}

function updateEnemyShots(dt) {
  for (const shot of enemyShots) {
    shot.y += shot.vy * dt;
    shot.x += shot.vx * dt;
    shot.wobble += dt * 6;
    shot.x += Math.sin(shot.wobble) * 12 * dt;
  }

  enemyShots = enemyShots.filter(
    (shot) => shot.y - shot.height < HEIGHT + 24 && shot.x > -24 && shot.x < WIDTH + 24
  );
}

function updateBeams(dt) {
  for (const beam of beams) {
    beam.life -= dt;
    beam.damageTick -= dt;
  }
  beams = beams.filter((beam) => beam.life > 0);
}

function updateItems(dt) {
  for (const item of items) {
    item.y += item.speed * dt;
    item.x += Math.sin(item.wobble) * 18 * dt;
    item.wobble += dt * 4;
  }

  items = items.filter((item) => item.y < HEIGHT + 30);
}

function updateEnemies(dt, delta) {
  if (enemies.length === 0 || boss) {
    return;
  }

  formationWave += dt * 2.4;
  formationCenterX += Math.sin(formationWave * 0.35) * formationDrift * 18 * dt;
  formationCenterX = clamp(formationCenterX, 96, WIDTH - 96);
  formationCenterY += Math.sin(formationWave * 0.55) * 4 * dt;

  diveTimer += delta;
  diveCooldown = Math.max(0, diveCooldown - delta);
  if (diveCooldown === 0 && diveTimer > Math.max(1100, 2100 - stage * 90)) {
    launchDiveAttack();
    diveTimer = 0;
    diveCooldown = 900;
  }

  wingTimer += delta;
  wingCooldown = Math.max(0, wingCooldown - delta);
  if (wingCooldown === 0 && wingTimer > Math.max(1600, 3200 - stage * 120)) {
    launchWingAttack();
    wingTimer = 0;
    wingCooldown = 1500;
  }

  for (const enemy of enemies) {
    enemy.fireCooldown -= dt;
    if (enemy.mode === "formation") {
      enemy.phase += dt * (2.4 + stage * 0.02);
      enemy.x = formationCenterX + enemy.anchorX + Math.sin(enemy.phase + enemy.col * 0.45) * enemy.sway;
      enemy.y = formationCenterY + enemy.anchorY + Math.cos(enemy.phase * 0.7 + enemy.row * 0.3) * 3;
    } else if (enemy.mode === "dive") {
      updateDivingEnemy(enemy, dt);
    } else if (enemy.mode === "wing") {
      updateWingEnemy(enemy, dt);
    }
  }

  enemyFireTimer += delta;
  if (enemyFireTimer >= enemyFireDelay) {
    enemyFireTimer = 0;
    fireEnemyWave();
  }
}

function launchDiveAttack() {
  const perColumn = new Map();
  for (const enemy of enemies) {
    if (enemy.mode !== "formation") {
      continue;
    }
    const existing = perColumn.get(enemy.col);
    if (!existing || enemy.y > existing.y) {
      perColumn.set(enemy.col, enemy);
    }
  }

  const candidates = [...perColumn.values()];

  if (candidates.length === 0) {
    return;
  }

  const attacker = candidates[Math.floor(Math.random() * candidates.length)];
  attacker.mode = "dive";
  attacker.diveProgress = 0;
  attacker.diveStartX = attacker.x;
  attacker.diveStartY = attacker.y;
  attacker.diveControlX = clamp(player.x + (Math.random() * 120 - 60), 40, WIDTH - 40);
  attacker.diveControlY = HEIGHT * (0.36 + Math.random() * 0.12);
  attacker.fireCooldown = 0.35;
}

function launchWingAttack() {
  const left = enemies
    .filter((enemy) => enemy.mode === "formation")
    .reduce((best, enemy) => (!best || enemy.x < best.x ? enemy : best), null);
  const right = enemies
    .filter((enemy) => enemy.mode === "formation")
    .reduce((best, enemy) => (!best || enemy.x > best.x ? enemy : best), null);

  const pair = [left, right].filter(Boolean);
  if (pair.length === 0) {
    return;
  }

  const spread = 120 + stage * 6;
  pair.forEach((enemy, index) => {
    enemy.mode = "wing";
    enemy.diveProgress = 0;
    enemy.diveStartX = enemy.x;
    enemy.diveStartY = enemy.y;
    enemy.diveControlX = index === 0 ? clamp(enemy.x - spread, 30, WIDTH - 30) : clamp(enemy.x + spread, 30, WIDTH - 30);
    enemy.diveControlY = HEIGHT * (0.24 + index * 0.08);
    enemy.diveReturnDelay = 0.18;
    enemy.diveSway = index === 0 ? -1 : 1;
    enemy.fireCooldown = 0.25;
  });
}

function updateDivingEnemy(enemy, dt) {
  enemy.diveProgress += dt * (0.55 + stage * 0.01);
  const t = clamp(enemy.diveProgress, 0, 1);
  const invT = 1 - t;
  const p0x = enemy.diveStartX;
  const p0y = enemy.diveStartY;
  const p1x = enemy.diveControlX;
  const p1y = enemy.diveControlY;
  const p2x = formationCenterX + enemy.anchorX;
  const p2y = formationCenterY + enemy.anchorY;

  enemy.x = invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x;
  enemy.y = invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y;

  if (enemy.diveProgress >= 1) {
    enemy.mode = "formation";
    enemy.x = p2x;
    enemy.y = p2y;
  }
}

function updateWingEnemy(enemy, dt) {
  enemy.diveProgress += dt * (0.85 + stage * 0.01);
  const t = clamp(enemy.diveProgress, 0, 1);
  const invT = 1 - t;
  const p0x = enemy.diveStartX;
  const p0y = enemy.diveStartY;
  const p1x = enemy.diveControlX;
  const p1y = enemy.diveControlY;
  const p2x = formationCenterX + enemy.anchorX;
  const p2y = formationCenterY + enemy.anchorY;

  const arc = Math.sin(t * Math.PI) * 56 * enemy.diveSway;
  enemy.x = invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x + arc;
  enemy.y = invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y - Math.sin(t * Math.PI) * 18;

  if (enemy.diveProgress >= 1) {
    enemy.mode = "formation";
    enemy.x = p2x;
    enemy.y = p2y;
  }
}

function fireEnemyWave() {
  if (enemies.length === 0) {
    return;
  }

  const columnBottomEnemies = new Map();
  for (const enemy of enemies) {
    const existing = columnBottomEnemies.get(enemy.col);
    if (!existing || enemy.y > existing.y) {
      columnBottomEnemies.set(enemy.col, enemy);
    }
  }

  const candidates = [...columnBottomEnemies.values()].filter(
    (enemy) => enemy.fireCooldown <= 0
  );
  if (candidates.length === 0) {
    return;
  }

  const chosen = pickWeightedEnemy(candidates);
  chosen.fireCooldown = 0.9 + Math.random() * 1.4;
  fireEnemyShot(chosen);

  if (chosen.type === "shooter" && Math.random() < 0.45) {
    chosen.fireCooldown *= 0.7;
    fireEnemyShot(chosen, -55);
    fireEnemyShot(chosen, 55);
  }
}

function pickWeightedEnemy(list) {
  const total = list.reduce((sum, enemy) => sum + enemy.fireWeight, 0);
  let roll = Math.random() * total;
  for (const enemy of list) {
    roll -= enemy.fireWeight;
    if (roll <= 0) {
      return enemy;
    }
  }
  return list[list.length - 1];
}

function fireEnemyShot(enemy, vxOffset = 0) {
  enemyShots.push({
    x: enemy.x,
    y: enemy.y + enemy.height / 2,
    vx: vxOffset + clamp((player.x - enemy.x) * 0.14, -80, 80),
    vy: enemy.bulletSpeed + stage * 8,
    width: 6,
    height: 16,
    wobble: Math.random() * Math.PI * 2,
  });
}

function updateBursts(dt) {
  for (const burst of bursts) {
    burst.life -= dt;
    burst.radius += dt * 52;
  }
  bursts = bursts.filter((burst) => burst.life > 0);
}

function updateBoss(dt, delta) {
  if (!boss) {
    return;
  }

  boss.phase += dt * (1.2 + stage * 0.03);
  boss.attackTimer += delta;
  boss.x += boss.vx * dt;

  if (boss.x < 90 || boss.x > WIDTH - 90) {
    boss.vx *= -1;
  }

  boss.y = 88 + Math.sin(boss.phase) * 12;

  if (boss.attackTimer >= Math.max(700, 1600 - stage * 70)) {
    boss.attackTimer = 0;
    fireBossPattern();
  }
}

function fireBossPattern() {
  if (!boss) {
    return;
  }

  const phase = boss.hp / boss.maxHp;
  const baseSpeed = 220 + stage * 8;
  if (phase > 0.66) {
    for (const offset of [-24, 0, 24]) {
      enemyShots.push({
        x: boss.x + offset,
        y: boss.y + boss.height / 2,
        vx: offset * 0.3,
        vy: baseSpeed,
        width: 8,
        height: 18,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  } else if (phase > 0.33) {
    for (const offset of [-48, -24, 0, 24, 48]) {
      enemyShots.push({
        x: boss.x,
        y: boss.y + boss.height / 2,
        vx: offset * 0.9,
        vy: baseSpeed + 28,
        width: 7,
        height: 16,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  } else {
    for (let i = -2; i <= 2; i += 1) {
      enemyShots.push({
        x: boss.x,
        y: boss.y + boss.height / 2,
        vx: i * 42,
        vy: baseSpeed + 52,
        width: 7,
        height: 16,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    if (Math.random() < 0.55) {
      enemyShots.push({
        x: boss.x,
        y: boss.y + boss.height / 2,
        vx: 0,
        vy: baseSpeed + 110,
        width: 10,
        height: 22,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }
}

function updateTimers(delta) {
  comboTimer = Math.max(0, comboTimer - delta);
  scoreBoostTimer = Math.max(0, scoreBoostTimer - delta);
  rapidFireTimer = Math.max(0, rapidFireTimer - delta);
  weaponTimer = Math.max(0, weaponTimer - delta);

  if (comboTimer === 0) {
    comboStreak = 0;
  }

  syncHud();
}

function resolveCollisions() {
  for (let i = playerShots.length - 1; i >= 0; i -= 1) {
    const shot = playerShots[i];
    if (boss && hit(shot, boss)) {
      playerShots.splice(i, 1);
      damageBoss(1);
      continue;
    }
    const enemyIndex = enemies.findIndex((enemy) => hit(shot, enemy));
    if (enemyIndex !== -1) {
      const enemy = enemies[enemyIndex];
      damageEnemy(enemy, 1, i);
    }
  }

  for (let i = beams.length - 1; i >= 0; i -= 1) {
    const beam = beams[i];
    if (beam.damageTick > 0) {
      continue;
    }
    beam.damageTick = 0.05;
    const hits = enemies.filter((enemy) => beamHitsEnemy(beam, enemy));
    for (const enemy of hits) {
      damageEnemy(enemy, 2, null, true);
    }
  }

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (hit(item, player)) {
      items.splice(i, 1);
      applyItem(item.type);
      bursts.push({
        x: player.x,
        y: player.y,
        radius: 6,
        life: 0.42,
        color: itemCatalog[item.type].color,
      });
      syncHud();
    }
  }

  const playerBox = {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
  };

  if (playerInvincible <= 0) {
    const hitByShot = enemyShots.findIndex((shot) => hit(shot, playerBox));
    const hitByEnemy = enemies.findIndex((enemy) => hit(enemy, playerBox));

    if (hitByShot !== -1 || hitByEnemy !== -1) {
      if (hitByShot !== -1) {
        enemyShots.splice(hitByShot, 1);
      }
      playerHit();
    }
  }

  if (enemies.some((enemy) => enemy.y + enemy.height / 2 >= player.y - 4)) {
    lives = 0;
    syncHud();
    endGame();
  }

  if (boss && boss.y + boss.height / 2 >= player.y - 6) {
    lives = 0;
    syncHud();
    endGame();
  }
}

function damageBoss(amount) {
  if (!boss) {
    return;
  }

  boss.hp = Math.max(0, boss.hp - amount);
  bursts.push({
    x: boss.x + (Math.random() * 50 - 25),
    y: boss.y + (Math.random() * 20 - 10),
    radius: 8,
    life: 0.22,
    color: "#ffcc4d",
  });

  if (scoreBoostTimer > 0) {
    score += amount * 6;
  } else {
    score += amount * 3;
  }
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }
  syncHud();

  if (boss.hp <= 0) {
    defeatBoss();
  }
}

function beamHitsEnemy(beam, enemy) {
  return Math.abs(enemy.x - beam.x) < beam.width + enemy.width / 2 && enemy.y < beam.y;
}

function damageEnemy(enemy, damage, shotIndex = null, fromBeam = false, suppressSplit = false) {
  enemy.hp -= damage;
  if (shotIndex !== null) {
    playerShots.splice(shotIndex, 1);
  }

  bursts.push({
    x: enemy.x,
    y: enemy.y,
    radius: 4,
    life: 0.26,
    color: enemyCatalog[enemy.type].color,
  });

  if (enemy.hp <= 0) {
    killEnemy(enemy, fromBeam, suppressSplit);
  } else if (!fromBeam) {
    maybeDropItem(enemy, 0.12);
  }
}

function killEnemy(enemy, fromBeam, suppressSplit = false) {
  const index = enemies.indexOf(enemy);
  if (index !== -1) {
    enemies.splice(index, 1);
  }

  comboStreak = comboTimer > 0 ? comboStreak + 1 : 1;
  comboTimer = 1200;

  let gained = enemy.points * getComboMultiplier();
  if (scoreBoostTimer > 0) {
    gained *= 2;
  }
  score += gained;

  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }

  bursts.push({
    x: enemy.x,
    y: enemy.y,
    radius: fromBeam ? 6 : 5,
    life: 0.36,
    color: enemyCatalog[enemy.type].color,
  });

  if (enemy.type === "splitter" && !enemy.mini && !suppressSplit) {
    splitEnemy(enemy);
  }

  maybeDropItem(enemy, 0.35);
  syncHud();
}

function splitEnemy(enemy) {
  const offsets = [-18, 18];
  for (const offset of offsets) {
    enemies.push({
      x: clamp(enemy.x + offset, 30, WIDTH - 30),
      y: enemy.y + 10,
      baseY: enemy.y + 10,
      width: 22,
      height: 18,
      row: enemy.row,
      col: enemy.col,
      type: "scout",
      hp: 1,
      maxHp: 1,
      phase: Math.random() * Math.PI * 2,
      sway: 4,
      points: 10,
      bulletSpeed: 160,
      fireWeight: 0.55,
      fireCooldown: 0.9 + Math.random() * 0.7,
      mini: true,
    });
  }
}

function maybeDropItem(enemy, baseChance) {
  const stageChance = baseChance + Math.min(0.18, stage * 0.01);
  if (Math.random() > stageChance) {
    return;
  }

  const typePool =
    enemy.type === "brute"
      ? ["shield", "repair", "score", "weapon"]
      : enemy.type === "splitter"
        ? ["weapon", "bomb", "score", "rapid"]
        : enemy.type === "shooter"
          ? ["weapon", "rapid", "shield", "score"]
          : ["weapon", "rapid", "score", "repair"];

  const type = typePool[Math.floor(Math.random() * typePool.length)];
  items.push({
    x: enemy.x,
    y: enemy.y,
    width: 22,
    height: 22,
    type,
    speed: 96 + stage * 6,
    wobble: Math.random() * Math.PI * 2,
  });
}

function applyItem(type) {
  switch (type) {
    case "shield":
      shieldCharges = Math.min(3, shieldCharges + 1);
      break;
    case "repair":
      lives = Math.min(5, lives + 1);
      break;
    case "weapon":
      equipRandomWeapon();
      break;
    case "score":
      scoreBoostTimer = Math.max(scoreBoostTimer, 8000);
      break;
    case "bomb":
      triggerBomb();
      break;
    case "rapid":
      rapidFireTimer = Math.max(rapidFireTimer, 7000);
      break;
    default:
      break;
  }
}

function triggerBomb() {
  enemyShots = [];
  for (const enemy of [...enemies]) {
    damageEnemy(enemy, 2, null, false, true);
  }
  bursts.push({
    x: player.x,
    y: player.y,
    radius: 18,
    life: 0.7,
    color: "#d77bff",
  });
}

function playerHit() {
  if (shieldCharges > 0) {
    shieldCharges -= 1;
    playerInvincible = 850;
    bursts.push({
      x: player.x,
      y: player.y,
      radius: 10,
      life: 0.55,
      color: "#57d9ff",
    });
    syncHud();
    return;
  }

  lives -= 1;
  playerInvincible = 1400;
  enemyShots = [];
  bursts.push({
    x: player.x,
    y: player.y,
    radius: 10,
    life: 0.52,
    color: "#ff5a68",
  });
  syncHud();

  if (lives <= 0) {
    endGame();
  }
}

function checkStageState(delta) {
  if (state !== "playing") {
    return;
  }

  if (boss) {
    return;
  }

  if (enemies.length === 0) {
    spawnPause += delta;
    if (spawnPause > 850) {
      stage += 1;
      spawnPause = 0;
      playerInvincible = 900;
      shieldCharges = Math.min(3, shieldCharges + 1);
      if (stage % 4 === 0) {
        startBossIntro();
      } else {
        if (stage % 3 === 0) {
          equipRandomWeapon();
        }
        buildStage();
      }
      syncHud();
    }
  }
}

function defeatBoss() {
  if (!boss) {
    return;
  }

  bursts.push({
    x: boss.x,
    y: boss.y,
    radius: 26,
    life: 0.95,
    color: "#d77bff",
  });
  score += 600;
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }
  boss = null;
  stage += 1;
  shieldCharges = Math.min(3, shieldCharges + 1);
  equipRandomWeapon();
  buildStage();
  syncHud();
}

function endGame() {
  state = "gameOver";
  clearInputState();
  if (score > bestScore) {
    bestScore = score;
    saveBestScore(bestScore);
  }
  syncHud();
  bursts.push({
    x: player.x,
    y: player.y,
    radius: 12,
    life: 0.7,
    color: "#ff5a68",
  });
  draw();
  showOverlay("Game Over", `Score ${score} / Best ${bestScore}`, "Restart");
  syncPauseButton();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawItems();
  drawPlayerShots();
  drawEnemyShots();
  drawBeams();
  drawBoss();
  drawEnemies();
  drawPlayer();
  drawBursts();
  drawStatus();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#03080e");
  gradient.addColorStop(0.55, "#06121b");
  gradient.addColorStop(1, "#0b1111");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d7ffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(87, 217, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 40; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawStatus() {
  const parts = [];

  if (boss) {
    parts.push(`Boss ${Math.ceil((boss.hp / boss.maxHp) * 100)}%`);
  }

  if (shieldCharges > 0) {
    parts.push(`Shield ${shieldCharges}`);
  }
  if (weaponTimer > 0) {
    parts.push(`Weapon ${weaponCatalog[currentWeapon].label}`);
  }
  if (rapidFireTimer > 0) {
    parts.push(`Rapid ${Math.ceil(rapidFireTimer / 1000)}s`);
  }
  if (scoreBoostTimer > 0) {
    parts.push("Score x2");
  }
  if (comboTimer > 0 && comboStreak > 1) {
    parts.push(`Combo x${getComboMultiplier()}`);
  }

  if (parts.length === 0) {
    return;
  }

  const paddingX = 12;
  const text = parts.join("  ");
  ctx.save();
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  const width = Math.min(WIDTH - 24, ctx.measureText(text).width + paddingX * 2);
  const x = 12;
  const y = 12;
  ctx.fillStyle = "rgba(4, 9, 13, 0.72)";
  roundedRect(x, y, width, 28, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(87, 217, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#eaf7f5";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingX, y + 14);
  ctx.restore();
}

function drawBoss() {
  if (!boss) {
    return;
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.fillStyle = "#d77bff";
  roundedRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height, 18);
  ctx.fill();

  ctx.fillStyle = "#041018";
  roundedRect(-56, -10, 28, 16, 6);
  ctx.fill();
  roundedRect(28, -10, 28, 16, 6);
  ctx.fill();

  ctx.strokeStyle = "#ffcc4d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const barX = 52;
  const barY = 50;
  const barWidth = WIDTH - 104;
  const fill = clamp(boss.hp / boss.maxHp, 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(4, 9, 13, 0.78)";
  roundedRect(barX, barY, barWidth, 14, 7);
  ctx.fill();
  ctx.fillStyle = "#d77bff";
  roundedRect(barX + 2, barY + 2, (barWidth - 4) * fill, 10, 5);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const blinking = playerInvincible > 0 && Math.floor(playerInvincible / 120) % 2 === 0;
  if (blinking) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  if (shieldCharges > 0) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#57d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#57d9ff";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(20, 18);
  ctx.lineTo(6, 12);
  ctx.lineTo(0, 22);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#eaf7f5";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(7, 5);
  ctx.lineTo(-7, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffcc4d";
  ctx.fillRect(-4, 18, 8, 8);
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    const spec = enemyCatalog[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = spec.color;
    ctx.beginPath();
    if (enemy.type === "brute") {
      roundedRect(-17, -12, 34, 24, 6);
      ctx.fill();
    } else if (enemy.type === "splitter") {
      ctx.moveTo(0, -14);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(-15, 4);
      ctx.lineTo(-8, -12);
      ctx.lineTo(0, -6);
      ctx.lineTo(8, -12);
      ctx.lineTo(15, 4);
      ctx.lineTo(7, 12);
      ctx.lineTo(-7, 12);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#071014";
    ctx.fillRect(-8, 1, 5, 4);
    ctx.fillRect(3, 1, 5, 4);
    ctx.restore();
  }
}

function drawPlayerShots() {
  for (const shot of playerShots) {
    if (shot.kind === "homing") {
      drawHomingShot(shot);
      continue;
    }
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(-shot.vx, -shot.vy));
    ctx.fillStyle = "#eaf7f5";
    roundedRect(-shot.width / 2, -shot.height / 2, shot.width, shot.height, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawHomingShot(shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.fillStyle = "#ffcc4d";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemyShots() {
  ctx.fillStyle = "#ff5a68";
  for (const shot of enemyShots) {
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.vx, shot.vy));
    roundedRect(-shot.width / 2, -shot.height / 2, shot.width, shot.height, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawBeams() {
  for (const beam of beams) {
    const alpha = Math.max(0, beam.life / 0.14);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffcc4d";
    ctx.lineWidth = beam.width;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawItems() {
  for (const item of items) {
    const meta = itemCatalog[item.type];
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = "#041018";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#041018";
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.label, 0, 1);
    ctx.restore();
  }
}

function drawBursts() {
  for (const burst of bursts) {
    ctx.globalAlpha = Math.max(0, burst.life * 2);
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getComboMultiplier() {
  return Math.min(4, 1 + Math.floor((comboStreak - 1) / 3));
}

function findNearestEnemy(x, y) {
  let closest = null;
  let closestDistance = Infinity;
  for (const enemy of enemies) {
    const distance = Math.abs(enemy.x - x) + Math.abs(enemy.y - y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = enemy;
    }
  }
  return closest;
}

function hit(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setButtonPressed(name, isPressed, element) {
  if (isPressed) {
    pressedButtons.add(name);
    element.classList.add("pressed");
  } else {
    pressedButtons.delete(name);
    element.classList.remove("pressed");
  }
}

function clearInputState() {
  keys.clear();
  pressedButtons.clear();
  for (const element of [leftButton, rightButton, fireButton]) {
    element.classList.remove("pressed");
  }
}

function bindHoldButton(element, name) {
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    setButtonPressed(name, true, element);
    if (name === "fire") {
      firePlayerWeapon();
    }
  });

  element.addEventListener("pointerup", (event) => {
    event.preventDefault();
    setButtonPressed(name, false, element);
  });

  element.addEventListener("pointercancel", () => setButtonPressed(name, false, element));
  element.addEventListener("pointerleave", () => setButtonPressed(name, false, element));
}

function handlePrimaryAction() {
  if (bossIntroTimer > 0) {
    return;
  }

  if (state === "ready" || state === "gameOver") {
    resetGame();
    return;
  }

  if (state === "paused") {
    resumeGame();
    return;
  }

  if (state === "playing") {
    pauseGame();
  }
}

function equipWeaponByName(name, durationMs = 10000) {
  currentWeapon = name;
  weaponTimer = durationMs;
}

function equipRandomWeapon() {
  const names = Object.keys(weaponCatalog).filter((name) => name !== "blaster");
  const chosen = names[Math.floor(Math.random() * names.length)];
  equipWeaponByName(chosen, 10000);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
    if (event.code === "Space") {
      firePlayerWeapon();
    }
  }

  if (event.code === "Enter") {
    if (state === "ready" || state === "gameOver") {
      resetGame();
    } else if (state === "paused") {
      resumeGame();
    }
  }

  if (event.code === "Escape" || event.code === "KeyP") {
    event.preventDefault();
    togglePause();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

primaryAction.addEventListener("click", handlePrimaryAction);
pauseButton.addEventListener("click", togglePause);
bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");
bindHoldButton(fireButton, "fire");

resetStars();
syncHud();
draw();
showOverlay("Star Raid", "Collect weapons, manage shields, and survive the wave.", "Start");
syncPauseButton();
