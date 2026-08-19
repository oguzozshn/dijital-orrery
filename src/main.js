import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SCALE, COLORS } from './config.js';
import { createSun } from './scene/sun.js';
import { createCalendarRing } from './scene/calendarRing.js';
import { createStarfield } from './scene/starfield.js';
import { createEarthMoonArm } from './scene/earthMoonArm.js';
import { loadTextures } from './scene/textures.js';
import {
  earthEcliptic, moonEcliptic, earthRotationDeg, moonPhaseInfo, seasonName,
} from './astro/calculations.js';

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
camera.position.set(0, 26, 46);

// Fiziksel modeli elle cevirme hissi: yatay eksen serbest, dikey aci sinirli.
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 12;
controls.maxDistance = 140;
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
calendarRing.group.position.y = SCALE.ringY;
scene.add(calendarRing.group);

scene.add(new THREE.AmbientLight(0x2a3550, 0.55));
scene.add(new THREE.HemisphereLight(0x4a5f8a, 0x0a0d14, 0.35));

// --- Uygulama durumu -------------------------------------------------------
const state = {
  date: new Date(),
  /** Son hesaplanan astronomik degerler (bilgi paneli bunlari okur). */
  readout: null,
};

/** Sahne guncellendiginde tetiklenen dinleyiciler (UI bunlara abone olur). */
const listeners = new Set();
export function onUpdate(fn) { listeners.add(fn); return () => listeners.delete(fn); }

let earthMoonArm = null;

function applyDate(date) {
  state.date = date;

  const earth = earthEcliptic(date);
  const moon = moonEcliptic(date);
  const rotation = earthRotationDeg(date);
  const phase = moonPhaseInfo(date);

  calendarRing.setYear(date.getUTCFullYear());

  earthMoonArm?.update({
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
    month: calendarRing.monthAt(earth.longitude),
  };

  for (const fn of listeners) fn(state.readout);
}

export function setDate(date) { applyDate(date); }
export function getState() { return state; }

// --- Texture yuklendikten sonra Dunya + Ay ---------------------------------
const { textures, ready } = loadTextures();

ready
  .then(() => {
    earthMoonArm = createEarthMoonArm(textures);
    scene.add(earthMoonArm.group);
    applyDate(state.date);
    loading.classList.add('hidden');
  })
  .catch((err) => {
    console.error(err);
    loading.textContent = 'Texture yüklenemedi: ' + err.message;
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
function animate() {
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Gelistirme sirasinda konsoldan incelemek icin.
if (import.meta.env.DEV) {
  window.__orrery = {
    scene, camera, controls, renderer, sun, calendarRing, SCALE, state,
    setDate, get arm() { return earthMoonArm; },
  };
}
