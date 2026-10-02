// Low-res "SNES-ultra" renderer: oblique 3/4 projection, pixel-snapped camera,
// 15-bit colour quantisation with ordered dithering, depth outlines, sub-pixel smooth scroll.
import * as THREE from '../../vendor/three.module.js';

export const PX_PER_M = 16;          // screen pixels (low-res) per world metre
export const OBLIQUE_K = 0.8;        // how much world height shows as screen height
const DEPTH_RANGE = 160;

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    this.gl.setPixelRatio(1);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    this.gl.localClippingEnabled = false;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.baseHeight = opts.baseHeight || 360;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorld.identity();
    this.camera.matrixWorldInverse.identity();
    this.center = new THREE.Vector2(0, 0);   // camera focus (x,z) in world
    this.snapped = new THREE.Vector2();
    this.view = new THREE.Vector2();     // un-snapped centre incl. shake
    this.subpx = new THREE.Vector2();
    this.shake = 0;
    this.grade = {
      tint: new THREE.Color(1, 1, 1), contrast: 1.05, saturation: 1.0, lift: new THREE.Color(0, 0, 0),
      vignette: 0.35, haze: new THREE.Color(0.8, 0.7, 0.5), hazeAmt: 0.0, flash: 0.0, scan: 0.06,
      wind: new THREE.Vector2(1, 0), time: 0, damage: 0, outline: 1.0,
    };
    this._initPost();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  _initPost() {
    this.target = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
      colorSpace: THREE.SRGBColorSpace, type: THREE.UnsignedByteType,
    });
    this.target.depthTexture = new THREE.DepthTexture(4, 4);
    this.target.depthTexture.type = THREE.UnsignedIntType;
    const g = this.grade;
    this.postMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture }, tDepth: { value: this.target.depthTexture },
        res: { value: new THREE.Vector2(4, 4) }, subpx: { value: this.subpx },
        tint: { value: g.tint }, lift: { value: g.lift }, contrast: { value: 1 }, saturation: { value: 1 },
        vignette: { value: 0.3 }, haze: { value: g.haze }, hazeAmt: { value: 0 }, flash: { value: 0 },
        scan: { value: 0 }, wind: { value: g.wind }, time: { value: 0 }, damage: { value: 0 }, outline: { value: 1 },
        screen: { value: new THREE.Vector2(1, 1) }, pscale: { value: 1 },
      },
      vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform sampler2D tColor; uniform sampler2D tDepth;
        uniform vec2 res; uniform vec2 subpx; uniform vec2 screen; uniform float pscale;
        uniform vec3 tint; uniform vec3 lift; uniform float contrast; uniform float saturation;
        uniform float vignette; uniform vec3 haze; uniform float hazeAmt; uniform float flash;
        uniform float scan; uniform vec2 wind; uniform float time; uniform float damage; uniform float outline;
        float bayer(vec2 p){
          ivec2 i = ivec2(mod(p, 4.0));
          int idx = i.x + i.y*4;
          float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
          for(int k=0;k<16;k++){ if(k==idx) return m[k]/16.0; }
          return 0.0;
        }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          // low-res texel this screen pixel falls in, shifted by sub-pixel camera offset
          vec2 p = (gl_FragCoord.xy - screen * 0.5) / pscale + res * 0.5 + subpx;
          vec2 tp = floor(p);
          vec2 uv = (tp + 0.5) / res;
          vec3 c = texture2D(tColor, uv).rgb;   // hardware sRGB decode -> linear
          c = mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); // back to sRGB
          float d = texture2D(tDepth, uv).r;
          // depth outlines: darken pixels that sit in front of a much farther neighbour
          float dl = texture2D(tDepth, uv - vec2(1.0/res.x, 0.0)).r;
          float dr = texture2D(tDepth, uv + vec2(1.0/res.x, 0.0)).r;
          float du = texture2D(tDepth, uv + vec2(0.0, 1.0/res.y)).r;
          float dd = texture2D(tDepth, uv - vec2(0.0, 1.0/res.y)).r;
          float edge = max(max(dl - d, dr - d), max(du - d, dd - d));
          float o = smoothstep(0.004, 0.012, edge) * outline;
          c *= 1.0 - 0.55 * o;
          // haze (sand / fog) with wind-scrolling noise
          if (hazeAmt > 0.0) {
            vec2 hp = tp * 0.03 - wind * time * 0.6;
            float n = vnoise(hp) * 0.6 + vnoise(hp * 2.7 + 13.0) * 0.4;
            float h = clamp(hazeAmt * (0.55 + 0.9 * n), 0.0, 0.92);
            c = mix(c, haze, h);
          }
          // grade
          c = c * tint + lift;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, saturation);
          c = (c - 0.5) * contrast + 0.5;
          c += flash;
          vec2 q = gl_FragCoord.xy / screen - 0.5;
          c *= 1.0 - vignette * dot(q, q) * 2.2;
          c = mix(c, vec3(0.75, 0.05, 0.03), damage * smoothstep(0.15, 0.75, length(q)) );
          c *= 1.0 - scan * mod(tp.y, 2.0);
          // 15-bit colour (5 bits / channel) with 4x4 ordered dither, like SNES CGRAM
          float b = bayer(tp) - 0.5;
          c = floor(clamp(c, 0.0, 1.0) * 31.0 + 0.5 + b * 0.9) / 31.0;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.scale = Math.max(1, Math.round(h / this.baseHeight));
    // +2 px margin so sub-pixel scrolling never shows an edge
    this.lw = Math.ceil(w / this.scale) + 4;
    this.lh = Math.ceil(h / this.scale) + 4;
    this.gl.setSize(w, h, false);
    this.target.setSize(this.lw, this.lh);
    this.postMat.uniforms.res.value.set(this.lw, this.lh);
    this.postMat.uniforms.screen.value.set(w, h);
    this.postMat.uniforms.pscale.value = this.scale;
    this.cssW = w; this.cssH = h;
    this.viewW = this.lw / PX_PER_M;
    this.viewH = this.lh / PX_PER_M;
  }

  // world (x,y,z) -> CSS pixel position on the canvas
  worldToScreen(x, y, z, out = {}) {
    const f = PX_PER_M * this.scale;
    out.x = this.cssW / 2 + (x - this.view.x) * f;
    out.y = this.cssH / 2 + (z - this.view.y - y * OBLIQUE_K) * f;
    return out;
  }
  // CSS pixel -> world point on the horizontal plane at height groundY
  screenToGround(cssX, cssY, groundY = 0, out = {}) {
    const f = PX_PER_M * this.scale;
    out.x = this.view.x + (cssX - this.cssW / 2) / f;
    out.z = this.view.y + (cssY - this.cssH / 2) / f + groundY * OBLIQUE_K;
    return out;
  }

  _updateProjection() {
    const px = 1 / PX_PER_M;
    let cx = this.center.x, cz = this.center.y;
    if (this.shake > 0) { cx += (Math.random() - 0.5) * this.shake; cz += (Math.random() - 0.5) * this.shake; }
    this.view.set(cx, cz);
    const sx = Math.round(cx / px) * px, sz = Math.round(cz / px) * px;
    this.snapped.set(sx, sz);
    // sub-pixel remainder in low-res pixels (x right, y up in texture space)
    this.subpx.set((cx - sx) * PX_PER_M, -(cz - sz) * PX_PER_M);
    const W = this.lw / PX_PER_M, H = this.lh / PX_PER_M, k = OBLIQUE_K, R = DEPTH_RANGE;
    const m = new THREE.Matrix4();
    // clip.x = (x-sx)*2/W ; clip.y = (k*y - (z-sz))*2/H ; clip.z = -(y + k(z-sz))/R
    m.set(
      2 / W, 0, 0, -sx * 2 / W,
      0, 2 * k / H, -2 / H, sz * 2 / H,
      0, -1 / R, -k / R, k * sz / R,
      0, 0, 0, 1);
    this.camera.projectionMatrix.copy(m);
    this.camera.projectionMatrixInverse.copy(m).invert();
  }

  render(dt) {
    const g = this.grade, u = this.postMat.uniforms;
    g.time += dt;
    this._updateProjection();
    this.gl.setRenderTarget(this.target);
    this.gl.render(this.scene, this.camera);
    this.gl.setRenderTarget(null);
    u.contrast.value = g.contrast; u.saturation.value = g.saturation; u.vignette.value = g.vignette;
    u.hazeAmt.value = g.hazeAmt; u.flash.value = g.flash; u.scan.value = g.scan; u.time.value = g.time;
    u.damage.value = g.damage; u.outline.value = g.outline;
    this.gl.render(this.postScene, this.postCam);
  }
}
