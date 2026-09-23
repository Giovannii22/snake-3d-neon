import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// ---------- Config ----------
const GRID_SIZE = 20;
const CELL = 1;
const TICK_BASE = 160;
const TICK_MIN = 80;
const SPEEDUP_PER_FOOD = 4;
const HALF = (GRID_SIZE - 1) / 2;

const toWorld = (i) => (i - HALF) * CELL;

// ---------- DOM ----------
const canvas = document.getElementById("scene");
const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreEl = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const pauseScreen = document.getElementById("pause-screen");
const pauseBtn = document.getElementById("pause-btn");

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);

const viewSize = GRID_SIZE * 0.58;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 100
);
camera.up.set(0, 0, -1);
camera.position.set(0, GRID_SIZE, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.15, 0.45, 0.12
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ---------- Floor / grid ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID_SIZE * 1.6, GRID_SIZE * 1.6),
  new THREE.MeshBasicMaterial({ color: 0x030309 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
scene.add(floor);

const grid = new THREE.GridHelper(GRID_SIZE * CELL, GRID_SIZE, 0x0e5a6e, 0x0a2a38);
scene.add(grid);

const borderGeo = new THREE.EdgesGeometry(
  new THREE.PlaneGeometry(GRID_SIZE * CELL, GRID_SIZE * CELL)
);
const border = new THREE.LineSegments(
  borderGeo,
  new THREE.LineBasicMaterial({ color: 0x00f7ff })
);
border.rotation.x = -Math.PI / 2;
border.position.y = 0.01;
scene.add(border);

// ---------- Materials & mesh pool ----------
const segGeo = new THREE.BoxGeometry(0.86, 0.86, 0.86);
const headMat = new THREE.MeshBasicMaterial({ color: 0x2bccd9 });
const bodyMat = new THREE.MeshBasicMaterial({ color: 0x0d9cab });
const foodMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });

const foodMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), foodMat);
scene.add(foodMesh);

/** @type {THREE.Mesh[]} */
const segmentMeshes = [];

function syncSnakeMeshes() {
  while (segmentMeshes.length < snake.length) {
    const mesh = new THREE.Mesh(segGeo, bodyMat);
    scene.add(mesh);
    segmentMeshes.push(mesh);
  }
  while (segmentMeshes.length > snake.length) {
    scene.remove(segmentMeshes.pop());
  }
  snake.forEach((seg, i) => {
    const mesh = segmentMeshes[i];
    mesh.position.set(toWorld(seg.x), 0.5, toWorld(seg.z));
    mesh.material = i === 0 ? headMat : bodyMat;
  });
}

// ---------- Game state ----------
let snake, direction, pendingDirection, food, score, tickInterval, accumulator, lastTime, state;

function randomFoodCell() {
  let cell;
  do {
    cell = { x: Math.floor(Math.random() * GRID_SIZE), z: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some((s) => s.x === cell.x && s.z === cell.z));
  return cell;
}

function resetGame() {
  const start = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: start, z: start },
    { x: start - 1, z: start },
    { x: start - 2, z: start },
    { x: start - 3, z: start },
  ];
  direction = { x: 1, z: 0 };
  pendingDirection = direction;
  score = 0;
  tickInterval = TICK_BASE;
  accumulator = 0;
  food = randomFoodCell();
  state = "ready";

  scoreEl.textContent = "0";
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  syncSnakeMeshes();
  foodMesh.position.set(toWorld(food.x), 0.5, toWorld(food.z));
}

function wrap(v) {
  return (v + GRID_SIZE) % GRID_SIZE;
}

function tick() {
  direction = pendingDirection;
  const head = snake[0];
  const newHead = { x: wrap(head.x + direction.x), z: wrap(head.z + direction.z) };

  const hitSelf = snake.slice(0, -1).some((s) => s.x === newHead.x && s.z === newHead.z);
  if (hitSelf) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.z === food.z) {
    score += 1;
    scoreEl.textContent = String(score);
    tickInterval = Math.max(TICK_MIN, TICK_BASE - score * SPEEDUP_PER_FOOD);
    playEat();
    food = randomFoodCell();
    foodMesh.position.set(toWorld(food.x), 0.5, toWorld(food.z));
  } else {
    snake.pop();
  }

  syncSnakeMeshes();
}

function endGame() {
  state = "gameover";
  playGameOver();
  finalScoreEl.textContent = String(score);
  gameOverScreen.classList.remove("hidden");

  try {
    const best = Number(localStorage.getItem("snake3dneon-highscore") || 0);
    if (score > best) localStorage.setItem("snake3dneon-highscore", String(score));
  } catch (e) {}
  refreshHighscore();
}

function refreshHighscore() {
  try {
    highscoreEl.textContent = localStorage.getItem("snake3dneon-highscore") || "0";
  } catch (e) {
    highscoreEl.textContent = "0";
  }
}

// ---------- Audio ----------
let audioCtx;
function beep(freq, duration, type, gain) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}
const playEat = () => beep(880, 0.08, "square", 0.12);
const playGameOver = () => beep(140, 0.4, "sawtooth", 0.15);

// ---------- Input ----------
const KEY_DIRS = {
  ArrowUp: { x: 0, z: -1 }, w: { x: 0, z: -1 }, W: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 }, s: { x: 0, z: 1 }, S: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 }, a: { x: -1, z: 0 }, A: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 }, d: { x: 1, z: 0 }, D: { x: 1, z: 0 },
};

const PAUSE_KEYS = new Set(["p", "P", " "]);

function togglePause() {
  if (state === "playing") {
    state = "paused";
    pauseScreen.classList.remove("hidden");
  } else if (state === "paused") {
    state = "playing";
    pauseScreen.classList.add("hidden");
  }
}

function handleDirection(dir) {
  if (state !== "ready" && state !== "playing") return;

  const isReverse = dir.x === -direction.x && dir.z === -direction.z;
  if (!isReverse) pendingDirection = dir;

  if (state === "ready") {
    state = "playing";
    startScreen.classList.add("hidden");
    lastTime = performance.now();
    accumulator = 0;
  }
}

window.addEventListener("keydown", (e) => {
  if (PAUSE_KEYS.has(e.key) && (state === "playing" || state === "paused")) {
    e.preventDefault();
    togglePause();
    return;
  }

  const dir = KEY_DIRS[e.key];
  if (dir) handleDirection(dir);
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

pauseBtn.addEventListener("click", () => {
  togglePause();
});

// ---------- Swipe (mobile) ----------
const SWIPE_THRESHOLD = 24;
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

window.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

  const dir = Math.abs(dx) > Math.abs(dy)
    ? { x: dx > 0 ? 1 : -1, z: 0 }
    : { x: 0, z: dy > 0 ? 1 : -1 };
  handleDirection(dir);
}, { passive: true });

// ---------- Resize ----------
function onResize() {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

// ---------- Loop ----------
function animate(time) {
  requestAnimationFrame(animate);

  if (state === "playing") {
    if (!lastTime) lastTime = time;
    accumulator += time - lastTime;
    lastTime = time;
    while (accumulator >= tickInterval) {
      tick();
      accumulator -= tickInterval;
      if (state !== "playing") break;
    }
  } else {
    lastTime = time;
  }

  foodMesh.rotation.y += 0.03;
  foodMesh.scale.setScalar(1 + Math.sin(time * 0.004) * 0.12);

  composer.render();
}

refreshHighscore();
resetGame();
requestAnimationFrame(animate);
