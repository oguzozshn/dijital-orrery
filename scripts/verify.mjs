/**
 * Modelin astronomik doğrulaması.
 *
 * Dış servis çağırmaz: her kontrol ya fizikten türetilir ya da birbirinden
 * bağımsız iki hesap yolunu karşılaştırır. Böylece çevrimdışı da çalışır.
 *
 *   npm run verify
 */
import {
  Body, Seasons, SearchMoonPhase, SearchMoonQuarter, NextMoonQuarter,
  HelioDistance, SiderealTime,
} from 'astronomy-engine';
import {
  earthEcliptic, moonEcliptic, earthRotationDeg, moonPhaseInfo, moonPhaseName,
  monthRingAngles, seasonMarkers, seasonName, normalizeDeg,
} from '../src/astro/calculations.js';
import {
  OBLIQUITY_DEG, DEG, eclipticDirection, eclipticVectorToScene,
} from '../src/config.js';

let passed = 0;
let failed = 0;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(4) : String(n));
const utc = (d) => (d ? d.toISOString().replace('.000Z', 'Z') : 'yok');

function near(label, actual, expected, tolerance, unit = '') {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  ok ? passed++ : failed++;
  console.log(
    `${ok ? GREEN + 'GEÇTİ' : RED + 'KALDI'}${OFF}  ${label.padEnd(46)} `
    + `${fmt(actual)}${unit} (beklenen ${fmt(expected)}${unit} ±${tolerance}${unit})`,
  );
}

function ok(label, condition, detail = '') {
  condition ? passed++ : failed++;
  console.log(`${condition ? GREEN + 'GEÇTİ' : RED + 'KALDI'}${OFF}  ${label.padEnd(46)} ${detail}`);
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}${title}${OFF}`);
}

const YEAR = 2026;

// ---------------------------------------------------------------------------
section('1) Mevsim dönümlerinde kolun açısı');

// Bu, sahne çerçevesinin tümünü doğrular: Dünya'nın Mart ekinoksunda
// 180 derecede olması, Güneş'in 0 derecede (koç noktası) görünmesi demektir.
{
  const s = Seasons(YEAR);
  const cases = [
    ['Mart ekinoksu', s.mar_equinox.date, 180],
    ['Haziran gündönümü', s.jun_solstice.date, 270],
    ['Eylül ekinoksu', s.sep_equinox.date, 0],
    ['Aralık gündönümü', s.dec_solstice.date, 90],
  ];
  for (const [label, date, expected] of cases) {
    const lon = earthEcliptic(date).longitude;
    // 0 derece civarında sarma sorununu önle.
    const diff = Math.abs(((lon - expected + 540) % 360) - 180);
    near(`${label} (${utc(date).slice(0, 10)})`, 180 - diff, 180, 0.05, '°');
  }
}

// ---------------------------------------------------------------------------
section('2) Eksen eğikliği geometrisi');

// Sahnedeki earthTilt.rotation.x = -eğiklik, kutbu (0, cos e, -sin e) yönüne
// taşır. Burada aynı matematiği bağımsız olarak tekrarlayıp Güneş'e göre
// açıyı kontrol ediyoruz.
{
  const e = OBLIQUITY_DEG * DEG;
  const pole = { x: 0, y: Math.cos(e), z: -Math.sin(e) };
  const s = Seasons(YEAR);

  for (const [label, date, expected] of [
    ['Haziran gündönümü kutup-Güneş açısı', s.jun_solstice.date, 90 - OBLIQUITY_DEG],
    ['Aralık gündönümü kutup-Güneş açısı', s.dec_solstice.date, 90 + OBLIQUITY_DEG],
    ['Mart ekinoksu kutup-Güneş açısı', s.mar_equinox.date, 90],
  ]) {
    const lon = earthEcliptic(date).longitude;
    const earthPos = eclipticDirection(lon, 1);
    // Dünya'dan Güneş'e (orijine) doğru birim vektör.
    const toSun = { x: -earthPos.x, y: -earthPos.y, z: -earthPos.z };
    const dot = pole.x * toSun.x + pole.y * toSun.y + pole.z * toSun.z;
    near(label, Math.acos(Math.max(-1, Math.min(1, dot))) / DEG, expected, 0.05, '°');
  }

  ok('kuzey kutbu ekliptik boylam 90° yönüne eğik',
    Math.abs(Math.atan2(-pole.z, pole.x) / DEG - 90) < 1e-9,
    `boylam=${fmt(Math.atan2(-pole.z, pole.x) / DEG)}°`);
}

// ---------------------------------------------------------------------------
section('3) Takvim halkası dilimleri');

{
  const months = monthRingAngles(YEAR);
  const total = months.reduce((sum, m) => sum + m.span, 0);
  near('12 dilimin toplamı', total, 360, 1e-6, '°');

  const jan = months[0];
  const jul = months[6];
  ok('Ocak dilimi Temmuz diliminden geniş (günberi)',
    jan.span > jul.span,
    `Ocak ${fmt(jan.span)}° > Temmuz ${fmt(jul.span)}°`);

  // Günlük açısal hız: Ocak en hızlı, Temmuz en yavaş olmalı.
  const daysIn = (m) => (Date.UTC(YEAR, m + 1, 1) - Date.UTC(YEAR, m, 1)) / 86400000;
  const rates = months.map((m) => m.span / daysIn(m.month));
  const fastest = rates.indexOf(Math.max(...rates));
  const slowest = rates.indexOf(Math.min(...rates));
  ok('en hızlı ay Ocak/Aralık (günberi)', fastest === 0 || fastest === 11, `ay ${fastest + 1}`);
  ok('en yavaş ay Haziran/Temmuz (günöte)', slowest === 5 || slowest === 6, `ay ${slowest + 1}`);

  // Dilimler bitişik olmalı: her dilimin sonu bir sonrakinin başlangıcı.
  let worstGap = 0;
  for (let i = 0; i < 12; i++) {
    const end = normalizeDeg(months[i].startLongitude + months[i].span);
    const nextStart = months[(i + 1) % 12].startLongitude;
    // İşaretli fark: bitişikse tam 0, boşluk varsa pozitif, örtüşme varsa negatif.
    const signed = ((end - nextStart + 540) % 360) - 180;
    worstGap = Math.max(worstGap, Math.abs(signed));
  }
  ok('dilimler boşluksuz ve örtüşmesiz', worstGap < 1e-9, `en büyük sapma ${worstGap.toExponential(2)}°`);

  // Halkadaki okumanın doğru ayı verdiğini kontrol et: her ayın 15'inde
  // hesaplanan boylam, o ayın dilimine düşmeli.
  let allMatch = true;
  const mismatches = [];
  for (let m = 0; m < 12; m++) {
    const date = new Date(Date.UTC(YEAR, m, 15, 12));
    const lon = earthEcliptic(date).longitude;
    const slice = months.find((x) => normalizeDeg(lon - x.startLongitude) < x.span);
    if (!slice || slice.month !== m) { allMatch = false; mismatches.push(m + 1); }
  }
  ok('her ayın 15’i doğru dilime düşüyor', allMatch,
    allMatch ? '12/12' : `uyuşmayan: ${mismatches.join(',')}`);
}

// ---------------------------------------------------------------------------
section('4) Dünya’nın kendi ekseni etrafındaki dönüşü');

{
  // Yıldız günü 23s 56d 4.09s; dönüş açısı günde 360.9856 derece ilerler.
  const t0 = new Date(Date.UTC(YEAR, 4, 10, 0, 0, 0));
  const t1 = new Date(t0.getTime() + 86400000);
  const advance = normalizeDeg(earthRotationDeg(t1) - earthRotationDeg(t0));
  near('24 saatte dönüş ilerlemesi', advance, 0.9856, 0.01, '°');

  const tSidereal = new Date(t0.getTime() + 86164090.5);
  const siderealAdvance = normalizeDeg(earthRotationDeg(tSidereal) - earthRotationDeg(t0));
  ok('bir yıldız günü sonra dönüş ~aynı',
    siderealAdvance < 0.01 || siderealAdvance > 359.99,
    `${fmt(siderealAdvance)}°`);

  // Sarmalayıcı ile kütüphanenin ham çıktısı aynı olmalı.
  near('sarmalayıcı = SiderealTime * 15',
    earthRotationDeg(t0), normalizeDeg(SiderealTime(t0) * 15), 1e-9, '°');
}

// ---------------------------------------------------------------------------
section('5) Ay fazı');

{
  // Kütüphanenin bulduğu tam faz anlarında aydınlanma oranı doğru olmalı.
  const full = SearchMoonPhase(180, new Date(Date.UTC(YEAR, 0, 1)), 40);
  const info = moonPhaseInfo(full.date);
  console.log(`   ${YEAR} ilk dolunay: ${utc(full.date)}`);
  // Tam 180 derece faz acisinda bile oran 1.000 olmaz: MoonPhase ekliptik
  // BOYLAM farkini olcer, Ay ise 5.3 dereceye kadar enlemde olabilir. Bu fark
  // olmasaydi her ay ay tutulmasi olurdu.
  near('dolunayda aydınlanma oranı', info.fraction, 1, 0.003);
  ok('dolunay adı doğru', info.name === 'Dolunay', `"${info.name}"`);

  const nw = SearchMoonPhase(0, new Date(Date.UTC(YEAR, 0, 1)), 40);
  const nwInfo = moonPhaseInfo(nw.date);
  near('yeni ayda aydınlanma oranı', nwInfo.fraction, 0, 0.001);
  ok('yeni ay adı doğru', nwInfo.name === 'Yeni Ay', `"${nwInfo.name}"`);

  // Ardışık yeni aylar arası = sinodik ay (29.53 gün).
  const nw2 = SearchMoonPhase(0, new Date(nw.date.getTime() + 86400000 * 5), 40);
  near('sinodik ay uzunluğu', (nw2.date - nw.date) / 86400000, 29.53, 0.6, ' gün');

  // İlk/son dördünde yarısı aydınlık.
  let q = SearchMoonQuarter(new Date(Date.UTC(YEAR, 0, 1)));
  for (let i = 0; i < 4; i++) {
    if (q.quarter === 1 || q.quarter === 3) {
      near(`${q.quarter === 1 ? 'ilk' : 'son'} dördünde aydınlanma`,
        moonPhaseInfo(q.time.date).fraction, 0.5, 0.012);
    }
    q = NextMoonQuarter(q);
  }

  // Faz adı sınırları
  ok('%44 aydınlık "dördün" denmiyor',
    moonPhaseName(83) === 'Büyüyen Hilal', `83° -> "${moonPhaseName(83)}"`);
  ok('tam 90° "İlk Dördün"', moonPhaseName(90) === 'İlk Dördün');
}

// ---------------------------------------------------------------------------
section('6) Ay’ın konumu');

{
  // Ay’ın ekliptik enlemi yörünge eğimini (~5.15°) aşmamalı.
  let maxLat = 0;
  for (let d = 0; d < 365; d += 1) {
    const lat = Math.abs(moonEcliptic(new Date(Date.UTC(YEAR, 0, 1 + d))).latitude);
    if (lat > maxLat) maxLat = lat;
  }
  ok('ekliptik enlem yörünge eğimi içinde', maxLat > 4.5 && maxLat < 5.6,
    `yıl içi en büyük |enlem| = ${fmt(maxLat)}°`);

  // Uzaklık oranı çevrimi (günberi ~0.94, günöte ~1.06).
  let minRatio = Infinity;
  let maxRatio = -Infinity;
  for (let d = 0; d < 60; d += 0.25) {
    const r = moonEcliptic(new Date(Date.UTC(YEAR, 0, 1) + d * 86400000)).distanceRatio;
    minRatio = Math.min(minRatio, r);
    maxRatio = Math.max(maxRatio, r);
  }
  ok('uzaklık oranı makul aralıkta',
    minRatio > 0.9 && minRatio < 0.98 && maxRatio > 1.02 && maxRatio < 1.1,
    `${fmt(minRatio)} .. ${fmt(maxRatio)}`);

  // Faz açısı = Ay ile Güneş’in görünür boylam farkı (bağımsız iki yol).
  const date = new Date(Date.UTC(YEAR, 7, 19, 12));
  const solarLon = normalizeDeg(earthEcliptic(date).longitude + 180);
  const elongation = normalizeDeg(moonEcliptic(date).longitude - solarLon);
  near('uzanım = faz açısı', elongation, moonPhaseInfo(date).phaseAngle, 0.6, '°');
}

// ---------------------------------------------------------------------------
section('7) Yörünge yarıçapı ve mevsim adları');

{
  let minDist = Infinity;
  let maxDist = -Infinity;
  let perihelionDay = 0;
  for (let d = 0; d < 365; d++) {
    const dist = HelioDistance(Body.Earth, new Date(Date.UTC(YEAR, 0, 1 + d)));
    if (dist < minDist) { minDist = dist; perihelionDay = d; }
    maxDist = Math.max(maxDist, dist);
  }
  near('günberi uzaklığı', minDist, 0.9833, 0.001, ' AB');
  near('günöte uzaklığı', maxDist, 1.0167, 0.001, ' AB');
  ok('günberi ocak başında', perihelionDay < 10, `yılın ${perihelionDay + 1}. günü`);

  const s = Seasons(YEAR);
  ok('Haziran gündönümünde kuzeyde yaz',
    seasonName(new Date(s.jun_solstice.date.getTime() + 86400000)).north === 'Yaz');
  ok('Aralık gündönümünde kuzeyde kış',
    seasonName(new Date(s.dec_solstice.date.getTime() + 86400000)).north === 'Kış');
  ok('güney yarımküre ters',
    seasonName(new Date(s.jun_solstice.date.getTime() + 86400000)).south === 'Kış');
}

// ---------------------------------------------------------------------------
section('8) Ekliptik → sahne koordinat dönüşümü');

{
  // Boylam 0 = +X, boylam 90 = -Z (kuzeyden bakınca saat yönünün tersi).
  const at0 = eclipticDirection(0, 1);
  const at90 = eclipticDirection(90, 1);
  ok('boylam 0° -> +X', Math.abs(at0.x - 1) < 1e-12 && Math.abs(at0.z) < 1e-12);
  ok('boylam 90° -> -Z', Math.abs(at90.z + 1) < 1e-12 && Math.abs(at90.x) < 1e-12);

  // Vektör dönüşümü aynı kuralı izlemeli: (x, y, z)_ekl -> (x, z, -y)_sahne
  const v = eclipticVectorToScene({ x: 0, y: 1, z: 0 }, 1);
  ok('ekliptik +Y (boylam 90°) -> sahne -Z', Math.abs(v.z + 1) < 1e-12);
  const up = eclipticVectorToScene({ x: 0, y: 0, z: 1 }, 1);
  ok('ekliptik kuzey kutbu -> sahne +Y', Math.abs(up.y - 1) < 1e-12);

  // İki yol tutarlı olmalı: boylamdan yön vs. vektörden yön.
  const date = new Date(Date.UTC(YEAR, 2, 3, 6));
  const earth = earthEcliptic(date);
  const fromLon = eclipticDirection(earth.longitude, 1);
  const norm = Math.hypot(earth.vec.x, earth.vec.y, earth.vec.z);
  const fromVec = eclipticVectorToScene(earth.vec, 1 / norm);
  near('boylam yolu ile vektör yolu aynı (x)', fromVec.x, fromLon.x, 1e-6);
  near('boylam yolu ile vektör yolu aynı (z)', fromVec.z, fromLon.z, 1e-6);
}

// ---------------------------------------------------------------------------
section('9) Mevsim işaretlerinin halkadaki yeri');

{
  const markers = seasonMarkers(YEAR);
  const expected = { mar: 180, jun: 270, sep: 0, dec: 90 };
  for (const m of markers) {
    const diff = Math.abs(((m.longitude - expected[m.key] + 540) % 360) - 180);
    near(`${m.label} halka açısı`, 180 - diff, 180, 0.05, '°');
  }
}

// ---------------------------------------------------------------------------
console.log(
  `\n${BOLD}${failed === 0 ? GREEN : RED}${passed} geçti, ${failed} kaldı${OFF}\n`,
);
process.exit(failed === 0 ? 0 : 1);
