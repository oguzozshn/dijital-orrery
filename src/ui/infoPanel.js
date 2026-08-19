import { MONTHS_TR_LONG } from '../config.js';

/**
 * Sol ustteki bilgi paneli: tarih, ay fazi (metin + kucuk gorsel),
 * takvim halkasindaki konum, mevsim ve acisal degerler.
 */
export function createInfoPanel() {
  const el = {
    date: document.getElementById('out-date'),
    dateUtc: document.getElementById('out-date-utc'),
    phaseName: document.getElementById('out-phase-name'),
    phasePct: document.getElementById('out-phase-pct'),
    month: document.getElementById('out-month'),
    season: document.getElementById('out-season'),
    earthLon: document.getElementById('out-earth-lon'),
    earthRot: document.getElementById('out-earth-rot'),
    earthDist: document.getElementById('out-earth-dist'),
    moonPos: document.getElementById('out-moon-pos'),
    moonDist: document.getElementById('out-moon-dist'),
    canvas: document.getElementById('moon-canvas'),
  };

  const ctx = el.canvas.getContext('2d');

  // Panel daraltma
  const toggle = document.getElementById('info-toggle');
  const body = document.getElementById('info-body');
  toggle.addEventListener('click', () => {
    const collapsed = body.hasAttribute('hidden');
    if (collapsed) body.removeAttribute('hidden'); else body.setAttribute('hidden', '');
    toggle.textContent = collapsed ? '−' : '+';
    toggle.setAttribute('aria-expanded', String(collapsed));
  });

  const dateFmt = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const pad = (n) => String(n).padStart(2, '0');

  function update(readout) {
    if (!readout) return;
    const { date, earth, moon, rotation, phase, season, month } = readout;

    el.date.textContent = dateFmt.format(date);
    el.dateUtc.textContent =
      `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;

    el.phaseName.textContent = phase.name;
    el.phasePct.textContent = `%${(phase.fraction * 100).toFixed(1)}`;
    drawMoonPhase(ctx, el.canvas.width, phase.phaseAngle);

    el.month.textContent = `${MONTHS_TR_LONG[month.month]} · ${month.span.toFixed(1)}° dilim`;
    el.season.textContent = `${season.north} / ${season.south}`;
    el.earthLon.textContent = `${earth.longitude.toFixed(2)}°`;
    el.earthRot.textContent = `${rotation.toFixed(2)}°`;
    el.earthDist.textContent = `${earth.distanceAu.toFixed(5)} AB`;
    el.moonPos.textContent = `${moon.longitude.toFixed(1)}° / ${moon.latitude >= 0 ? '+' : ''}${moon.latitude.toFixed(2)}°`;
    el.moonDist.textContent = `${Math.round(moon.distanceAu * 149597870.7).toLocaleString('tr-TR')} km`;
  }

  return { update };
}

/**
 * Ay fazini kucuk bir daire olarak cizer.
 *
 * Faz acisi 0 = yeni ay, 90 = ilk dordun, 180 = dolunay, 270 = son dordun.
 * Her yatay satirda terminatorun x konumu, yaricapin kosinusle olceklenmis
 * hali: x_t = cos(faz) * yarim_genislik. Bu, terminatorun elips oldugu
 * gercegini birebir verir.
 */
export function drawMoonPhase(ctx, size, phaseAngleDeg) {
  const R = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const theta = (phaseAngleDeg * Math.PI) / 180;
  const waxing = phaseAngleDeg < 180;

  ctx.clearRect(0, 0, size, size);

  // Karanlik yuz
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = '#161d29';
  ctx.fill();

  // Aydinlik kisim, satir satir
  ctx.fillStyle = '#eef3fb';
  const cosT = Math.cos(theta);
  for (let i = 0; i < size; i++) {
    const y = i + 0.5 - cy;
    if (Math.abs(y) > R) continue;
    const halfWidth = Math.sqrt(R * R - y * y);
    const terminator = cosT * halfWidth;
    // Buyuyen evrede sag taraf aydinlik, kuculende sol taraf.
    const left = waxing ? terminator : -halfWidth;
    const right = waxing ? halfWidth : -terminator;
    if (right - left <= 0) continue;
    ctx.fillRect(cx + left, i, right - left, 1);
  }

  // Ince kenar cizgisi
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(150, 175, 215, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
