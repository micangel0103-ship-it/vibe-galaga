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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hit(a, b) {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
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

function setButtonPressed(name, isPressed, element) {
  if (isPressed) {
    pressedButtons.add(name);
    element.classList.add("pressed");
  } else {
    pressedButtons.delete(name);
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
