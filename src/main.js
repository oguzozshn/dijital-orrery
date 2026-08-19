import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SCALE, COLORS } from './config.js';
import { createSun } from './scene/sun.js';
import { createCalendarRing } from './scene/calendarRing.js';
import { createStarfield } from './scene/starfield.js';
import { createEarthMoonSystem } from './scene/earthMoonSystem.js';
import { loadTextures } from './scene/textures.js';
import {
  earthEcliptic, moonEcliptic, earthRotationDeg, moonPhaseInfo, seasonName,
} from './astro/calculations.js';
import { createTimeControls } from './ui/timeControls.js';
import { createInfoPanel } from './ui/infoPanel.js';
import { createCameraViews } from './ui/cameraViews.js';

const canvas = document.getElementById('scene');
const loading = document.getElementById('loading');

// --- Renderer --------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.background);

// --- Kamera ----------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
camera.position.set(0, 32, 56);

// Fiziksel modeli elle cevirme hissi: yatay eksen serbest, dikey aci sinirli.
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 190;
controls.minPolarAngle = 6 * (Math.PI / 180);
controls.maxPolarAngle = 96 * (Math.PI / 180);
controls.rotateSpeed = 0.75;
controls.zoomSpeed = 0.8;

// --- Sabit sahne icerigi ---------------------------------------------------
const starfield = createStarfield();
starfield.setPixelRatio(pixelRatio);
scene.add(starfield.points);

const sun = createSun();
scene.add(sun.group);

const calendarRing = createCalendarRing(new Date().getUTCFullYear());
scene.add(calendarRing.group);

// Gunesin ulasamadigi mekanik yuzeylerin tamamen siyah kalmamasi icin.
scene.add(new THREE.AmbientLight(0x2a3550, 0.55));
scene.add(new THREE.HemisphereLight(0x4a5f8a, 0x0a0d14, 0.35));

// --- Paylasilabilir baglanti ----------------------------------------------
let urlTimer = 0;
function scheduleUrlSync(date) {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', date.toISOString().slice(0, 19) + 'Z');
    history.replaceState(null, '', url);
  }, 400);
}

function readDateFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('t');
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// --- Uygulama durumu -------------------------------------------------------
const state = {
  date: readDateFromUrl() ?? new Date(),
  readout: null,
};

let earthMoonSystem = null;
let infoPanel = null;
let timeControls = null;
let cameraViews = null;

function applyDate(date) {
  state.date = date;

  const earth = earthEcliptic(date);
  const moon = moonEcliptic(date);
  const rotation = earthRotationDeg(date);
  const phase = moonPhaseInfo(date);

  calendarRing.setYear(date.getUTCFullYear());
  const month = calendarRing.setLongitude(earth.longitude);

  earthMoonSystem?.update({
    earthLongitude: earth.longitude,
    earthRotationDeg: rotation,
    moonVec: moon.vec,
    moonDistanceRatio: moon.distanceRatio,
  });

  state.readout = {
    date,
    earth,
    moon,
    rotation,
    phase,
    season: seasonName(date),
    month,
  };

  infoPanel?.update(state.readout);
  timeControls?.sync(date);
  scheduleUrlSync(date);
}

// --- Arayuz ----------------------------------------------------------------
infoPanel = createInfoPanel();
timeControls = createTimeControls({
  getDate: () => state.date,
  setDate: applyDate,
});

const earthWorldPos = new THREE.Vector3();
cameraViews = createCameraViews({
  camera,
  controls,
  getEarthPosition: () => {
    if (earthMoonSystem) earthMoonSystem.earthSystem.getWorldPosition(earthWorldPos);
    return earthWorldPos;
  },
});

applyDate(state.date);

// --- Texture yuklendikten sonra Dunya + Ay ---------------------------------
const { textures, ready } = loadTextures();

ready
  .then(() => {
    earthMoonSystem = createEarthMoonSystem(textures);
    scene.add(earthMoonSystem.group);
    applyDate(state.date);
    loading.classList.add('hidden');
  })
  .catch((err) => {
    console.error(err);
    loading.innerHTML = `<span style="border:0"></span>Texture yüklenemedi: ${err.message}`;
  });

// --- Boyutlandirma ---------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// --- Dongu -----------------------------------------------------------------
let lastFrame = performance.now();

function animate(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  timeControls.tick(dt);
  cameraViews.update(dt);
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Gelistirme sirasinda konsoldan incelemek icin.
if (import.meta.env.DEV) {
  window.__orrery = {
    scene, camera, controls, renderer, sun, calendarRing, SCALE, state,
    setDate: applyDate, cameraViews,
    get bodies() { return earthMoonSystem; },
  };
}
