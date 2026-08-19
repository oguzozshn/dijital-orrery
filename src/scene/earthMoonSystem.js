import * as THREE from 'three';
import { SCALE, COLORS, DEG, OBLIQUITY_DEG, eclipticDirection, eclipticVectorToScene } from '../config.js';
import { createEarthMaterial, createMoonMaterial } from './earthMaterial.js';

/**
 * Dunya ve Ay: uzayda serbest duran cisimler.
 *
 * Hicbir mekanik kol, mil ya da baglanti yoktur; her cismi yerinde tutan tek
 * sey efemeristen gelen konumudur. Gorulen tek cizgi Ay'in yorunge izidir,
 * o da fiziksel bir parca degil, ince bir yorunge isaretidir.
 *
 * Onemli tasarim karari: Dunya'nin eksen egikligi UZAYDA SABIT YONLUDUR
 * (her zaman ayni noktaya bakar). Egiklik grubu yorunge konumundan bagimsiz
 * tutulur; konumla birlikte donseydi mevsimler kaybolurdu.
 */
export function createEarthMoonSystem(textures) {
  const group = new THREE.Group();
  group.name = 'earth-moon-system';

  // --- Dunya'nin yorunge izi ----------------------------------------------
  // Kol kaldirildigi icin hareketi okunabilir kilan ince bir daire.
  const orbitPath = new THREE.Mesh(
    ringGeometry(SCALE.orbitRadius - 0.035, SCALE.orbitRadius + 0.035, 512),
    new THREE.MeshBasicMaterial({
      color: COLORS.orbitLine, transparent: true, opacity: 0.42, toneMapped: false,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  orbitPath.name = 'earth-orbit-path';
  group.add(orbitPath);

  // --- Dunya sistemi -------------------------------------------------------
  const earthSystem = new THREE.Group();
  earthSystem.name = 'earth-system';
  group.add(earthSystem);

  // Eksen egikligi: kutup, ekliptik boylam 90 derece yonune dogru egilir.
  // -X ekseni etrafinda egim, +Y eksenini (0, cos e, -sin e) yonune tasir.
  const earthTilt = new THREE.Group();
  earthTilt.rotation.x = -OBLIQUITY_DEG * DEG;
  earthSystem.add(earthTilt);

  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.earthRadius, 96, 64),
    createEarthMaterial({
      dayMap: textures.earthDay,
      nightMap: textures.earthNight,
      specularMap: textures.earthSpecular,
      normalMap: textures.earthNormal,
    }),
  );
  earthMesh.name = 'earth';
  earthTilt.add(earthMesh);

  // Donme ekseni ve ekvator: fiziksel parca degil, ince birer isaret.
  // Eksen egikligini gozle gorunur kilarlar.
  const axisHint = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, SCALE.earthRadius * 2.9, 8),
    new THREE.MeshBasicMaterial({
      color: COLORS.accentSoft, transparent: true, opacity: 0.4, toneMapped: false,
      depthWrite: false,
    }),
  );
  axisHint.name = 'earth-axis-hint';
  earthTilt.add(axisHint);

  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(SCALE.earthRadius * 1.015, 0.009, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0x9fd0ff, transparent: true, opacity: 0.32, toneMapped: false,
      depthWrite: false,
    }),
  );
  equator.rotation.x = Math.PI / 2;
  earthTilt.add(equator);

  // --- Ay ------------------------------------------------------------------
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SCALE.moonRadius, 48, 32),
    createMoonMaterial({ map: textures.moon }),
  );
  moonMesh.name = 'moon';
  earthSystem.add(moonMesh);

  // Ay'in yorunge izi. Ekliptik duzlemde durur; Ay'in ~5.1 derecelik yorunge
  // egimi sayesinde Ay bu izin bazen ustunde bazen altinda kalir.
  const moonPath = new THREE.Mesh(
    new THREE.TorusGeometry(SCALE.moonOrbit, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({
      color: COLORS.orbitLine, transparent: true, opacity: 0.34, toneMapped: false,
      depthWrite: false,
    }),
  );
  moonPath.rotation.x = Math.PI / 2;
  earthSystem.add(moonPath);

  // --- Guncelleme ----------------------------------------------------------
  const moonDir = new THREE.Vector3();
  const tmp = { x: 0, y: 0, z: 0 };

  /**
   * @param {object} state
   * @param {number} state.earthLongitude    Dunya'nin ekliptik boylami (derece)
   * @param {number} state.earthRotationDeg  Greenwich yildiz zamani (derece)
   * @param {{x:number,y:number,z:number}} state.moonVec Ay'in Dunya merkezli ekliptik vektoru
   * @param {number} state.moonDistanceRatio Ortalama uzakliga oran
   */
  function update(state) {
    const { earthLongitude, earthRotationDeg, moonVec, moonDistanceRatio } = state;

    eclipticDirection(earthLongitude, SCALE.orbitRadius, tmp);
    earthSystem.position.set(tmp.x, tmp.y, tmp.z);

    // Dunya'nin kendi ekseni etrafindaki donusu.
    earthMesh.rotation.y = earthRotationDeg * DEG;

    // Ay: gercek yonu koru, uzakligi stilize et.
    eclipticVectorToScene(moonVec, 1, tmp);
    moonDir.set(tmp.x, tmp.y, tmp.z).normalize();
    const moonRadius = SCALE.moonOrbit * THREE.MathUtils.clamp(moonDistanceRatio, 0.93, 1.07);
    moonMesh.position.copy(moonDir).multiplyScalar(moonRadius);

    // Ay her zaman ayni yuzunu Dunya'ya doner (kilitli donus).
    // Kure UV haritasinda u=0.5 yerel +X yonune bakar; +X'i Dunya'ya cevir.
    moonMesh.rotation.y = Math.atan2(moonMesh.position.z, -moonMesh.position.x);
  }

  return { group, update, earthSystem, earthMesh, moonMesh, orbitPath };
}

/** XZ duzleminde yatay halka geometrisi. */
function ringGeometry(inner, outer, segments) {
  const geom = new THREE.RingGeometry(inner, outer, segments);
  geom.rotateX(-Math.PI / 2);
  return geom;
}
