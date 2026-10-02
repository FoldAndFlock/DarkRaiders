// Shared materials + shader hooks: building cutaway, player x-ray, terrain atlas, glow, water.
import * as THREE from '../../vendor/three.module.js';
import { OBLIQUE_K } from './renderer.js';
import { terrainAtlas } from './textures.js';

// Global uniforms shared by every world material
export const GU = {
  uTime: { value: 0 },
  uCut: { value: new THREE.Vector4(1e9, 1e9, -1e9, -1e9) },  // xz rect of building the player is inside
  uCutH: { value: 99 },                                       // walls in that rect are cut above this height
  uXray: { value: new THREE.Vector4(0, 0, -1e9, 0) },         // player x, z, depth key, radius (m)
  uGlowBoost: { value: 1 },                                   // night -> emissive voxels brighter
  uWind: { value: new THREE.Vector2(1, 0) },
};

const COMMON_VERT_PARS = /* glsl */`
  varying vec3 vWPos;
`;
const COMMON_VERT = /* glsl */`
  {
    vec4 wp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      wp = instanceMatrix * wp;
    #endif
    wp = modelMatrix * wp;
    vWPos = wp.xyz;
  }
`;
const COMMON_FRAG_PARS = /* glsl */`
  varying vec3 vWPos;
  uniform vec4 uCut; uniform float uCutH; uniform vec4 uXray; uniform float uTime;
  float dwBayer4(vec2 p){ ivec2 i = ivec2(mod(p,4.0)); int k = i.x + i.y*4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    for(int j=0;j<16;j++){ if(j==k) return m[j]/16.0; } return 0.0; }
`;
const COMMON_FRAG_CLIP = /* glsl */`
  #ifdef DW_CUTAWAY
    if (vWPos.x > uCut.x && vWPos.x < uCut.z && vWPos.z > uCut.y && vWPos.z < uCut.w && vWPos.y > uCutH) discard;
  #endif
  #ifdef DW_XRAY
  {
    // screen-plane distance from player; discard (dithered) geometry in front of the player
    vec2 sp = vec2(vWPos.x, vWPos.z - ${OBLIQUE_K.toFixed(3)} * vWPos.y);
    float dd = length(sp - uXray.xy);
    float key = vWPos.y + ${OBLIQUE_K.toFixed(3)} * vWPos.z;
    if (dd < uXray.w && key > uXray.z + 0.6 && vWPos.y > 0.9) {
      float f = 1.0 - smoothstep(uXray.w * 0.55, uXray.w, dd);
      if (dwBayer4(gl_FragCoord.xy) < f * 0.85) discard;
    }
  }
  #endif
`;

function hook(mat, { cutaway = false, xray = true, glow = false, extraFragPars = '', diffuse = null, extraUniforms = {} } = {}) {
  mat.defines = mat.defines || {};
  if (cutaway) mat.defines.DW_CUTAWAY = '';
  if (xray) mat.defines.DW_XRAY = '';
  if (glow) mat.defines.DW_GLOW = '';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, GU, extraUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + COMMON_VERT_PARS + (glow ? 'attribute float glow; varying float vGlow;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + COMMON_VERT + (glow ? 'vGlow = glow;' : ''));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + COMMON_FRAG_PARS + extraFragPars + (glow ? 'varying float vGlow; uniform float uGlowBoost;' : ''))
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + COMMON_FRAG_CLIP);
    if (diffuse) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', diffuse);
    if (glow) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vGlow * 1.6 * uGlowBoost;');
  };
  mat.customProgramCacheKey = () => [cutaway, xray, glow, !!diffuse].join('|') + (mat.userData.key || '');
  return mat;
}

const cache = new Map();
export function litTex(texture, { cutaway = false, xray = true, color = 0xffffff, transparent = false, side = THREE.FrontSide } = {}) {
  const key = 'tex' + texture.uuid + cutaway + xray + color + transparent + side;
  if (cache.has(key)) return cache.get(key);
  const m = hook(new THREE.MeshLambertMaterial({ map: texture, color, transparent, side }), { cutaway, xray });
  cache.set(key, m); return m;
}
export function litVox({ xray = false, cutaway = false } = {}) {
  const key = 'vox' + xray + cutaway;
  if (cache.has(key)) return cache.get(key);
  const m = hook(new THREE.MeshLambertMaterial({ vertexColors: true }), { xray, cutaway, glow: true });
  cache.set(key, m); return m;
}

// Terrain: per-cell id texture (R = atlas index) + 4x4 atlas, pixel-dither blended borders
export function terrainMaterial(idTexture, cellSize, origin, aoTex = null, aoSize = [1, 1]) {
  const atlas = terrainAtlas();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  hook(m, {
    xray: false,
    extraUniforms: {
      tIds: { value: idTexture }, tAtlas: { value: atlas },
      uCell: { value: cellSize }, uOrigin: { value: new THREE.Vector2(origin[0], origin[1]) },
      uIdSize: { value: new THREE.Vector2(idTexture.image.width, idTexture.image.height) },
      tAO: { value: aoTex }, uAOSize: { value: new THREE.Vector2(aoSize[0], aoSize[1]) },
    },
    extraFragPars: /* glsl */`
      uniform sampler2D tIds; uniform sampler2D tAtlas; uniform float uCell; uniform vec2 uOrigin; uniform vec2 uIdSize;
      uniform sampler2D tAO; uniform vec2 uAOSize;
      float tHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float tNoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(tHash(i),tHash(i+vec2(1,0)),f.x), mix(tHash(i+vec2(0,1)),tHash(i+vec2(1,1)),f.x), f.y); }
    `,
    diffuse: /* glsl */`
      {
        vec2 wp = floor(vWPos.xz * 16.0) / 16.0 + 1.0/32.0;          // snap to texel grid
        vec2 jit = vec2(tNoise(wp * 1.3), tNoise(wp * 1.3 + 17.0)) - 0.5;
        jit += (vec2(tHash(wp), tHash(wp + 3.1)) - 0.5) * 0.5;       // pixel-dither the borders
        vec2 cell = floor((wp + jit * uCell * 0.9 - uOrigin) / uCell);
        cell = clamp(cell, vec2(0.0), uIdSize - 1.0);
        float id = floor(texture2D(tIds, (cell + 0.5) / uIdSize).r * 255.0 + 0.5);
        vec2 tile = vec2(mod(id, 4.0), floor(id / 4.0));
        vec2 tuv = fract(wp / 4.0);
        vec4 tc = texture2D(tAtlas, (tile * 64.0 + floor(tuv * 64.0) + 0.5) / 256.0);
        // subtle large-scale tonal variation so big areas don't look tiled
        float v = tNoise(wp * 0.11) * 0.18 + tNoise(wp * 0.37) * 0.08;
        diffuseColor.rgb *= tc.rgb * (0.9 + v);
        vec4 aov = texture2D(tAO, wp / uAOSize);
        float ao = floor(aov.r * 5.0 + dwBayer4(gl_FragCoord.xy)) / 5.0;   // dithered 5-step AO
        diffuseColor.rgb *= 0.45 + 0.55 * ao;
        // wet dark rim along water edges
        diffuseColor.rgb *= 1.0 - 0.35 * smoothstep(0.05, 0.5, aov.g) * (1.0 - step(0.99, aov.g));
      }
    `,
  });
  return m;
}

// Water: animated pixel waves, glints, depth tint; lit like everything else
export function waterMaterial({ deep = 0x2a5058, shallow = 0x4a7a78, opacity = 0.88 } = {}) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false });
  hook(m, {
    xray: false,
    extraUniforms: { uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(shallow) } },
    extraFragPars: /* glsl */`
      uniform vec3 uDeep; uniform vec3 uShallow;
      float wHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      float wNoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(wHash(i),wHash(i+vec2(1,0)),f.x), mix(wHash(i+vec2(0,1)),wHash(i+vec2(1,1)),f.x), f.y); }
    `,
    diffuse: /* glsl */`
      {
        vec2 wp = floor(vWPos.xz * 16.0) / 16.0;
        float t = uTime;
        float n1 = wNoise(wp * 0.35 + vec2(t * 0.12, t * 0.05));
        float n2 = wNoise(wp * 0.9 - vec2(t * 0.10, -t * 0.14));
        vec3 c = mix(uDeep, uShallow, smoothstep(0.3, 0.75, n1 * 0.65 + n2 * 0.35));
        // thin moving wave crests (1px lines)
        float w = sin(wp.x * 1.3 + wp.y * 2.1 + n1 * 6.0 - t * 1.6);
        float crest = step(0.97, w) * step(0.6, n2) * step(0.5, wNoise(wp * 3.1 + t * 0.4));
        c = mix(c, vec3(0.62, 0.78, 0.8), crest * 0.3);
        // sky reflection sheen
        c += vec3(0.05, 0.07, 0.08) * smoothstep(0.55, 0.9, n2);
        // single-pixel twinkling glints
        float glint = step(0.996, wHash(wp * 16.0 + floor(t * 4.0)));
        c += glint * vec3(0.55);
        diffuseColor.rgb *= c;
      }
    `,
  });
  return m;
}

export function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}
