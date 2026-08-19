import * as THREE from 'three';

/**
 * Kameraya donuk metin etiketi. Takvim halkasindaki ay adlari ve
 * mevsim isaretleri icin kullaniliyor.
 */
export function createTextSprite(text, {
  color = '#e8eefb',
  bold = true,
  fontSize = 96,
  padding = 24,
  background = null,
  outline = 'rgba(0,0,0,0.75)',
  worldHeight = 1.6,
} = {}) {
  const font = `${bold ? '700' : '500'} ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  // Once olcum icin gecici bir baglam.
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = font;
  const textWidth = Math.ceil(measureCtx.measureText(text).width);

  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = (textWidth + padding * 2) * dpr;
  canvas.height = (fontSize * 1.4 + padding) * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  if (background) {
    ctx.fillStyle = background;
    roundRect(ctx, 0, 0, w, h, 10);
    ctx.fill();
  }

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = fontSize * 0.14;
    ctx.strokeStyle = outline;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, w / 2, h / 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(worldHeight * (w / h), worldHeight, 1);
  sprite.userData.dispose = () => { texture.dispose(); material.dispose(); };
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
