import * as THREE from 'three';

/**
 * Texture yukleyici. Kaynak: three.js ornek texture'lari (NASA Visible Earth).
 */
const FILES = {
  earthDay: 'textures/earth_atmos_2048.jpg',
  earthNight: 'textures/earth_lights_2048.png',
  earthSpecular: 'textures/earth_specular_2048.jpg',
  earthNormal: 'textures/earth_normal_2048.jpg',
  moon: 'textures/moon_1024.jpg',
};

export function loadTextures(onProgress) {
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const textures = {};

  for (const [key, file] of Object.entries(FILES)) {
    const url = new URL(file, document.baseURI).href;
    textures[key] = loader.load(url);
    // Renk verisi tasiyanlar sRGB; veri haritalari (normal/specular) lineer.
    textures[key].colorSpace = key === 'earthSpecular' || key === 'earthNormal'
      ? THREE.NoColorSpace
      : THREE.SRGBColorSpace;
    textures[key].anisotropy = 8;
  }

  manager.onProgress = (_url, loaded, total) => onProgress?.(loaded / total);

  const ready = new Promise((resolve, reject) => {
    manager.onLoad = () => resolve(textures);
    manager.onError = (url) => reject(new Error(`Texture yüklenemedi: ${url}`));
  });

  return { textures, ready };
}
