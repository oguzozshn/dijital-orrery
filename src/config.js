/**
 * Sahne olcekleri, renkler ve cerceve (frame) tanimi.
 *
 * SAHNE CERCEVESI (ekliptik, Y yukari):
 *   +X = ilkbahar ekinoks noktasi (ekliptik boylam 0 derece)
 *   -Z = ekliptik boylam 90 derece
 *   +Y = ekliptik kuzey kutbu
 *
 * Yani ekliptik boylam lambda icin sahne yonu:
 *   (cos(lambda), 0, -sin(lambda))
 * Bu, kuzeyden bakildiginda saat yonunun tersine donen (gercek) yorunge
 * yonunu verir.
 *
 * OLCEK UYARISI: Fiziksel LEGO modelde oldugu gibi boyutlar ve mesafeler
 * gercek oranlarda DEGILDIR. Acisal iliskiler (yorunge acisi, eksen egikligi,
 * Ay'in konumu ve fazi) gercektir; capraz olcekler gorsel amaclidir.
 */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Dunya'nin eksen egikligi (ortalama obliquity, J2000). */
export const OBLIQUITY_DEG = 23.4392911;

export const SCALE = {
  sunRadius: 3.2,
  shaftRadius: 0.3,
  shaftTop: 6.6,
  shaftBottom: -4.4,
  baseHubRadius: 5.2,

  // Ekliptik duzlem (Dunya'nin yorungesi) y = 0'dadir; takvim halkasi
  // referans modeldeki gibi bunun biraz altinda, taban seviyesinde durur.
  ringY: -3.4,

  orbitRadius: 24,      // takvim halkasi = Dunya'nin yorunge yaricapi
  ringInner: 21.6,
  ringOuter: 26.4,
  ringThickness: 0.55,
  labelRadius: 28.6,

  earthRadius: 1.25,
  moonOrbit: 4.0,
  moonRadius: 0.34,

  armWidth: 0.42,
};

export const COLORS = {
  background: 0x05070c,
  sun: 0xffcf6b,
  sunCore: 0xfff4d6,
  metal: 0x3a4048,
  metalDark: 0x21262d,
  accent: 0xff7a1a,
  accentSoft: 0xffa552,
  ringFace: 0x2a3038,
  ringGroove: 0x171b21,
  text: 0xe8eefb,
  orbitLine: 0x5c6a7d,
};

export const MONTHS_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const MONTHS_TR_LONG = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Ekliptik boylamdan (derece) sahne yonu. */
export function eclipticDirection(longitudeDeg, radius = 1, out = { x: 0, y: 0, z: 0 }) {
  const l = longitudeDeg * DEG;
  out.x = radius * Math.cos(l);
  out.y = 0;
  out.z = -radius * Math.sin(l);
  return out;
}

/**
 * astronomy-engine ekliptik vektorunu (x=ekinoks, y=boylam 90, z=kuzey)
 * sahne koordinatina cevirir.
 */
export function eclipticVectorToScene(vec, scale = 1, out = { x: 0, y: 0, z: 0 }) {
  out.x = vec.x * scale;
  out.y = vec.z * scale;
  out.z = -vec.y * scale;
  return out;
}
