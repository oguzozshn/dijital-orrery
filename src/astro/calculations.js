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
    name: moonPhaseName(phaseAngle),
    waxing: phaseAngle < 180,
  };
}

/**
 * Faz adi. Dort ana faz (yeni ay, dordunler, dolunay) yalnizca gercekten
 * o noktaya yakinken kullanilir: Ay faz acisi gunde ~12.2 derece ilerledigi
 * icin +-6 derecelik pencere kabaca +-yarim gundur. Genis 45 derecelik
 * dilimlere bolmek, %44 aydinlik bir Ayi "ilk dordun" diye adlandirirdi.
 */
export function moonPhaseName(phaseAngleDeg) {
  const a = normalizeDeg(phaseAngleDeg);
  const EXACT_WINDOW = 6;
  if (a <= EXACT_WINDOW || a >= 360 - EXACT_WINDOW) return PHASE_NAMES[0]; // Yeni Ay
  if (Math.abs(a - 90) <= EXACT_WINDOW) return PHASE_NAMES[2];             // Ilk Dordun
  if (Math.abs(a - 180) <= EXACT_WINDOW) return PHASE_NAMES[4];            // Dolunay
  if (Math.abs(a - 270) <= EXACT_WINDOW) return PHASE_NAMES[6];            // Son Dordun
  if (a < 90) return PHASE_NAMES[1];   // Buyuyen Hilal
  if (a < 180) return PHASE_NAMES[3];  // Buyuyen Siskin Ay
  if (a < 270) return PHASE_NAMES[5];  // Kuculen Siskin Ay
  return PHASE_NAMES[7];               // Kuculen Hilal
}

/**
 * Takvim halkasindaki 12 ay etiketinin acisal konumlari.
 * Her ayin 1'inde Dunya'nin gercek ekliptik boylamindan turetilir; bu yuzden
 * araliklar tam olarak 30 derece degildir (yorunge hizi degisir).
 */
export function monthRingAngles(year) {
  // Once 12 ay basinin gercek boylami.
  const starts = [];
  for (let month = 0; month < 12; month++) {
    starts.push(earthEcliptic(new Date(Date.UTC(year, month, 1))).longitude);
  }

  // Her dilim, bir sonraki ayin basina kadar uzanir; Aralik dilimi ise
  // AYNI yilin 1 Ocak boylamina kapanir.
  //
  // Neden bir sonraki yilin 1 Ocak'i degil: takvim yili 365 gun, tropik yil
  // 365.2422 gun. Iki yilin 1 Ocak boylami ~0.25 derece farklidir, yani
  // dilimler bir sonraki yila baglanirsa halka 359.75 derecede kapanir ve
  // arada bir bosluk kalir. Fiziksel model gibi halka tam bir daire olmali;
  // artik yil sapmasi Aralik dilimine yazilir.
  const out = [];
  for (let month = 0; month < 12; month++) {
    const startLon = starts[month];
    const endLon = starts[(month + 1) % 12];
    const span = angularDelta(startLon, endLon);
    out.push({
      month,
      startLongitude: startLon,
      endLongitude: endLon,
      // Etiketin ortalanacagi aci (dilim ortasi)
      midLongitude: normalizeDeg(startLon + span / 2),
      span,
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
