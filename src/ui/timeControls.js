import { MONTHS_TR } from '../config.js';

/**
 * Alt zaman cubugu: yil ici kaydirici, tarih/saat secici, yil adimlayici,
 * oynat/duraklat ve hiz kontrolu.
 *
 * Tum zamanlar UTC olarak ele alinir. Boylece kullanicinin bulundugu saat
 * dilimi modelin gostergelerini (ozellikle Greenwich yildiz zamani) etkilemez.
 */

const HOUR_MS = 3600_000;
const THUMB_PX = 16;

export function createTimeControls({ getDate, setDate }) {
  const playBtn = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const playLabel = document.getElementById('play-label');
  const speedSelect = document.getElementById('speed-select');
  const dateInput = document.getElementById('datetime-input');
  const slider = document.getElementById('time-slider');
  const ticksEl = document.getElementById('slider-ticks');
  const yearOut = document.getElementById('year-out');
  const nowBtn = document.getElementById('btn-now');

  let playing = false;
  /** Simule saniye / gercek saniye. */
  let speed = Number(speedSelect.value);
  let year = null;
  /** Kullanici bir alani suruklerken geri besleme dongusunu onler. */
  let syncing = false;

  // --- Yardimcilar ---------------------------------------------------------

  const yearStartMs = (y) => Date.UTC(y, 0, 1);
  const hoursInYear = (y) => (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / HOUR_MS;

  function rebuildYear(y) {
    if (y === year) return;
    year = y;
    slider.max = String(hoursInYear(y) - 1);
    yearOut.textContent = String(y);
    buildTicks(y);
  }

  function buildTicks(y) {
    const total = hoursInYear(y);
    ticksEl.replaceChildren();
    for (let m = 0; m < 12; m++) {
      const start = (Date.UTC(y, m, 1) - yearStartMs(y)) / HOUR_MS;
      const end = (Date.UTC(y, m + 1, 1) - yearStartMs(y)) / HOUR_MS;
      const fraction = ((start + end) / 2) / total;
      const el = document.createElement('span');
      el.textContent = MONTHS_TR[m];
      el.dataset.month = String(m);
      // Kaydirici basliginin genisligi kadar duzeltme, etiketler tam hizalansin.
      el.style.left = `calc(${THUMB_PX / 2}px + ${fraction} * (100% - ${THUMB_PX}px))`;
      ticksEl.appendChild(el);
    }
  }

  function markCurrentMonth(date) {
    const current = date.getUTCMonth();
    for (const el of ticksEl.children) {
      el.classList.toggle('is-current', Number(el.dataset.month) === current);
    }
  }

  const pad = (n) => String(n).padStart(2, '0');
  function toInputValue(d) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
      + `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  // --- Disaridan gelen tarihi arayuze yansit -------------------------------

  function sync(date) {
    syncing = true;
    rebuildYear(date.getUTCFullYear());
    const hoursFromStart = (date.getTime() - yearStartMs(year)) / HOUR_MS;
    slider.value = String(Math.round(hoursFromStart));
    if (document.activeElement !== dateInput) dateInput.value = toInputValue(date);
    markCurrentMonth(date);
    syncing = false;
  }

  // --- Olaylar -------------------------------------------------------------

  slider.addEventListener('input', () => {
    if (syncing) return;
    // Kaydiricinin cozunurlugu 1 saat; dakika bilgisini koruruz ki
    // suruklemeyi birakinca saat basina siçrama olmasin.
    const minutes = getDate().getUTCMinutes();
    setDate(new Date(yearStartMs(year) + Number(slider.value) * HOUR_MS + minutes * 60_000));
  });

  dateInput.addEventListener('change', () => {
    if (syncing || !dateInput.value) return;
    // datetime-local yerel saat varsayar; biz UTC istiyoruz.
    const [datePart, timePart] = dateInput.value.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    setDate(new Date(Date.UTC(y, m - 1, d, hh, mm)));
  });

  document.getElementById('year-prev').addEventListener('click', () => shiftYear(-1));
  document.getElementById('year-next').addEventListener('click', () => shiftYear(1));

  function shiftYear(delta) {
    const d = getDate();
    const next = new Date(d.getTime());
    next.setUTCFullYear(d.getUTCFullYear() + delta);
    setDate(next);
  }

  nowBtn.addEventListener('click', () => setDate(new Date()));

  speedSelect.addEventListener('change', () => { speed = Number(speedSelect.value); });

  playBtn.addEventListener('click', () => setPlaying(!playing));

  function setPlaying(next) {
    playing = next;
    playIcon.textContent = playing ? '❚❚' : '▶';
    playLabel.textContent = playing ? 'Duraklat' : 'Oynat';
    playBtn.setAttribute('aria-pressed', String(playing));
  }

  // Klavye kisayollari: bosluk oynat/duraklat, ok tuslari adim adim ilerlet.
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.code === 'ArrowRight' ? 1 : -1;
      // Shift: 1 saat, varsayilan: 1 gun
      const step = e.shiftKey ? HOUR_MS : 24 * HOUR_MS;
      setDate(new Date(getDate().getTime() + dir * step));
    } else if (e.code === 'Home') {
      e.preventDefault();
      setDate(new Date());
    }
  });

  // --- Ana donguden cagrilir -----------------------------------------------

  /** @param {number} dt Gercek gecen sure (saniye). */
  function tick(dt) {
    if (!playing) return;
    setDate(new Date(getDate().getTime() + dt * speed * 1000));
  }

  setPlaying(false);

  return { sync, tick, setPlaying, get playing() { return playing; } };
}
