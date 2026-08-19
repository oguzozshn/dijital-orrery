/**
 * astronomy-engine sarmalayicilari.
 *
 * Tum acisal degerler "tarihin gercek ekliptigi" (ECT) cercevesinde uretilir;
 * Dunya'nin ekseni ve donus acisi (GAST) de ayni ekinoksa gore olculdugu icin
 * model kendi icinde tutarlidir.
 */
import {
  Body,
  HelioVector,
  GeoVector,
  Ecliptic,
  SiderealTime,
  MoonPhase,
  Illumination,
  Seasons,
} from 'astronomy-engine';

export { Body };

/** Ay'in Dunya'ya ortalama uzakligi (AU) -- stilize yorunge olceklemesi icin. */
export const MEAN_MOON_DISTANCE_AU = 0.00257;

/**
 * Dunya'nin Gunes merkezli ekliptik konumu.
 * @returns {{longitude:number, latitude:number, distanceAu:number, vec:{x:number,y:number,z:number}}}
 */
export function earthEcliptic(date) {
  const ecl = Ecliptic(HelioVector(Body.Earth, date));
  return {
    longitude: normalizeDeg(ecl.elon),
    latitude: ecl.elat,
    distanceAu: Math.hypot(ecl.vec.x, ecl.vec.y, ecl.vec.z),
    vec: { x: ecl.vec.x, y: ecl.vec.y, z: ecl.vec.z },
  };
}

/**
 * Ay'in Dunya merkezli ekliptik konumu.
 * Ay'in ~5.1 derecelik yorunge egimi bu vektorde dogal olarak yer alir.
 */
export function moonEcliptic(date) {
  const ecl = Ecliptic(GeoVector(Body.Moon, date, /* aberration */ false));
  const distanceAu = Math.hypot(ecl.vec.x, ecl.vec.y, ecl.vec.z);
  return {
    longitude: normalizeDeg(ecl.elon),
    latitude: ecl.elat,
    distanceAu,
    vec: { x: ecl.vec.x, y: ecl.vec.y, z: ecl.vec.z },
    /** Ortalama uzakliga gore oran (perigee ~0.94, apogee ~1.06). */
    distanceRatio: distanceAu / MEAN_MOON_DISTANCE_AU,
  };
}

/**
 * Dunya'nin kendi ekseni etrafindaki donus acisi.
 * Greenwich gercek yildiz zamani (GAST) = 0 boylamin sag acikligi.
 * @returns {number} derece, 0..360
 */
export function earthRotationDeg(date) {
  return normalizeDeg(SiderealTime(date) * 15);
}

const PHASE_NAMES = [
  'Yeni Ay',
  'Büyüyen Hilal',
  'İlk Dördün',
  'Büyüyen Şişkin Ay',
  'Dolunay',
  'Küçülen Şişkin Ay',
  'Son Dördün',
  'Küçülen Hilal',
];

/** Ay fazi: acisi, aydinlanma orani ve Turkce adi. */
export function moonPhaseInfo(date) {
  const phaseAngle = MoonPhase(date); // 0 = yeni ay, 90 = ilk dordun, 180 = dolunay
  const illum = Illumination(Body.Moon, date);
  return {
    phaseAngle,
    fraction: illum.phase_fraction,
    magnitude: illum.mag,
    name: PHASE_NAMES[Math.floor((((phaseAngle % 360) + 360 + 22.5) % 360) / 45)],
    waxing: phaseAngle < 180,
  };
}

/**
 * Takvim halkasindaki 12 ay etiketinin acisal konumlari.
 * Her ayin 1'inde Dunya'nin gercek ekliptik boylamindan turetilir; bu yuzden
 * araliklar tam olarak 30 derece degildir (yorunge hizi degisir).
 */
export function monthRingAngles(year) {
  const out = [];
  for (let month = 0; month < 12; month++) {
    const start = new Date(Date.UTC(year, month, 1));
    const next = new Date(Date.UTC(year, month + 1, 1));
    const startLon = earthEcliptic(start).longitude;
    const endLon = earthEcliptic(next).longitude;
    out.push({
      month,
      startLongitude: startLon,
      endLongitude: endLon,
      // Etiketin ortalanacagi aci (dilim ortasi)
      midLongitude: normalizeDeg(startLon + angularDelta(startLon, endLon) / 2),
      span: angularDelta(startLon, endLon),
    });
  }
  return out;
}

/** Mevsim donum noktalari: ekinokslar ve gundonumleri. */
export function seasonMarkers(year) {
  const s = Seasons(year);
  return [
    { key: 'mar', label: 'İlkbahar ekinoksu', date: s.mar_equinox.date },
    { key: 'jun', label: 'Yaz gündönümü', date: s.jun_solstice.date },
    { key: 'sep', label: 'Sonbahar ekinoksu', date: s.sep_equinox.date },
    { key: 'dec', label: 'Kış gündönümü', date: s.dec_solstice.date },
  ].map((m) => ({ ...m, longitude: earthEcliptic(m.date).longitude }));
}

/** Kuzey yarimkure mevsimi (Gunes'in gorunur boylamina gore). */
export function seasonName(date) {
  // Dunya'nin boylami + 180 = Gunes'in gorunur boylami.
  const solar = normalizeDeg(earthEcliptic(date).longitude + 180);
  if (solar < 90) return { north: 'İlkbahar', south: 'Sonbahar' };
  if (solar < 180) return { north: 'Yaz', south: 'Kış' };
  if (solar < 270) return { north: 'Sonbahar', south: 'İlkbahar' };
  return { north: 'Kış', south: 'Yaz' };
}

export function normalizeDeg(deg) {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

/** a'dan b'ye ileri yondeki aci farki (0..360). */
export function angularDelta(a, b) {
  return normalizeDeg(b - a);
}
