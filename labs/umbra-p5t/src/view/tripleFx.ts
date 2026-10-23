// Triple Threat 地图层（Hark 美术区）：三名我方之间的红光三角（线条逐段画出 + 外发光 + 半透明填充）、
// 三角内敌人的红色脉冲高亮圈、命中闪白球。纯 three.js 基础几何，加法混合，无贴图。
import * as THREE from 'three';

const RED = 0xff1a2a;
const add = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export class TripleFx {
  readonly group = new THREE.Group();
  private t0 = 0;
  private segs: { core: THREE.Mesh; glow: THREE.Mesh; len: number; mid: THREE.Vector3 }[] = [];
  private fill: THREE.Mesh | null = null;
  private rings: THREE.Mesh[] = [];
  private flashes: { m: THREE.Mesh; t0: number }[] = [];
  /** 画线时长（毫秒，已含速度系数） */
  drawMs = 360;

  constructor() { this.group.renderOrder = 20; }

  /** pts = 三个我方脚下（世界坐标），victims = 三角内敌人脚下 */
  show(pts: THREE.Vector3[], victims: THREE.Vector3[], drawMs: number) {
    this.clear();
    this.drawMs = drawMs;
    this.t0 = performance.now();
    const y = Math.max(...pts.map((p) => p.y)) + 0.09;
    const P = pts.map((p) => new THREE.Vector3(p.x, y, p.z));
    for (let i = 0; i < 3; i++) {
      const a = P[i], b = P[(i + 1) % 3];
      const len = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const mk = (r: number, mat: THREE.Material) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8, 1, true), mat);
        m.position.copy(a); // 从 a 端开始长
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        m.userData = { a, b };
        m.renderOrder = 21;
        this.group.add(m);
        return m;
      };
      const glow = mk(0.2, add(RED, 0.35));
      const core = mk(0.055, add(0xffd0d0, 1));
      this.segs.push({ core, glow, len, mid });
    }
    // 顶点光点
    for (const p of P) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), add(0xffa0a0, 0.9));
      s.position.copy(p); s.renderOrder = 22;
      this.group.add(s);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(P.map((p) => p.clone().setY(y - 0.03)));
    geo.setIndex([0, 1, 2]);
    this.fill = new THREE.Mesh(geo, add(RED, 0));
    this.fill.renderOrder = 20;
    this.group.add(this.fill);
    for (const v of victims) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 6), add(RED, 0.95));
      r.rotation.x = -Math.PI / 2;
      r.position.copy(v).setY(v.y + 0.07);
      r.renderOrder = 22;
      this.group.add(r);
      this.rings.push(r);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 6, 1, true), add(RED, 0.18));
      pillar.position.copy(v).setY(v.y + 0.8);
      this.group.add(pillar);
      this.rings.push(pillar);
    }
  }

  /** 命中闪白（敌人身上） */
  hit(at: THREE.Vector3) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), add(0xffffff, 1));
    m.position.copy(at).setY(at.y + 0.5);
    m.renderOrder = 23;
    this.group.add(m);
    this.flashes.push({ m, t0: performance.now() });
  }

  update(frozen = false) {
    if (frozen) return;
    const now = performance.now();
    const k = Math.min(1, (now - this.t0) / Math.max(1, this.drawMs));
    this.segs.forEach((s, i) => {
      // 三条边依次画出（各占 1/3 时长，略重叠）
      const q = Math.max(0.001, Math.min(1, k * 3 - i * 0.8));
      for (const m of [s.core, s.glow]) {
        const { a, b } = m.userData as { a: THREE.Vector3; b: THREE.Vector3 };
        m.scale.set(1, s.len * q, 1);
        m.position.copy(a).lerp(b, q / 2);
      }
      (s.glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.12 * Math.sin(now / 90 + i);
    });
    if (this.fill) (this.fill.material as THREE.MeshBasicMaterial).opacity = 0.22 * k + 0.05 * Math.sin(now / 120);
    const pulse = 1 + 0.15 * Math.sin(now / 80);
    for (const r of this.rings) if ((r.geometry as THREE.BufferGeometry).type === 'RingGeometry') r.scale.setScalar(pulse);
    this.flashes = this.flashes.filter((f) => {
      const q = (now - f.t0) / 260;
      f.m.scale.setScalar(1 + q * 1.8);
      (f.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - q);
      if (q >= 1) { this.group.remove(f.m); f.m.geometry.dispose(); (f.m.material as THREE.Material).dispose(); return false; }
      return true;
    });
  }

  clear() {
    for (const c of [...this.group.children]) {
      this.group.remove(c);
      const m = c as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    }
    this.segs = []; this.rings = []; this.flashes = []; this.fill = null;
  }
}
