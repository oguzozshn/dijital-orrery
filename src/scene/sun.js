import * as THREE from 'three';
import { SCALE, COLORS } from '../config.js';

/**
 * Sahnenin merkezi: dikey mil uzerinde duran, isik yayan Gunes.
 * Referans LEGO modeldeki gibi mil tabandan yukari dogru gecer.
 */
export function createSun() {
  const group = new THREE.Group();
  group.name = 'sun-assembly';

  // --- Dikey mil -----------------------------------------------------------
  const shaftHeight = SCALE.shaftTop - SCALE.shaftBottom;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(SCALE.shaftRadius, SCALE.shaftRadius, shaftHeight, 24),
    new THREE.MeshStandardMaterial({
      color: COLORS.metal, metalness: 0.85, roughness: 0.35,
    }),
  );
  shaft.position.y = (SCALE.shaftTop + SCALE.shaftBottom) / 2;
  group.add(shaft);

  // Mil uzerindeki teknik detay halkalari.
  const collarMat = new THREE.MeshStandardMaterial({
    color: COLORS.accent, metalness: 0.6, roughness: 0.4,
  });
  for (const y of [SCALE.shaftTop - 0.5, SCALE.shaftBottom + 0.5, SCALE.sunRadius + 0.9, -SCALE.sunRadius - 0.9]) {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(SCALE.shaftRadius * 1.7, SCALE.shaftRadius * 1.7, 0.28, 24),
      collarMat,
    );
    collar.position.y = y;
    group.add(collar);
  }

  // --- Taban gobegi --------------------------------------------------------
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(SCALE.baseHubRadius, SCALE.baseHubRadius * 1.1, 0.7, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.metalDark, metalness: 0.7, roughness: 0.55 }),
  );
  hub.position.y = SCALE.shaftBottom + 0.35;
  group.add(hub);

  // --- Gunes kuresi --------------------------------------------------------
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.sunRadius, 64, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.sunCore, toneMapped: false }),
  );
  sunMesh.name = 'sun';
  group.add(sunMesh);

  // Yuzey dalgalanmasi hissi veren yari saydam dis katman.
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.sunRadius * 1.06, 48, 32),
    new THREE.MeshBasicMaterial({
      color: COLORS.sun, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  group.add(corona);

  // --- Isik hüzmesi (sprite) ----------------------------------------------
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: COLORS.sun,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    opacity: 0.55,
  }));
  glow.scale.setScalar(SCALE.sunRadius * 7);
  glow.renderOrder = -1;
  group.add(glow);

  // --- Isik kaynagi --------------------------------------------------------
  // Mesafeye gore sonumleme kapali (decay 0): stilize olcekte Dunya ve Ay'in
  // esit ve tam aydinlanmasi icin.
  const light = new THREE.PointLight(0xfff2d8, 3.2, 0, 0);
  light.castShadow = false;
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
