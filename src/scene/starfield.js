import * as THREE from 'three';

/**
 * Sade yildiz arka plani. Amac gercek gokyuzu haritasi degil; sahnenin
 * bosluk hissini kirmak, bu yuzden rastgele ama dengeli dagitilmis noktalar.
 */
export function createStarfield({ count = 2600, radius = 900, seed = 7 } = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const rand = mulberry32(seed);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Kure yuzeyinde duzgun dagilim.
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const dist = radius * (0.85 + rand() * 0.15);

    positions[i * 3] = r * Math.cos(theta) * dist;
    positions[i * 3 + 1] = u * dist;
    positions[i * 3 + 2] = r * Math.sin(theta) * dist;

    // Parlaklik dagilimi: cogu sonuk, birkaci belirgin.
    const brightness = Math.pow(rand(), 2.6);
    const hue = 0.55 + (rand() - 0.5) * 0.12; // hafif mavi-sari cesitlilik
    color.setHSL(hue, 0.25 * rand(), 0.45 + brightness * 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 1.2 + brightness * 5.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      varying vec3 vColor;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        // Yumusak kenarli yuvarlak nokta.
        vec2 d = gl_PointCoord - vec2(0.5);
        float a = 1.0 - smoothstep(0.18, 0.5, length(d));
        if (a <= 0.001) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'starfield';
  points.frustumCulled = false;
  points.renderOrder = -2000;

  return {
    points,
    setPixelRatio(ratio) { material.uniforms.uPixelRatio.value = ratio; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

/** Deterministik rastgelelik: her yuklemede ayni gokyuzu. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
