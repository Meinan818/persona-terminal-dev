// r14：原版后处理（umbra-assets p5t/1_battle/postfx：L01 = D1_02_Hiroba_Global Volume Profile，active 组件的原值）
//  - Bloom threshold 0.9 / intensity 1.0（URP Bloom，scatter 未覆盖 = 默认 0.7）
//  - ChromaticAberration intensity 0.2（URP：_Chroma_Params = intensity × 0.05，3 采样）
//  - ShadowsMidtonesHighlights：shadows (0.845,0.882,1.0,+0.10) / midtones (1,0.970,0.935,+0.079) / highlights (1,0.960,0.905,−0.006)，范围 0–0.3 / 0.25–1
//  - 无 Tonemapping、无 ColorLookup（原版没有）。AnimePara（自研渐变光斑）着色器源码未导出 → 未做。
// 实现是按 URP 公式重写的 WebGL 版（重建）；数值是原版。?postfx=0 关闭。
import * as THREE from 'three';

export interface PostFxParams {
  bloomThreshold: number; bloomIntensity: number; chroma: number;
  shadows: [number, number, number, number]; midtones: [number, number, number, number]; highlights: [number, number, number, number];
  sStart: number; sEnd: number; hStart: number; hEnd: number;
}
export const L01_POSTFX: PostFxParams = {
  bloomThreshold: 0.9, bloomIntensity: 1.0, chroma: 0.2,
  shadows: [0.8445556, 0.8818501, 1.0, 0.1005106], midtones: [1.0, 0.9698062, 0.9346555, 0.0785499], highlights: [1.0, 0.9603299, 0.9048220, -0.0060423],
  sStart: 0, sEnd: 0.3, hStart: 0.25, hEnd: 1.0,
};
const g2l = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** URP ColorUtils.PrepareShadowsMidtonesHighlights：颜色转线性，w 作为整体偏移加到三通道 */
function smh(v: [number, number, number, number]) { return new THREE.Vector3(g2l(v[0]) + v[3], g2l(v[1]) + v[3], g2l(v[2]) + v[3]).max(new THREE.Vector3()); }

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const LIN = `vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }`;

export class PostFx {
  enabled = true;
  private rt: THREE.WebGLRenderTarget;
  private b1: THREE.WebGLRenderTarget; private b2: THREE.WebGLRenderTarget;
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private scene = new THREE.Scene();
  private quad: THREE.Mesh;
  private mBright: THREE.ShaderMaterial; private mBlur: THREE.ShaderMaterial; private mFinal: THREE.ShaderMaterial;
  constructor(p: PostFxParams = L01_POSTFX) {
    const mk = (s = 1) => new THREE.WebGLRenderTarget(4, 4, { samples: s, type: THREE.HalfFloatType }); // 线性 HDR 离屏（场景按线性写入，末端统一转 sRGB）
    this.rt = mk(4); this.b1 = mk(); this.b2 = mk();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false; this.scene.add(this.quad);
    this.mBright = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, uTh: { value: p.bloomThreshold } },
      fragmentShader: `${LIN} uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float br = max(c.r, max(c.g, c.b)); float knee = uTh * 0.5;
          float soft = clamp(br - uTh + knee, 0.0, 2.0 * knee); soft = soft * soft / (4.0 * knee + 1e-4);
          float k = max(soft, br - uTh) / max(br, 1e-4); gl_FragColor = vec4(c * k, 1.0); }` });
    this.mBlur = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      fragmentShader: `${LIN} uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec3 s = vec3(0.0); float w[5]; w[0]=0.227027; w[1]=0.1945946; w[2]=0.1216216; w[3]=0.054054; w[4]=0.016216;
          s += texture2D(tSrc, vUv).rgb * w[0];
          for (int i = 1; i < 5; i++) { s += texture2D(tSrc, vUv + uDir * float(i)).rgb * w[i]; s += texture2D(tSrc, vUv - uDir * float(i)).rgb * w[i]; }
          gl_FragColor = vec4(s, 1.0); }` });
    this.mFinal = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false,
      uniforms: { tSrc: { value: null }, tBloom: { value: null }, uChroma: { value: p.chroma * 0.05 }, uBloom: { value: p.bloomIntensity },
        uS: { value: smh(p.shadows) }, uM: { value: smh(p.midtones) }, uH: { value: smh(p.highlights) }, uLim: { value: new THREE.Vector4(p.sStart, p.sEnd, p.hStart, p.hEnd) } },
      fragmentShader: `${LIN} uniform sampler2D tSrc; uniform sampler2D tBloom; uniform float uChroma; uniform float uBloom; uniform vec3 uS; uniform vec3 uM; uniform vec3 uH; uniform vec4 uLim; varying vec2 vUv;
        void main(){
          vec2 co = 2.0 * vUv - 1.0; vec2 end = vUv - co * dot(co, co) * uChroma; vec2 d = (end - vUv) / 3.0;
          vec3 c = vec3(texture2D(tSrc, vUv).r, texture2D(tSrc, vUv + d).g, texture2D(tSrc, vUv + 2.0 * d).b);
          c += texture2D(tBloom, vUv).rgb * uBloom;
          float l = dot(c, vec3(0.2126729, 0.7151522, 0.0721750));
          float sf = 1.0 - smoothstep(uLim.x, uLim.y, l), hf = smoothstep(uLim.z, uLim.w, l), mf = 1.0 - sf - hf;
          c = c * uS * sf + c * uM * mf + c * uH * hf;
          gl_FragColor = vec4(toSrgb(c), 1.0); }` });
  }
  private pass(r: THREE.WebGLRenderer, m: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null) { this.quad.material = m; r.setRenderTarget(to); r.render(this.scene, this.cam); }
  /** draw = 原来的场景渲染（可多遍）；画进离屏目标后做原版后处理输出到屏幕 */
  render(r: THREE.WebGLRenderer, draw: () => void) {
    if (!this.enabled) { draw(); return; }
    const s = r.getDrawingBufferSize(new THREE.Vector2());
    if (this.rt.width !== s.x || this.rt.height !== s.y) { this.rt.setSize(s.x, s.y); const q = (n: number) => Math.max(1, Math.round(n / 4)); this.b1.setSize(q(s.x), q(s.y)); this.b2.setSize(q(s.x), q(s.y)); }
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.rt); draw();
    this.mBright.uniforms.tSrc.value = this.rt.texture; this.pass(r, this.mBright, this.b1);
    this.mBlur.uniforms.tSrc.value = this.b1.texture; this.mBlur.uniforms.uDir.value.set(1.5 / this.b1.width, 0); this.pass(r, this.mBlur, this.b2);
    this.mBlur.uniforms.tSrc.value = this.b2.texture; this.mBlur.uniforms.uDir.value.set(0, 1.5 / this.b1.height); this.pass(r, this.mBlur, this.b1);
    this.mFinal.uniforms.tSrc.value = this.rt.texture; this.mFinal.uniforms.tBloom.value = this.b1.texture; this.pass(r, this.mFinal, prev);
  }
}
