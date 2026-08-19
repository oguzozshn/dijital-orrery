import * as THREE from 'three';

/**
 * Dunya yuzeyi icin ozel shader.
 *
 * Gunes sahnenin tam merkezinde (orijinde) oldugu icin isik yonu her nokta
 * icin normalize(-worldPosition) ile dogrudan hesaplanabilir. Bu, gece/gunduz
 * sinirini (terminator) tam dogru konumda verir ve gece tarafinda sehir
 * isiklarini gostermeyi kolaylastirir.
 */
export function createEarthMaterial({ dayMap, nightMap, specularMap, normalMap }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSpecularMap: { value: specularMap },
      uNormalMap: { value: normalMap },
      uAmbient: { value: 0.085 },
      uNightIntensity: { value: 0.9 },
      uTerminatorSoftness: { value: 0.14 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform sampler2D uDayMap;
      uniform sampler2D uNightMap;
      uniform sampler2D uSpecularMap;
      uniform float uAmbient;
      uniform float uNightIntensity;
      uniform float uTerminatorSoftness;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      void main() {
        // Gunes orijinde: her yuzey noktasi icin isik yonu merkeze dogrudur.
        vec3 lightDir = normalize(-vWorldPos);
        vec3 normal = normalize(vWorldNormal);
        float ndl = dot(normal, lightDir);

        // Yumusak terminator: atmosferin sacilmasini taklit eder.
        float daylight = smoothstep(-uTerminatorSoftness, uTerminatorSoftness, ndl);

        vec3 dayColor = texture2D(uDayMap, vUv).rgb;
        vec3 nightColor = texture2D(uNightMap, vUv).rgb;
        float ocean = texture2D(uSpecularMap, vUv).r;

        // Okyanuslarda parlak yansima.
        vec3 halfway = normalize(lightDir + vViewDir);
        float spec = pow(max(dot(normal, halfway), 0.0), 42.0) * ocean * 0.55;

        vec3 lit = dayColor * (uAmbient + max(ndl, 0.0) * 1.05) + vec3(spec) * daylight;
        vec3 dark = dayColor * uAmbient * 0.35 + nightColor * uNightIntensity;

        vec3 color = mix(dark, lit, daylight);

        // Kenarlardaki ince mavi atmosfer halesi.
        float rim = pow(1.0 - max(dot(normal, vViewDir), 0.0), 3.0);
        color += vec3(0.16, 0.34, 0.62) * rim * (0.25 + 0.75 * daylight);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Ay icin ayni "Gunes orijinde" mantigini kullanan sade shader.
 * Boylece Ay'in fazi (aydinlik/karanlik yarim kure) her zaman dogru yonde.
 */
export function createMoonMaterial({ map }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uAmbient: { value: 0.045 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uAmbient;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec3 lightDir = normalize(-vWorldPos);
        vec3 normal = normalize(vWorldNormal);
        float ndl = dot(normal, lightDir);
        // Ay'in atmosferi yok: keskin terminator.
        float daylight = smoothstep(-0.03, 0.06, ndl);
        vec3 base = texture2D(uMap, vUv).rgb;
        vec3 color = base * (uAmbient + daylight * max(ndl, 0.0) * 1.35);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
