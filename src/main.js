import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SCALE, COLORS } from './config.js';
import { createSun } from './scene/sun.js';
import { createCalendarRing } from './scene/calendarRing.js';
import { createStarfield } from './scene/starfield.js';

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
controls.minPolarAngle = 6 * (Math.PI / 180);   // neredeyse tepeden
controls.maxPolarAngle = 96 * (Math.PI / 180);  // yatayin biraz altina kadar
controls.rotateSpeed = 0.75;
controls.zoomSpeed = 0.8;

// --- Sahne icerigi ---------------------------------------------------------
const starfield = createStarfield();
starfield.setPixelRatio(pixelRatio);
scene.add(starfield.points);

const sun = createSun();
scene.add(sun.group);

const calendarRing = createCalendarRing(new Date().getUTCFullYear());
scene.add(calendarRing.group);

// Gunes'in ulasamadigi yuzeylerin tamamen siyah kalmamasi icin cok hafif
// ortam isigi; mekanik parcalarin okunmasini saglar.
scene.add(new THREE.AmbientLight(0x2a3550, 0.55));
scene.add(new THREE.HemisphereLight(0x4a5f8a, 0x0a0d14, 0.35));

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

// Ilk kare cizildikten sonra yukleme perdesini kaldir.
requestAnimationFrame(() => requestAnimationFrame(() => loading.classList.add('hidden')));

// Gelistirme sirasinda konsoldan incelemek icin.
if (import.meta.env.DEV) {
  window.__orrery = { scene, camera, controls, renderer, sun, calendarRing, SCALE };
}
