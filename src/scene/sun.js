import * as THREE from 'three';
import { SCALE, COLORS } from '../config.js';

/**
 * Sahnenin merkezindeki Gunes: uzayda serbest duran, isik yayan bir kure.
 * Mekanik mil, taban ya da tasiyici yoktur -- cisimleri yerinde tutan tek
 * sey yorunge geometrisidir.
 */
export function createSun() {
  const group = new THREE.Group();
  group.name = 'sun-assembly';

  // --- Gunes kuresi --------------------------------------------------------
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.sunRadius, 64, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.sunCore, toneMapped: false }),
  );
  sunMesh.name = 'sun';
  group.add(sunMesh);

  // Yuzeyin hemen ustunde, sicak tonlu yari saydam katman.
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.sunRadius * 1.07, 48, 32),
    new THREE.MeshBasicMaterial({
      color: COLORS.sun, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  group.add(corona);

  // --- Isik hüzmesi --------------------------------------------------------
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: COLORS.sun,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    opacity: 0.5,
  }));
  glow.scale.setScalar(SCALE.sunRadius * 7);
  glow.renderOrder = -1;
  group.add(glow);

  // --- Isik kaynagi --------------------------------------------------------
  // Mesafeye gore sonumleme kapali (decay 0): stilize olcekte Dunya ve Ay'in
  // dogru sekilde aydinlanmasi icin.
  const light = new THREE.PointLight(0xfff2d8, 3.0, 0, 0);
  group.add(light);

  return { group, sunMesh, light, glow };
}

function createGlowTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,226,160,0.85)');
  g.addColorStop(0.35, 'rgba(255,163,60,0.28)');
  g.addColorStop(1.0, 'rgba(255,140,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
