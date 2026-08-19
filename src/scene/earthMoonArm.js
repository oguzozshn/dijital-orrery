import * as THREE from 'three';
import { SCALE, COLORS, DEG, OBLIQUITY_DEG, eclipticDirection, eclipticVectorToScene } from '../config.js';
import { createEarthMaterial, createMoonMaterial } from './earthMaterial.js';

/**
 * Gunesten disa uzanan mekanik kol ve ucundaki Dunya + Ay alt sistemi.
 *
 * Onemli tasarim karari: Dunya sistemi kolun COCUGU DEGILDIR. Dunyanin
 * eksen egikligi uzayda sabit yonlu olmalidir (her zaman ayni yildiza bakar);
 * kolun cocugu olsaydi eksen kolla birlikte donerdi ve mevsimler kaybolurdu.
 * Ikisi de ayni ekliptik boylamdan surulur, bu yuzden gorsel olarak birlikte
 * hareket ederler.
 */
export function createEarthMoonArm(textures) {
  const group = new THREE.Group();
  group.name = 'earth-moon-arm';

  const armGroup = buildArm();
  group.add(armGroup);

  // --- Dunya sistemi (dunya cercevesinde sabit yonlu) ----------------------
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

  // Donme eksenini gosteren ince cubuk (mekanik model hissi).
  const axisRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, SCALE.earthRadius * 3.1, 12),
    new THREE.MeshBasicMaterial({ color: COLORS.accentSoft, transparent: true, opacity: 0.65, toneMapped: false }),
  );
  earthTilt.add(axisRod);

  // Ekvator halkasi -- eksen egikligini gozle gormeyi kolaylastirir.
  const equator = new THREE.Mesh(
    new THREE.TorusGeometry(SCALE.earthRadius * 1.02, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.45, toneMapped: false }),
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

  // Ayin yorunge halkasi (ekliptik duzleminde; Ayin ~5.1 derecelik egimi
  // sayesinde Ay bu halkanin bazen ustunde bazen altinda kalir).
  const moonRing = new THREE.Mesh(
    new THREE.TorusGeometry(SCALE.moonOrbit, 0.022, 8, 128),
    new THREE.MeshBasicMaterial({ color: COLORS.orbitLine, transparent: true, opacity: 0.5, toneMapped: false }),
  );
  moonRing.rotation.x = Math.PI / 2;
  earthSystem.add(moonRing);

  // Ayi Dunyaya baglayan ince kol (mekanik model hissi).
  const moonArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1, 8),
    new THREE.MeshBasicMaterial({ color: 0x6d7c92, transparent: true, opacity: 0.7, toneMapped: false }),
  );
  moonArm.geometry.translate(0, 0.5, 0); // taban orijinde olsun
  earthSystem.add(moonArm);

  // --- Guncelleme ----------------------------------------------------------
  const earthPos = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const tmp = { x: 0, y: 0, z: 0 };

  /**
   * @param {object} state
   * @param {number} state.earthLongitude   Dunyanin ekliptik boylami (derece)
   * @param {number} state.earthRotationDeg Greenwich yildiz zamani (derece)
   * @param {{x:number,y:number,z:number}} state.moonVec Ayin Dunya merkezli ekliptik vektoru (AU)
   * @param {number} state.moonDistanceRatio Ortalama uzakliga oran
   */
  function update(state) {
    const { earthLongitude, earthRotationDeg, moonVec, moonDistanceRatio } = state;

    // Kolun acisi: Y ekseni etrafinda donus, ekliptik boylami dogrudan verir.
    armGroup.rotation.y = earthLongitude * DEG;

    eclipticDirection(earthLongitude, SCALE.orbitRadius, tmp);
    earthPos.set(tmp.x, tmp.y, tmp.z);
    earthSystem.position.copy(earthPos);

    // Dunyanin kendi ekseni etrafindaki donusu.
    earthMesh.rotation.y = earthRotationDeg * DEG;

    // Ay: gercek yonu koru, uzakligi stilize et.
    eclipticVectorToScene(moonVec, 1, tmp);
    moonDir.set(tmp.x, tmp.y, tmp.z).normalize();
    const moonRadius = SCALE.moonOrbit * THREE.MathUtils.clamp(moonDistanceRatio, 0.93, 1.07);
    moonMesh.position.copy(moonDir).multiplyScalar(moonRadius);

    // Ay her zaman ayni yuzunu Dunyaya doner (kilitli donus).
    // Kure UV haritasinda u=0.5 yerel +X yonune bakar; +X gobege cevrilir.
    moonMesh.rotation.y = Math.atan2(moonMesh.position.z, -moonMesh.position.x);

    // Ay kolunu Dunyadan Aya uzat.
    moonArm.scale.y = moonRadius;
    moonArm.quaternion.setFromUnitVectors(UP, moonDir);
  }

  return { group, update, earthSystem, earthMesh, moonMesh, armGroup };
}

const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------

function buildArm() {
  const g = new THREE.Group();
  g.name = 'arm';

  const metal = new THREE.MeshStandardMaterial({
    color: COLORS.metal, metalness: 0.8, roughness: 0.38,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: COLORS.accent, metalness: 0.5, roughness: 0.42,
    emissive: new THREE.Color(COLORS.accent).multiplyScalar(0.1),
  });

  const BEAM_Y = -1.9;

  // Merkezdeki donen gobek (mil uzerinde).
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.85, 32), metal);
  hub.position.y = BEAM_Y;
  g.add(hub);

  const hubRim = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.1, 10, 40), accent);
  hubRim.rotation.x = Math.PI / 2;
  hubRim.position.y = BEAM_Y;
  g.add(hubRim);

  // Gobekten disa uzanan ana kiris (+X yonunde).
  const innerR = 1.2;
  const outerR = SCALE.orbitRadius;
  const beamLength = outerR - innerR;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(beamLength, 0.3, SCALE.armWidth), metal);
  beam.position.set(innerR + beamLength / 2, BEAM_Y, 0);
  g.add(beam);

  // Kirisi hafifleten delikler (LEGO Technic kiris hissi).
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x11151b, metalness: 0.4, roughness: 0.8 });
  const holeGeom = new THREE.CylinderGeometry(0.11, 0.11, SCALE.armWidth + 0.06, 12);
  holeGeom.rotateX(Math.PI / 2);
  for (let x = innerR + 1.4; x < outerR - 1.2; x += 1.6) {
    const hole = new THREE.Mesh(holeGeom, holeMat);
    hole.position.set(x, BEAM_Y, 0);
    g.add(hole);
  }

  // Kolun ucundaki dikey tasiyici: Dunyayi ekliptik duzlemine (y=0) yukseltir.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, Math.abs(BEAM_Y) + 0.2, 16), metal);
  post.position.set(outerR, BEAM_Y / 2, 0);
  g.add(post);

  // Takvim halkasina inen gosterge ignesi -- hangi ayda oldugumuzu okutur.
  const needleTop = BEAM_Y;
  const needleBottom = SCALE.ringY + 1.1;
  const needleLength = needleTop - needleBottom;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, needleLength, 10), accent);
  needle.position.set(outerR, (needleTop + needleBottom) / 2, 0);
  g.add(needle);

  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 14), accent);
  pointer.rotation.x = Math.PI; // ucu asagi baksin
  pointer.position.set(outerR, SCALE.ringY + 0.72, 0);
  g.add(pointer);

  return g;
}
