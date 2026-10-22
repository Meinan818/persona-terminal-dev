// 后处理：RenderPass(MSAA) → UnrealBloom(按档位缩分辨率) → OutputPass(sRGB) → Grade(3D LUT 深蓝/红调色 + 暗角 + 甩镜方向模糊 + 边缘色差 + 颗粒 + 受击闪)。
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// —— P5R 战斗调色（sRGB 进出）。对照 108245 参考帧手调：黑位抬到深藏青、中间调偏蓝紫、红色和蓝色加饱和、黄绿减饱和、高光保持白。——
export function p5rGrade([r, g, b]) {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // S 曲线（中点 0.42）
  const sc = (x) => { const k = 1.22; const y = x < 0.42 ? 0.42 * Math.pow(x / 0.42, k) : 1 - 0.58 * Math.pow((1 - x) / 0.58, k); return y; };
  r = sc(r); g = sc(g); b = sc(b);
  // 色相相关饱和度：红/蓝 +，黄绿 -
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0; if (d > 1e-5) { if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; } h *= 60;
  const near = (a, c, w) => Math.max(0, 1 - Math.min(Math.abs(a - c), 360 - Math.abs(a - c)) / w);
  const satK = 1.08 + 0.32 * near(h, 355, 40) + 0.18 * near(h, 225, 45) - 0.06 * near(h, 285, 40) - 0.25 * near(h, 75, 50);
  const l2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r = l2 + (r - l2) * satK; g = l2 + (g - l2) * satK; b = l2 + (b - l2) * satK;
  // 分离色调：暗部深藏青，中间调略紫，高光略冷
  const sh = Math.pow(1 - Math.min(1, l * 1.6), 2.2), mid = 4 * l * (1 - l);
  const S = [0.025, 0.035, 0.12], M = [0.012, -0.012, 0.03];
  r = r * (1 - sh * 0.55) + S[0] * sh + M[0] * mid; g = g * (1 - sh * 0.55) + S[1] * sh + M[1] * mid; b = b * (1 - sh * 0.45) + S[2] * sh + M[2] * mid;
  // 整体略压亮度（原作场景整体偏暗，只有特效和 UI 亮）
  const k = 0.9; r *= k; g *= k; b *= k;
  return [r, g, b].map((x) => Math.min(1, Math.max(0, x)));
}

export function makeLUT(fn = p5rGrade, N = 32) {
  const data = new Uint8Array(N * N * N * 4);
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = fn([x / (N - 1), y / (N - 1), z / (N - 1)]); const i = (x + y * N + z * N * N) * 4;
    data[i] = o[0] * 255; data[i + 1] = o[1] * 255; data[i + 2] = o[2] * 255; data[i + 3] = 255;
  }
  const t = new THREE.Data3DTexture(data, N, N, N); t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
/** 导出 .cube（方便以后用原作截帧在 DaVinci 等工具里精调后替换） */
export function lutToCube(fn = p5rGrade, N = 32) {
  let s = `TITLE "UMBRA P5R battle"\nLUT_3D_SIZE ${N}\n`;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) s += fn([x / (N - 1), y / (N - 1), z / (N - 1)]).map((v) => v.toFixed(5)).join(' ') + '\n';
  return s;
}

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, lut: { value: null }, lutSize: { value: 32 }, lutMix: { value: 1 },
    res: { value: new THREE.Vector2(1, 1) }, vig: { value: 0.55 }, blurDir: { value: new THREE.Vector2(0, 0) },
    ca: { value: 0.0018 }, grain: { value: 0.035 }, time: { value: 0 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    precision highp sampler3D;
    uniform sampler2D tDiffuse; uniform sampler3D lut; uniform float lutSize; uniform float lutMix;
    uniform vec2 res; uniform float vig; uniform vec2 blurDir; uniform float ca; uniform float grain; uniform float time; uniform float flash; uniform vec3 flashCol;
    varying vec2 vUv;
    float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec3 fetch(vec2 uv){
      vec2 dc = uv - 0.5; float e = dot(dc,dc);
      vec2 off = dc * ca * (1. + e*4.);
      return vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
    }
    void main(){
      vec3 c;
      float bl = length(blurDir);
      if (bl > 0.0005) { c = vec3(0.); for (int i=0;i<9;i++){ float k=float(i)/8.-0.5; c += fetch(vUv + blurDir*k); } c/=9.; }
      else c = fetch(vUv);
      float ps = 1.0/lutSize; vec3 uvw = vec3(0.5*ps) + clamp(c,0.,1.)*(1.-ps);
      c = mix(c, texture(lut, uvw).rgb, lutMix);
      vec2 q = (vUv-0.5)*vec2(res.x/res.y,1.);
      float v = smoothstep(0.35, 1.25, length(q*vec2(0.85,1.05)));
      c *= 1. - vig*v;
      c = mix(c, c*vec3(0.75,0.82,1.15), v*0.5);
      c += (h12(vUv*res + fract(time)*91.7)-0.5)*grain;
      c = mix(c, flashCol, flash);
      gl_FragColor = vec4(c,1.);
    }`,
};

export class Post {
  // opt.lutFn：换调色函数（P3R 用冷青色）；opt.renderPass：自定义场景渲染 Pass（召唤演出要在 Bloom 前叠屏幕空间碎玻璃）
  constructor(renderer, scene, camera, tier, opt = {}) {
    this.renderer = renderer; this.tier = tier;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: tier.msaa });
    this.composer = new EffectComposer(renderer, rt);
    this.render = opt.renderPass || new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), tier.bloomStrength, 0.5, 0.9);
    const bs = this.bloom.setSize.bind(this.bloom); this.bloom.setSize = (w, h) => bs(Math.max(32, w * tier.bloomScale * 2), Math.max(32, h * tier.bloomScale * 2));
    this.output = new OutputPass();
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.lut.value = makeLUT(opt.lutFn || p5rGrade);
    for (const p of [this.render, this.bloom, this.output, this.grade]) this.composer.addPass(p);
  }
  setTier(tier) { this.tier = tier; this.bloom.strength = tier.bloomStrength; this.composer.renderTarget1.samples = tier.msaa; this.composer.renderTarget2.samples = tier.msaa; }
  setSize(w, h, dpr) { this.composer.setPixelRatio(dpr); this.composer.setSize(w, h); this.grade.uniforms.res.value.set(w * dpr, h * dpr); }
  frame(t, fx = {}) {
    const u = this.grade.uniforms; u.time.value = t;
    u.blurDir.value.set(fx.blurX || 0, fx.blurY || 0); u.flash.value = fx.flash || 0; if (fx.flashCol) u.flashCol.value.set(fx.flashCol);
    u.vig.value = fx.vig ?? 0.68; if (fx.ca !== undefined) u.ca.value = fx.ca;
    this.bloom.strength = this.tier.bloomStrength * (fx.bloomBoost || 1);
    this.composer.render();
  }
}
