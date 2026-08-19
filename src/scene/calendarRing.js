import * as THREE from 'three';
import { SCALE, COLORS, MONTHS_TR, DEG, eclipticDirection } from '../config.js';
import { monthRingAngles, seasonMarkers } from '../astro/calculations.js';
import { createTextSprite } from './textSprite.js';

/**
 * Tabandaki takvim halkasi: referans LEGO modeldeki "Dec / Jan / Feb ..."
 * etiketli halkanin dijital karsiligi.
 *
 * Ay dilimlerinin acilari, o yilin her ayinin 1'inde Dunya'nin GERCEK
 * ekliptik boylamindan turetilir. Bu yuzden dilimler tam 30 derece degildir:
 * Dunya, gunberi (ocak basi) civarinda daha hizli hareket ettigi icin kis
 * aylarinin dilimleri birkac derece genistir.
 */

const TOP_Y = SCALE.ringThickness / 2;

export function createCalendarRing(initialYear) {
  const group = new THREE.Group();
  group.name = 'calendar-ring';

  const staticParts = buildStaticRing();
  group.add(staticParts);

  // Yila gore degisen kisimlar (ay dilimleri, etiketler, mevsim isaretleri).
  let dynamic = new THREE.Group();
  group.add(dynamic);

  let year = null;
  let monthAngles = [];

  function setYear(nextYear) {
    if (nextYear === year) return monthAngles;
    year = nextYear;
    monthAngles = monthRingAngles(year);

    disposeGroup(dynamic);
    group.remove(dynamic);
    dynamic = new THREE.Group();
    dynamic.add(buildMonthSectors(monthAngles));
    dynamic.add(buildMonthLabels(monthAngles));
    dynamic.add(buildSeasonMarkers(year));
    group.add(dynamic);
    return monthAngles;
  }

  setYear(initialYear);

  return {
    group,
    setYear,
    get year() { return year; },
    get monthAngles() { return monthAngles; },
    /** Verilen ekliptik boylamin hangi ay dilimine dustugu. */
    monthAt(longitude) {
      for (const m of monthAngles) {
        const delta = ((longitude - m.startLongitude) % 360 + 360) % 360;
        if (delta < m.span) return m;
      }
      return monthAngles[0];
    },
    dispose() {
      disposeGroup(staticParts);
      disposeGroup(dynamic);
    },
  };
}

// ---------------------------------------------------------------------------

function buildStaticRing() {
  const g = new THREE.Group();
  const t = SCALE.ringThickness;

  const faceMat = new THREE.MeshStandardMaterial({
    color: COLORS.ringFace, metalness: 0.55, roughness: 0.6,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.metalDark, metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide,
  });

  // Alt yuz
  const bottom = flatRing(SCALE.ringInner, SCALE.ringOuter, faceMat);
  bottom.position.y = -t / 2;
  bottom.rotation.x = Math.PI; // asagi baksin
  g.add(bottom);

  // Ust yuz (ay dilimleri bunun uzerine cizilir)
  const top = flatRing(SCALE.ringInner, SCALE.ringOuter, faceMat);
  top.position.y = t / 2;
  g.add(top);

  // Dis ve ic duvarlar
  for (const [radius, mat] of [[SCALE.ringOuter, wallMat], [SCALE.ringInner, wallMat]]) {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, t, 160, 1, true), mat,
    );
    g.add(wall);
  }

  // Dis kenardaki turuncu vurgu seridi (referans modeldeki turuncu halka).
  const accentBand = new THREE.Mesh(
    new THREE.CylinderGeometry(SCALE.ringOuter + 0.02, SCALE.ringOuter + 0.02, t * 0.34, 160, 1, true),
    new THREE.MeshStandardMaterial({
      color: COLORS.accent, metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide,
      emissive: new THREE.Color(COLORS.accent).multiplyScalar(0.12),
    }),
  );
  g.add(accentBand);

  // 10 derecelik ince taksimat cizgileri.
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x7d8898, toneMapped: false });
  const tickGeom = new THREE.PlaneGeometry(0.9, 0.06);
  tickGeom.rotateX(-Math.PI / 2);
  for (let deg = 0; deg < 360; deg += 10) {
    const tick = new THREE.Mesh(tickGeom, tickMat);
    const p = eclipticDirection(deg, SCALE.ringOuter - 0.75);
    tick.position.set(p.x, TOP_Y + 0.004, p.z);
    tick.rotation.y = deg * DEG;
    g.add(tick);
  }

  // Yorunge kilavuz cizgisi (Dunya'nin gectigi yaricap).
  const orbitLine = new THREE.Mesh(
    flatRingGeometry(SCALE.orbitRadius - 0.05, SCALE.orbitRadius + 0.05, 256),
    new THREE.MeshBasicMaterial({
      color: COLORS.orbitLine, transparent: true, opacity: 0.75, toneMapped: false,
    }),
  );
  orbitLine.position.y = TOP_Y + 0.006;
  g.add(orbitLine);

  return g;
}

function buildMonthSectors(monthAngles) {
  const g = new THREE.Group();
  const inner = SCALE.ringInner + 0.35;
  const outer = SCALE.ringOuter - 1.35;

  const matA = new THREE.MeshStandardMaterial({ color: 0x353d47, metalness: 0.4, roughness: 0.7 });
  const matB = new THREE.MeshStandardMaterial({ color: COLORS.ringGroove, metalness: 0.4, roughness: 0.7 });

  for (const m of monthAngles) {
    const geom = flatRingGeometry(inner, outer, 64, m.startLongitude * DEG, m.span * DEG);
    const mesh = new THREE.Mesh(geom, m.month % 2 === 0 ? matA : matB);
    mesh.position.y = TOP_Y + 0.002;
    g.add(mesh);

    // Ay siniri cizgisi
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(SCALE.ringOuter - SCALE.ringInner - 0.5, 0.02, 0.09),
      new THREE.MeshBasicMaterial({ color: 0x93a2b6, toneMapped: false }),
    );
    const mid = (SCALE.ringInner + SCALE.ringOuter) / 2;
    const p = eclipticDirection(m.startLongitude, mid);
    border.position.set(p.x, TOP_Y + 0.012, p.z);
    border.rotation.y = m.startLongitude * DEG;
    g.add(border);
  }
  return g;
}

function buildMonthLabels(monthAngles) {
  const g = new THREE.Group();
  for (const m of monthAngles) {
    const sprite = createTextSprite(MONTHS_TR[m.month], {
      color: '#dce6f7', fontSize: 88, worldHeight: 1.9,
    });
    const p = eclipticDirection(m.midLongitude, SCALE.labelRadius);
    sprite.position.set(p.x, TOP_Y + 0.9, p.z);
    g.add(sprite);
  }
  return g;
}

function buildSeasonMarkers(year) {
  const g = new THREE.Group();
  const markers = seasonMarkers(year);
  const markerMat = new THREE.MeshBasicMaterial({ color: COLORS.accentSoft, toneMapped: false });

  for (const marker of markers) {
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 12), markerMat);
    const p = eclipticDirection(marker.longitude, SCALE.ringOuter - 0.75);
    pin.position.set(p.x, TOP_Y + 0.45, p.z);
    g.add(pin);

    const label = createTextSprite(marker.label, {
      color: '#ffc48a', fontSize: 64, worldHeight: 1.15, bold: false,
    });
    const lp = eclipticDirection(marker.longitude, SCALE.ringInner - 1.6);
    label.position.set(lp.x, TOP_Y + 0.7, lp.z);
    g.add(label);
  }
  return g;
}

// ---------------------------------------------------------------------------

/** XZ duzleminde yatay halka geometrisi (aci = ekliptik boylam). */
function flatRingGeometry(inner, outer, segments = 160, thetaStart = 0, thetaLength = Math.PI * 2) {
  const geom = new THREE.RingGeometry(inner, outer, segments, 1, thetaStart, thetaLength);
  // RingGeometry XY duzlemindedir; -90 derece X donusu onu XZ duzlemine tasir
  // ve aci parametresi dogrudan ekliptik boylama karsilik gelir.
  geom.rotateX(-Math.PI / 2);
  return geom;
}

function flatRing(inner, outer, material) {
  return new THREE.Mesh(flatRingGeometry(inner, outer), material);
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.userData.dispose) obj.userData.dispose();
    obj.geometry?.dispose?.();
  });
}
