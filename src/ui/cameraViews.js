import * as THREE from 'three';
import { SCALE } from '../config.js';

/**
 * Hazir kamera acilari. Fiziksel modeli masaya koyup farkli yerlerden
 * bakmanin karsiligi: tepeden tum halkayi gormek, yandan duzlemi gormek,
 * ya da Dunyaya yaklasmak.
 */
export function createCameraViews({ camera, controls, getEarthPosition }) {
  const buttons = [...document.querySelectorAll('.view-buttons button')];

  const PRESETS = {
    top: () => ({
      position: new THREE.Vector3(0, 74, 0.001),
      target: new THREE.Vector3(0, 0, 0),
      minDistance: 12,
      follow: false,
    }),
    perspective: () => ({
      position: new THREE.Vector3(0, 26, 46),
      target: new THREE.Vector3(0, 0, 0),
      minDistance: 12,
      follow: false,
    }),
    side: () => ({
      position: new THREE.Vector3(0, 4.5, 62),
      target: new THREE.Vector3(0, 0, 0),
      minDistance: 12,
      follow: false,
    }),
    earth: () => {
      const earth = getEarthPosition();
      // Dunyanin biraz disindan ve ustunden bak; Gunes arkada kalsin.
      const outward = earth.clone().normalize();
      const position = earth.clone()
        .add(outward.multiplyScalar(SCALE.moonOrbit * 2.2))
        .add(new THREE.Vector3(0, SCALE.moonOrbit * 1.15, 0));
      return { position, target: earth.clone(), minDistance: 2, follow: true };
    },
  };

  const tween = {
    active: false,
    t: 0,
    duration: 0.9,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  };

  let following = false;
  const lastEarth = new THREE.Vector3();
  let activeKey = 'perspective';

  function apply(key) {
    const preset = PRESETS[key]?.();
    if (!preset) return;

    activeKey = key;
    for (const b of buttons) b.classList.toggle('is-active', b.dataset.view === key);

    controls.minDistance = preset.minDistance;
    following = preset.follow;
    if (following) lastEarth.copy(getEarthPosition());

    tween.fromPos.copy(camera.position);
    tween.toPos.copy(preset.position);
    tween.fromTarget.copy(controls.target);
    tween.toTarget.copy(preset.target);
    tween.t = 0;
    tween.active = true;
    controls.enabled = false;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => apply(button.dataset.view));
  }

  /** Kullanici kendi bakisini ayarlayinca "aktif on ayar" vurgusunu birak. */
  controls.addEventListener('start', () => {
    if (tween.active) return;
    for (const b of buttons) b.classList.remove('is-active');
    activeKey = null;
  });

  /** @param {number} dt saniye */
  function update(dt) {
    if (tween.active) {
      tween.t = Math.min(tween.t + dt / tween.duration, 1);
      const e = easeInOutCubic(tween.t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (tween.t >= 1) {
        tween.active = false;
        controls.enabled = true;
      }
      return;
    }

    // Dunya gorunumunde hedef, hareket eden Dunyayi takip etsin.
    if (following) {
      const earth = getEarthPosition();
      const delta = earth.clone().sub(lastEarth);
      if (delta.lengthSq() > 0) {
        camera.position.add(delta);
        controls.target.add(delta);
        lastEarth.copy(earth);
      }
    }
  }

  return { update, apply, get activeKey() { return activeKey; } };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
