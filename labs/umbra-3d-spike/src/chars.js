// 角色加载：Collada（Joker/Skull/Jack Frost，带 Bip01 骨骼）+ FBX（Pyro Jack，自带 idle/attack/damage 动作）。
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { toonMat, outlineMat } from './toon.js';

const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function tex(url) {
  if (!url) return null;
  if (texCache.has(url)) return texCache.get(url);
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace; t.flipY = true; t.anisotropy = 4;
  texCache.set(url, t);
  return t;
}

// 贴图名 → [基础色, 阴影贴图]（原作把暗部画在单独的 _shadow 贴图里）
const TEXMAP = {
  joker: {
    'c0001_t01_face01bout': ['c0001_t01_face01bout.png', 'c0001_t01_face01_shadowout.png'],
    'c0001_t01_kamenout': ['c0001_t01_kamenout.png', 'c0001_t01_kamen_shadowout.png'],
    'c0001_t01_hair01out': ['c0001_t01_hair01out.png', 'c0001_t01_hair_shadowout.png'],
    'c0001_t01_body01k2out': ['c0001_t01_body01k2out.png', 'c0001_t01_body01k2_shadowout.png'],
    'c0001_t01_hand02': ['c0001_t01_hand02out.png', 'c0001_t01_hand02_shadowout.png'],
  },
  skull: {
    'c0002_t01_eye01out': ['c0002_t01_eye01out.png', null],
    'c0002_t01_face01out': ['c0002_t01_face01out.png', 'c0002_t01_face01_shadowout.png'],
    'c0002_t01_hair01out': ['c0002_t01_hair01out.png', 'c0002_t01_hair01_shadowout.png'],
    'c0002_t51_body01_kaitouout': ['c0002_t51_body01_kaitouout.png', 'c0002_t51_body01_kaitou_shout.png'],
    'c0002_t51_kamen01out': ['c0002_t51_kamen01out.png', 'c0002_t51_kamen01_shadowout.png'],
  },
  jackfrost: { 'jackfrost_t01': ['jackfrost_t01.png', 'jackfrost_t01_shadow.png'] },
};

const HIDE = /blur|outline|^ase|namida|yodare|^b_[lr]_|h_collision|_ana$/i;

function texKey(m) {
  const src = m && m.map && m.map.image && (m.map.image.currentSrc || m.map.image.src) || (m && m.map && m.map.name) || '';
  return decodeURIComponent(src.split('/').pop() || '').replace(/\.(png|dds|tga)$/i, '');
}

export const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function findBone(root, ...names) {
  const want = names.map(norm);
  let hit = null;
  root.traverse((o) => { if (!hit && (o.isBone || o.type === 'Bone' || o.type === 'Object3D') && want.includes(norm(o.name))) hit = o; });
  return hit;
}

function applyToon(root, id, opt) {
  const dir = `/models/${id}/`;
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const vc = o.geometry.attributes.position.count;
    if (HIDE.test(o.name) || HIDE.test(o.parent && o.parent.name || '') || vc <= 36) { o.visible = false; continue; }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const nm = mats.map((m) => {
      const key = texKey(m);
      let pair = (TEXMAP[id] || {})[key] || (TEXMAP[id] || {})[key.replace(/_png$/, '')];
      if (!pair && id === 'joker' && /hand|te/i.test(o.name + m.name)) pair = TEXMAP.joker['c0001_t01_hand02'];
      if (/outline/i.test(m.name)) return null;
      const map = pair ? tex(dir + pair[0]) : (m.map && m.map.image ? m.map : null);
      if (map && !pair) { map.colorSpace = THREE.SRGBColorSpace; }
      const smap = pair && pair[1] ? tex(dir + pair[1]) : null;
      return toonMat({ map, smap, color: m.color ? m.color.getHex() : 0xffffff, shadeTint: opt.shadeTint || 0x7470a8, rim: opt.rim ?? 0.45, alphaTest: 0.4, side: THREE.DoubleSide });
    });
    if (nm.some((m) => !m)) { o.visible = false; continue; }
    o.material = Array.isArray(o.material) ? nm : nm[0];
    o.frustumCulled = false;
    // 反向外壳描边（共享骨骼）
    if (opt.outline !== false) {
      let ol;
      if (o.isSkinnedMesh) { ol = new THREE.SkinnedMesh(o.geometry, outlineMat(opt.outline || 1.0)); ol.bind(o.skeleton, o.bindMatrix); ol.bindMode = o.bindMode; }
      else ol = new THREE.Mesh(o.geometry, outlineMat(opt.outline || 1.0));
      ol.frustumCulled = false; ol.renderOrder = -1;
      o.parent.add(ol); ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale);
      o.userData.outline = ol;
    }
  }
}

export class Char {
  constructor(id, root, opt = {}) {
    this.id = id; this.opt = opt;
    this.holder = new THREE.Group(); // 世界摆放（位置/朝向）
    this.inner = new THREE.Group();  // 归一化缩放 + 模型朝向修正
    this.holder.add(this.inner); this.inner.add(root); this.root = root;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    const h = box.max.y - box.min.y;
    const s = (opt.height || 1.7) / h;
    this.inner.scale.setScalar(s);
    this.inner.position.y = -box.min.y * s;
    this.inner.rotation.y = opt.yaw || 0;
    this.bones = {};
    this.rest = new Map();
    root.traverse((o) => { if (o.isBone || o.type === 'Bone') this.rest.set(o, o.quaternion.clone()); });
  }
  bone(key, ...names) { if (!(key in this.bones)) this.bones[key] = findBone(this.root, ...names); return this.bones[key]; }
  resetPose() { for (const [b, q] of this.rest) b.quaternion.copy(q); }
  setFlash(v, col) { this.root.traverse((o) => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.flash) { o.material.uniforms.flash.value = v; if (col) o.material.uniforms.flashCol.value.set(col); } }); }
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _id = new THREE.Quaternion();
/** 让 bone→child 指向 dirWorld（世界方向），权重 w。 */
export function aim(bone, child, dirWorld, w = 1) {
  if (!bone || !child) return;
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_v1); child.getWorldPosition(_v2);
  const cur = _v2.sub(_v1);
  if (cur.lengthSq() < 1e-12) return;
  cur.normalize();
  _q.setFromUnitVectors(cur, _v1.copy(dirWorld).normalize());
  if (w < 1) _q.copy(_id).slerp(_q, w);
  bone.parent.getWorldQuaternion(_pq);
  const delta = _pq.clone().invert().multiply(_q).multiply(_pq);
  bone.quaternion.premultiply(delta);
  bone.updateMatrixWorld(true);
}
/** 绕世界轴旋转骨骼 */
export function twist(bone, axisWorld, ang) {
  if (!bone) return;
  bone.parent.getWorldQuaternion(_pq);
  _q.setFromAxisAngle(axisWorld, ang);
  const delta = _pq.clone().invert().multiply(_q).multiply(_pq);
  bone.quaternion.premultiply(delta);
  bone.updateMatrixWorld(true);
}

export async function loadDae(id, url, opt) {
  const c = await new ColladaLoader().loadAsync(url);
  const root = c.scene;
  const maps = []; root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.map && maps.push(m.map)); });
  for (let i = 0; i < 100 && maps.some((m) => !m.image); i++) await new Promise((r) => setTimeout(r, 50));
  applyToon(root, id, opt);
  return new Char(id, root, opt);
}

export async function loadPyro(opt) {
  const o = await new FBXLoader().loadAsync('/models/pyrojack/pyrojack.fbx');
  const map = tex('/models/pyrojack/tex_dvl_mdl_jackolantern_alb.png');
  o.traverse((m) => {
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const nm = mats.map((mm) => toonMat({ map, shadeTint: 0x6058a0, rim: 0.4, alphaTest: 0.4, side: THREE.DoubleSide, emissive: /emission/.test(mm.name) ? 0.8 : 0 }));
    m.material = Array.isArray(m.material) ? nm : nm[0];
    m.frustumCulled = false;
    const ol = new THREE.SkinnedMesh(m.geometry, outlineMat(1.1)); ol.bind(m.skeleton, m.bindMatrix); ol.frustumCulled = false;
    m.parent.add(ol); ol.position.copy(m.position); ol.quaternion.copy(m.quaternion); ol.scale.copy(m.scale);
  });
  const ch = new Char('pyrojack', o, opt);
  ch.mixer = new THREE.AnimationMixer(o);
  ch.clips = Object.fromEntries(o.animations.map((a) => [a.name.replace('dvl_mdl_jackolantern_', ''), a]));
  return ch;
}
