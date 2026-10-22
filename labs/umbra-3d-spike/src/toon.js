// Atlus 风卡通材质：两段色阶（硬分界）+ 原作 _shadow 阴影贴图 + 边缘光 + 手动距离雾；支持骨骼蒙皮。
import * as THREE from 'three';

export const SHARED = {
  lightDir: { value: new THREE.Vector3(0.4, 0.8, 0.5) }, // 视空间，每帧更新
  fogCol: { value: new THREE.Color(0x0b1230) },
  fogNear: { value: 14 },
  fogFar: { value: 46 },
  rimCol: { value: new THREE.Color(0x6fa8ff) },
};

const VS = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vUv = uv;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  vN = normalize(transformedNormal);
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vV = -mvPosition.xyz;
}`;

const FS = /* glsl */ `
uniform sampler2D map; uniform sampler2D smap; uniform float hasMap; uniform float hasS;
uniform vec3 baseCol; uniform vec3 shadeTint; uniform vec3 lightDir; uniform vec3 rimCol; uniform float rimStr;
uniform vec3 fogCol; uniform float fogNear; uniform float fogFar; uniform float alphaTest; uniform float flash; uniform vec3 flashCol;
uniform float threshold; uniform float emissive;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec4 b = hasMap > 0.5 ? texture2D(map, vUv) : vec4(baseCol, 1.0);
  if (b.a < alphaTest) discard;
  vec3 sc = hasS > 0.5 ? texture2D(smap, vUv).rgb : b.rgb * shadeTint;
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float ndl = dot(n, normalize(lightDir));
  float lit = smoothstep(threshold - 0.03, threshold + 0.03, ndl);
  vec3 c = mix(sc, b.rgb, lit);
  c = mix(c, b.rgb, emissive);
  float fr = 1.0 - max(dot(n, normalize(vV)), 0.0);
  c += rimCol * rimStr * smoothstep(0.62, 0.72, fr) * (0.35 + 0.65 * (1.0 - lit));
  float fd = smoothstep(fogNear, fogFar, length(vV));
  c = mix(c, fogCol, fd);
  c = mix(c, flashCol, flash);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export function toonMat({ map = null, smap = null, color = 0xffffff, shadeTint = 0x6a6aa0, rim = 0.5, alphaTest = 0.45, threshold = 0.05, side = THREE.FrontSide, emissive = 0 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map }, smap: { value: smap }, hasMap: { value: map ? 1 : 0 }, hasS: { value: smap ? 1 : 0 },
      baseCol: { value: new THREE.Color(color) }, shadeTint: { value: new THREE.Color(shadeTint) },
      rimStr: { value: rim }, alphaTest: { value: alphaTest }, flash: { value: 0 }, flashCol: { value: new THREE.Color(0xffffff) },
      threshold: { value: threshold }, emissive: { value: emissive },
      lightDir: SHARED.lightDir, fogCol: SHARED.fogCol, fogNear: SHARED.fogNear, fogFar: SHARED.fogFar, rimCol: SHARED.rimCol,
    },
    vertexShader: VS, fragmentShader: FS, side,
  });
  return m;
}

// 反向外壳描边：沿法线按屏幕恒定宽度外推，背面渲染。
const OVS = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
uniform float width;
varying float vD;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vec3 n = normalize(normalMatrix * objectNormal);
  mv.xyz += n * width * clamp(-mv.z, 1.0, 30.0) * 0.0018;
  vD = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const OFS = /* glsl */ `
uniform vec3 col; uniform vec3 fogCol; uniform float fogNear; uniform float fogFar; varying float vD;
void main(){ vec3 c = mix(col, fogCol, smoothstep(fogNear, fogFar, vD) * 0.8); gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
export function outlineMat(width = 1.0, col = 0x05040a) {
  return new THREE.ShaderMaterial({
    uniforms: { width: { value: width }, col: { value: new THREE.Color(col) }, fogCol: SHARED.fogCol, fogNear: SHARED.fogNear, fogFar: SHARED.fogFar },
    vertexShader: OVS, fragmentShader: OFS, side: THREE.BackSide,
  });
}
