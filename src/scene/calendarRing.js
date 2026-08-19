import * as THREE from 'three';
import { SCALE, COLORS, MONTHS_TR, DEG, eclipticDirection } from '../config.js';
import { monthRingAngles, seasonMarkers } from '../astro/calculations.js';
import { createTextSprite } from './textSprite.js';

/**
 * Takvim halkasi: ekliptik duzlemde, Dunya'nin yorungesinin DISINDA yuzen
 * ince bir kadran. Referans modeldeki "Dec / Jan / Feb ..." halkasinin
 * karsiligi, ama bir taban ya da tasiyici degil -- sahnede hicbir seye
 * degmez, sadece yorunge acisini okutur.
 *
 * Ay dilimlerinin acilari, o yilin her ayinin 1'inde Dunya'nin GERCEK
 * ekliptik boylamindan turetilir. Bu yuzden dilimler tam 30 derece degildir:
 * Dunya gunberide (ocak basi) daha hizli hareket ettigi icin kis aylarinin
 * dilimleri birkac derece genistir.
 */

const TOP_Y = SCALE.ringThickness / 2;
const BAND_INNER = SCALE.ringInner + 0.3;
const BAND_OUTER = SCALE.ringOuter - 1.1;

export function createCalendarRing(initialYear) {
  const group = new THREE.Group();
  group.name = 'calendar-ring';

  const staticParts = buildStaticRing();
  group.add(staticParts);

  let dynamic = new THREE.Group();
  group.add(dynamic);

  // Kolun yerini alan gosterge: halkanin ic kenarinda, Dunya'nin bulundugu
  // boylamda duran kucuk isikli isaret. Fiziksel bir baglanti degil.
  const pointer = buildPointer();
  group.add(pointer.group);

  // Icinde bulunulan ay diliminin vurgusu.
  const highlight = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: COLORS.accent, transparent: true, opacity: 0.22,
      toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  highlight.position.y = TOP_Y + 0.006;
  highlight.renderOrder = 2;
  group.add(highlight);

  let year = null;
  let monthAngles = [];
  let highlightedMonth = -1;

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

    highlightedMonth = -1; // yeni dilim acilarina gore yeniden cizilsin
    return monthAngles;
  }

  function monthAt(longitude) {
    for (const m of monthAngles) {
      const delta = ((longitude - m.startLongitude) % 360 + 360) % 360;
      if (delta < m.span) return m;
    }
    return monthAngles[0];
  }

  /** Gostergeyi ve ay vurgusunu Dunya'nin boylamina tasir. */
  function setLongitude(longitude) {
    pointer.setLongitude(longitude);

    const month = monthAt(longitude);
    if (month.month !== highlightedMonth) {
      highlightedMonth = month.month;
      highlight.geometry.dispose();
      highlight.geometry = flatRingGeometry(
        BAND_INNER, BAND_OUTER, 64, month.startLongitude * DEG, month.span * DEG,
      );
    }
    return month;
  }

  setYear(initialYear);

  return {
    group,
    setYear,
    setLongitude,
    monthAt,
    get year() { return year; },
    get monthAngles() { return monthAngles; },
    dispose() {
      disposeGroup(staticParts);
      disposeGroup(dynamic);
      disposeGroup(pointer.group);
      highlight.geometry.dispose();
      highlight.material.dispose();
    },
  };
}

// ---------------------------------------------------------------------------

function buildStaticRing() {
  const g = new THREE.Group();
  const t = SCALE.ringThickness;

  const faceMat = new THREE.MeshStandardMaterial({
    color: COLORS.ringFace, metalness: 0.3, roughness: 0.75,
    transparent: true, opacity: 0.88,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.metalDark, metalness: 0.4, roughness: 0.65, side: THREE.DoubleSide,
  });

  const bottom = new THREE.Mesh(flatRingGeometry(SCALE.ringInner, SCALE.ringOuter), faceMat);
  bottom.position.y = -t / 2;
  bottom.rotation.x = Math.PI;
  g.add(bottom);

  const top = new THREE.Mesh(flatRingGeometry(SCALE.ringInner, SCALE.ringOuter), faceMat);
  top.position.y = t / 2;
  g.add(top);

  for (const radius of [SCALE.ringOuter, SCALE.ringInner]) {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, t, 200, 1, true), wallMat));
  }

  // Dis kenardaki turuncu vurgu seridi.
  const accentBand = new THREE.Mesh(
    new THREE.CylinderGeometry(SCALE.ringOuter + 0.015, SCALE.ringOuter + 0.015, t * 0.5, 200, 1, true),
    new THREE.MeshStandardMaterial({
      color: COLORS.accent, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide,
      emissive: new THREE.Color(COLORS.accent).multiplyScalar(0.18),
    }),
  );
  g.add(accentBand);

  // 10 derecelik taksimat.
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x7d8898, toneMapped: false, transparent: true, opacity: 0.7,
  });
  const tickGeom = new THREE.PlaneGeometry(0.75, 0.05);
  tickGeom.rotateX(-Math.PI / 2);
  for (let deg = 0; deg < 360; deg += 10) {
    const tick = new THREE.Mesh(tickGeom, tickMat);
    const p = eclipticDirection(deg, SCALE.ringOuter - 0.62);
    tick.position.set(p.x, TOP_Y + 0.004, p.z);
    tick.rotation.y = deg * DEG;
    g.add(tick);
  }

  return g;
}

/** Halkanin ic kenarinda duran, Dunya'nin boylamini gosteren isaret. */
function buildPointer() {
  const group = new THREE.Group();

  const mat = new THREE.MeshBasicMaterial({ color: COLORS.accent, toneMapped: false });

  // Ice dogru bakan ucgen.
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.0, 3), mat);
  head.rotation.x = -Math.PI / 2;   // ucu -Z yonune
  head.rotation.y = Math.PI / 2;    // ...oradan ice dogru cevir
  head.position.set(SCALE.ringInner - 0.62, TOP_Y, 0);
  group.add(head);

  // Yumusak parlama, gostergenin gozden kacmamasi icin.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dotTexture(),
    color: COLORS.accentSoft,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.55,
  }));
  glow.scale.setScalar(2.6);
  glow.position.set(SCALE.ringInner - 0.62, TOP_Y, 0);
  group.add(glow);

  return {
    group,
    setLongitude(longitude) { group.rotation.y = longitude * DEG; },
  };
}

function buildMonthSectors(monthAngles) {
  const g = new THREE.Group();

  const matA = new THREE.MeshStandardMaterial({
    color: 0x323a45, metalness: 0.2, roughness: 0.85, transparent: true, opacity: 0.9,
  });
  const matB = new THREE.MeshStandardMaterial({
    color: COLORS.ringGroove, metalness: 0.2, roughness: 0.85, transparent: true, opacity: 0.9,
  });

  for (const m of monthAngles) {
    const geom = flatRingGeometry(BAND_INNER, BAND_OUTER, 64, m.startLongitude * DEG, m.span * DEG);
    const mesh = new THREE.Mesh(geom, m.month % 2 === 0 ? matA : matB);
    mesh.position.y = TOP_Y + 0.002;
    g.add(mesh);

    // Ay siniri cizgisi
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(SCALE.ringOuter - SCALE.ringInner - 0.4, 0.015, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x93a2b6, toneMapped: false }),
    );
    const mid = (SCALE.ringInner + SCALE.ringOuter) / 2;
    const p = eclipticDirection(m.startLongitude, mid);
    border.position.set(p.x, TOP_Y + 0.01, p.z);
    border.rotation.y = m.startLongitude * DEG;
    g.add(border);
  }
  return g;
}

function buildMonthLabels(monthAngles) {
  const g = new THREE.Group();
  for (const m of monthAngles) {
    const sprite = createTextSprite(MONTHS_TR[m.month], {
      color: '#dce6f7', fontSize: 88, worldHeight: 1.85,
    });
    const p = eclipticDirection(m.midLongitude, SCALE.labelRadius);
    sprite.position.set(p.x, TOP_Y + 0.55, p.z);
    g.add(sprite);
  }
  return g;
}

function buildSeasonMarkers(year) {
  const g = new THREE.Group();
  const markerMat = new THREE.MeshBasicMaterial({ color: COLORS.accentSoft, toneMapped: false });

  for (const marker of seasonMarkers(year)) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), markerMat);
    const p = eclipticDirection(marker.longitude, SCALE.ringOuter - 0.62);
    pin.position.set(p.x, TOP_Y + 0.16, p.z);
    g.add(pin);

    const label = createTextSprite(marker.label, {
      color: '#ffc48a', fontSize: 64, worldHeight: 1.0, bold: false,
    });
    const lp = eclipticDirection(marker.longitude, SCALE.ringOuter + 2.2);
    label.position.set(lp.x, TOP_Y + 1.5, lp.z);
    g.add(label);
  }
  return g;
}

// ---------------------------------------------------------------------------

/** XZ duzleminde yatay halka geometrisi (aci = ekliptik boylam). */
function flatRingGeometry(inner, outer, segments = 200, thetaStart = 0, thetaLength = Math.PI * 2) {
  const geom = new THREE.RingGeometry(inner, outer, segments, 1, thetaStart, thetaLength);
  // RingGeometry XY duzlemindedir; -90 derece X donusu onu XZ duzlemine tasir
  // ve aci parametresi dogrudan ekliptik boylama karsilik gelir.
  geom.rotateX(-Math.PI / 2);
  return geom;
}

function dotTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.3, 'rgba(255,165,82,0.45)');
  g.addColorStop(1, 'rgba(255,122,26,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.userData.dispose) obj.userData.dispose();
    obj.geometry?.dispose?.();
  });
}
