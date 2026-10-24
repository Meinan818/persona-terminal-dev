// 关卡物件表现（Hark 美术区，P5T 红/黑/白配色，全部程序几何，无外部素材）：
// 宝箱（开/关 + 开箱爆闪）、门（关/开滑动）、开关拉杆（切换动画）、未解锁区域（压暗 + 红色斜纹警戒边，解锁时扫开）、
// 增援预警格、喇叭禁区脉冲环、梯子/跳台连线。只读 Battle 状态。
import * as THREE from 'three';
import type { Battle, Vec, BattleEvent } from '../rules';
import { spawnWarnings } from './predict';

const RED = 0xe60012, BLACK = 0x0d0d0f, WHITE = 0xf4f4f4;
const SPEAKER_R = 3;

export interface MapObjDeps { w2v: (p: Vec, y?: number) => THREE.Vector3; level: number }
type Tween = { t0: number; dur: number; fn: (k: number) => void; done?: () => void };

let hatchTex: THREE.CanvasTexture | null = null;
/** 红黑 45° 斜纹（P5 警戒带） */
export function hatchTexture() {
  if (hatchTex) return hatchTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#e60012';
  for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 11, 0); g.lineTo(i + 11 - 64, 64); g.lineTo(i - 64, 64); g.closePath(); g.fill(); }
  hatchTex = new THREE.CanvasTexture(c);
  hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping;
  hatchTex.colorSpace = THREE.SRGBColorSpace;
  return hatchTex;
}
const std = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const basic = (color: number, extra: Partial<THREE.MeshBasicMaterialParameters> = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const k2 = (p: Vec) => `${p.x},${p.y}`;
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

export class MapObjects {
  group = new THREE.Group();
  private dyn = new THREE.Group(); // 每次 refresh 重画（增援预警、喇叭环）
  private b!: Battle;
  private tweens: Tween[] = [];
  private chests = new Map<string, { g: THREE.Group; lid: THREE.Group }>();
  private doors = new Map<string, { panels: { m: THREE.Object3D; closed: THREE.Vector3; open: THREE.Vector3 }[] }>();
  private levers = new Map<string, { arm: THREE.Group; pad: THREE.Mesh; on: boolean }>();
  /** 每格上的可压暗网格（地砖、掩体、本模块物件） */
  private cellMeshes = new Map<string, THREE.Mesh[]>();
  private fogEdges = new THREE.Group();
  private pulses: { m: THREE.Object3D; kind: 'warn' | 'ring' | 'bob' | 'flag'; base?: THREE.Vector3; phase: number; r?: number }[] = [];
  private toggled = new Map<string, boolean>();

  constructor(private d: MapObjDeps) {}

  /** 重建：在 main.build() 之后调用；tileMeshes 带 userData {x,y} */
  build(world: THREE.Group, b: Battle, tileMeshes: THREE.Object3D[]) {
    this.b = b;
    this.group = new THREE.Group();
    this.dyn = new THREE.Group();
    this.fogEdges = new THREE.Group();
    this.group.add(this.dyn, this.fogEdges);
    world.add(this.group);
    this.chests.clear(); this.doors.clear(); this.levers.clear(); this.cellMeshes.clear(); this.pulses = [];
    for (const m of tileMeshes) this.regCell(m as THREE.Mesh, { x: m.userData.x, y: m.userData.y });
    this.buildDoors(); this.buildSwitches(); this.buildChests(); this.buildLinks();
    this.paintFog(); this.buildFogEdges(); this.buildZoneChains();
    this.refresh();
  }
  private regCell(m: THREE.Mesh, p: Vec) {
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat || !('color' in mat)) return;
    if (!m.userData.baseColor) m.userData.baseColor = mat.color.getHex();
    const a = this.cellMeshes.get(k2(p)) ?? [];
    a.push(m); this.cellMeshes.set(k2(p), a);
  }
  private regGroup(g: THREE.Object3D, p: Vec) {
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).material = ((o as THREE.Mesh).material as THREE.Material).clone(); this.regCell(o as THREE.Mesh, p); } });
  }
  private locked(p: Vec) { const z = this.b.zoneOf(p); return !!this.b.map.zones && !!z && !this.b.rt.unlocked.has(z); }

  // ---------- 门 ----------
  private doorAxis(cells: Vec[]): 'x' | 'z' {
    if (cells.length > 1) return cells[0].y === cells[1].y ? 'x' : 'z';
    const c = cells[0];
    const wall = (p: Vec) => this.b.grid.inBounds(p) && this.b.map.tiles[p.y][p.x] === 'wall';
    return wall({ x: c.x - 1, y: c.y }) || wall({ x: c.x + 1, y: c.y }) ? 'x' : 'z';
  }
  private buildDoors() {
    for (const d of this.b.map.doors ?? []) {
      const axis = this.doorAxis(d.cells);
      const cx = d.cells.reduce((s, c) => s + c.x, 0) / d.cells.length, cy = d.cells.reduce((s, c) => s + c.y, 0) / d.cells.length;
      const open = !!this.b.rt.doors.get(d.id);
      const panels: { m: THREE.Object3D; closed: THREE.Vector3; open: THREE.Vector3 }[] = [];
      for (const c of d.cells) {
        const g = new THREE.Group();
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.98, 1.5, 0.18), std(BLACK, { roughness: 0.4 }));
        slab.position.y = 0.75;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.12, 0.2), std(RED, { emissive: RED, emissiveIntensity: 0.5 }));
        stripe.position.y = 0.5;
        const stripe2 = stripe.clone(); stripe2.position.y = 1.0;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.99, 0.05, 0.21), std(WHITE));
        cap.position.y = 1.5;
        g.add(slab, stripe, stripe2, cap);
        if (axis === 'z') g.rotation.y = Math.PI / 2;
        const base = this.d.w2v(c);
        const along = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
        const sgn = d.cells.length > 1 ? Math.sign((axis === 'x' ? c.x - cx : c.y - cy) || 1) : (() => {
          const w = (p: Vec) => this.b.grid.inBounds(p) && this.b.map.tiles[p.y][p.x] === 'wall';
          return axis === 'x' ? (w({ x: c.x - 1, y: c.y }) ? -1 : 1) : (w({ x: c.x, y: c.y - 1 }) ? -1 : 1);
        })();
        const openPos = base.clone().addScaledVector(along, sgn * 0.86).add(new THREE.Vector3(0, -0.05, 0));
        g.position.copy(open ? openPos : base);
        g.traverse((o) => { o.castShadow = true; });
        this.group.add(g);
        this.regGroup(g, c);
        // 门框（常驻）
        for (const off of [-0.5, 0.5]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.62, 0.26), std(WHITE));
          post.position.copy(base).add(along.clone().multiplyScalar(off)).add(new THREE.Vector3(0, 0.81, 0));
          this.group.add(post);
          this.regCell(post, c);
        }
        panels.push({ m: g, closed: base, open: openPos });
      }
      this.doors.set(d.id, { panels });
    }
  }
  private animDoor(id: string, open: boolean) {
    const d = this.doors.get(id);
    if (!d) return Promise.resolve();
    return Promise.all(d.panels.map((p) => this.tween(380, (k) => {
      const e = easeOut(k);
      p.m.position.lerpVectors(open ? p.closed : p.open, open ? p.open : p.closed, e);
      p.m.position.y += Math.sin(k * Math.PI) * 0.06;
    }))).then(() => undefined);
  }

  // ---------- 开关 / 拉杆 ----------
  private switchOn(id: string, kind: string) {
    if (kind === 'hold') return !!this.b.rt.switchOcc.get(id);
    if (kind === 'elevator') { const sw = this.b.map.switches?.find((s) => s.id === id); return !!(sw?.elevator && this.b.rt.elevators.get(sw.elevator)); }
    return this.toggled.get(id) ?? false;
  }
  private buildSwitches() {
    const ACC: Record<string, number> = { hold: WHITE, toggle: RED, elevator: 0xffd400 };
    for (const sw of this.b.map.switches ?? []) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.08, 6), std(BLACK));
      base.position.y = 0.04;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 6), std(ACC[sw.kind], { emissive: ACC[sw.kind], emissiveIntensity: 0.35 }));
      pad.position.y = 0.1;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.2), std(0x222226));
      box.position.set(0, 0.2, -0.22);
      const arm = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std(WHITE));
      stick.position.y = 0.25;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), std(RED, { emissive: RED, emissiveIntensity: 0.4 }));
      knob.position.y = 0.5;
      arm.add(stick, knob);
      arm.position.set(0, 0.26, -0.22);
      const on = this.switchOn(sw.id, sw.kind);
      arm.rotation.x = on ? 0.6 : -0.6;
      g.add(base, pad, box, arm);
      g.position.copy(this.d.w2v(sw.pos));
      this.group.add(g);
      this.regGroup(g, sw.pos);
      this.levers.set(sw.id, { arm, pad: g.children[1] as THREE.Mesh, on });
    }
  }
  private animSwitch(id: string) {
    const sw = this.b.map.switches?.find((s) => s.id === id);
    const l = this.levers.get(id);
    if (!sw || !l) return Promise.resolve();
    if (sw.kind === 'toggle') this.toggled.set(id, !(this.toggled.get(id) ?? false));
    const on = this.switchOn(id, sw.kind);
    const from = l.arm.rotation.x, to = on ? 0.6 : -0.6;
    l.on = on;
    const mat = l.pad.material as THREE.MeshStandardMaterial;
    return this.tween(300, (k) => {
      l.arm.rotation.x = from + (to - from) * easeOut(k);
      mat.emissiveIntensity = 0.35 + Math.sin(k * Math.PI) * 1.4;
    });
  }

  // ---------- 宝箱 ----------
  private buildChests() {
    for (const c of this.b.map.chests ?? []) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.4), std(BLACK, { roughness: 0.35 }));
      body.position.y = 0.16;
      for (const x of [-0.2, 0.2]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.33, 0.41), std(RED, { emissive: RED, emissiveIntensity: 0.3 }));
        band.position.set(x, 0.165, 0);
        g.add(band);
      }
      const lid = new THREE.Group();
      const lidM = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.56, 12, 1, false, 0, Math.PI), std(RED, { roughness: 0.4 }));
      lidM.rotation.z = Math.PI / 2; lidM.rotation.y = Math.PI / 2;
      lidM.position.set(0, 0, 0.2);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.04), std(WHITE, { emissive: 0x444444 }));
      lock.position.set(0, -0.02, 0.41);
      lid.add(lidM, lock);
      lid.position.set(0, 0.32, -0.2); // 铰链在后沿
      g.add(body, lid);
      g.position.copy(this.d.w2v(c.pos));
      g.rotation.y = Math.PI / 4;
      g.traverse((o) => { o.castShadow = true; });
      const opened = this.b.rt.chests.has(c.id);
      if (opened) lid.rotation.x = -1.9;
      g.visible = !this.locked(c.pos);
      this.group.add(g);
      this.regGroup(g, c.pos);
      this.chests.set(c.id, { g, lid });
      if (!opened) this.pulses.push({ m: g, kind: 'bob', base: g.position.clone(), phase: Math.random() * 6 });
    }
  }
  async animChest(id: string) {
    const c = this.chests.get(id);
    if (!c) return;
    this.pulses = this.pulses.filter((p) => p.m !== c.g);
    const base = this.d.w2v(this.b.map.chests!.find((x) => x.id === id)!.pos);
    c.g.position.copy(base);
    await this.tween(260, (k) => { c.lid.rotation.x = -1.9 * easeOut(k); });
    this.burst(base.clone().add(new THREE.Vector3(0, 0.45, 0)));
  }
  /** 开箱爆闪：白/红/黄碎片 + 光柱 */
  burst(at: THREE.Vector3) {
    const cols = [WHITE, RED, 0xffd400, WHITE, BLACK];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.07 + (i % 3) * 0.03), basic(cols[i % cols.length], { transparent: true }));
      m.position.copy(at);
      const a = (i / 16) * Math.PI * 2, sp = 0.9 + (i % 4) * 0.25;
      const v = new THREE.Vector3(Math.cos(a) * sp, 1.6 + (i % 5) * 0.3, Math.sin(a) * sp);
      this.group.add(m);
      this.tween(650, (k) => {
        m.position.set(at.x + v.x * k, at.y + v.y * k - 2.2 * k * k, at.z + v.z * k);
        m.rotation.set(k * 9, k * 7, 0);
        (m.material as THREE.MeshBasicMaterial).opacity = 1 - k * k;
      }, () => this.group.remove(m));
    }
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 12, 1, true), basic(0xffffff, { transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    col.position.copy(at).add(new THREE.Vector3(0, 1.1, 0));
    this.group.add(col);
    this.tween(520, (k) => { col.scale.set(1 + k, 1, 1 + k); (col.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k); }, () => this.group.remove(col));
  }

  // ---------- 梯子 / 跳台 ----------
  private buildLinks() {
    const L = this.d.level;
    for (const l of this.b.grid.links) {
      const [lo, hi] = this.b.grid.h(l.a) <= this.b.grid.h(l.b) ? [l.a, l.b] : [l.b, l.a];
      const y0 = this.b.grid.h(lo) * L, y1 = this.b.grid.h(hi) * L;
      if (l.kind === 'ladder') {
        // P5T 式木梯：两根木扶手+横档，斜靠在高台墙面上（底部外撇），顶端铁钩挂住台沿，比台面高出一截
        // 两端不相邻时，梯子贴在高处格朝向低处一侧的墙面
        const dx = lo.x - hi.x, dy = lo.y - hi.y;
        const ax = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0, ay = ax ? 0 : Math.sign(dy);
        const len = Math.max(0.3, y1 - y0) + 0.28;
        const lean = 0.18; // 底部离墙
        const tilt = Math.atan2(lean, len);
        const g = new THREE.Group();
        const wood = std(0x8a5a3a, { roughness: 0.85, emissive: 0x2a1408, emissiveIntensity: 0.6 });
        const rungM = std(0xb98a55, { roughness: 0.8, emissive: 0x2a1408, emissiveIntensity: 0.6 });
        const iron = std(0x2a2a30, { metalness: 0.6, roughness: 0.4 });
        for (const off of [-0.19, 0.19]) {
          const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, len / Math.cos(tilt), 0.07), wood);
          r.position.set(off, len / 2, 0);
          g.add(r);
          const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 5, 8, Math.PI), iron);
          hook.position.set(off, len - 0.02, -0.06); hook.rotation.y = Math.PI / 2;
          g.add(hook);
        }
        const n = Math.max(3, Math.round(len / 0.2));
        for (let i = 1; i < n; i++) {
          const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 6), rungM);
          rung.rotation.z = Math.PI / 2;
          rung.position.set(0, (len * i) / n, 0);
          g.add(rung);
        }
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26), basic(0x000000, { transparent: true, opacity: 0.28, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.012, 0.06);
        g.add(shadow);
        // 组：本地 -z 朝墙；放在高处格墙面外侧
        const wall = this.d.w2v(hi, 0);
        const face = new THREE.Vector3(wall.x + ax * 0.5, y0, wall.z + ay * 0.5);
        const pivot = new THREE.Group();
        g.rotation.x = -tilt; // 顶靠墙、底外撇
        g.position.set(0, 0, lean / 2 + 0.04);
        pivot.add(g);
        pivot.position.copy(face);
        pivot.rotation.y = Math.atan2(ax, ay);
        this.group.add(pivot);
      } else {
        // 跳台：白色虚线抛物弧 + 两端红色箭头
        const a = this.d.w2v(l.a, 0.12), b2 = this.d.w2v(l.b, 0.12);
        const top = Math.max(a.y, b2.y) + 0.9;
        const n = 9;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const p = new THREE.Vector3().lerpVectors(a, b2, t);
          p.y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * top + t * t * b2.y;
          const dash = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), basic(WHITE));
          dash.position.copy(p);
          this.group.add(dash);
        }
        for (const [p, q] of [[a, b2], [b2, a]] as const) {
          const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 3), basic(RED));
          arrow.position.copy(p).add(new THREE.Vector3(0, 0.02, 0));
          const dir = q.clone().sub(p); dir.y = 0; dir.normalize();
          arrow.rotation.x = Math.PI / 2;
          arrow.rotation.z = -Math.atan2(dir.x, dir.z);
          arrow.position.addScaledVector(dir, 0.18);
          this.group.add(arrow);
        }
      }
      // 两端地面小标（从俯视也能看到）
      for (const p of [l.a, l.b]) {
        const mark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 4), basic(l.kind === 'ladder' ? WHITE : RED, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
        mark.rotation.x = -Math.PI / 2; mark.rotation.z = Math.PI / 4;
        mark.position.copy(this.d.w2v(p, 0.025));
        this.group.add(mark);
      }
    }
  }

  // ---------- 区域边界：P5T 式红色铁链虚线（所有区域交界，解锁前后都显示） ----------
  private buildZoneChains() {
    const z = this.b.map.zones;
    if (!z) return;
    const W = this.b.map.width, H = this.b.map.height;
    const edges: { c: THREE.Vector3; along: 'x' | 'z' }[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.b.map.tiles[y][x] === 'wall') continue;
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= W || ny >= H || this.b.map.tiles[ny][nx] === 'wall') continue;
        const za = this.b.zoneOf({ x, y }), zb = this.b.zoneOf({ x: nx, y: ny });
        if (!za || !zb || za === zb) continue;
        const pa = this.d.w2v({ x, y }, 0.05), pb = this.d.w2v({ x: nx, y: ny }, 0.05);
        edges.push({ c: new THREE.Vector3((pa.x + pb.x) / 2, Math.max(pa.y, pb.y), (pa.z + pb.z) / 2), along: dx ? 'z' : 'x' });
      }
    }
    if (!edges.length) return;
    const PER = 6;
    const geo = new THREE.TorusGeometry(0.066, 0.022, 5, 10);
    geo.scale(1.45, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, std(RED, { emissive: RED, emissiveIntensity: 0.45, metalness: 0.4, roughness: 0.4 }), edges.length * PER);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    let i = 0;
    for (const ed of edges) for (let k = 0; k < PER; k++) {
      const t = (k + 0.5) / PER - 0.5;
      const p = ed.c.clone(); if (ed.along === 'x') p.x += t; else p.z += t;
      // 链环交替：平躺 / 竖立，长轴沿边
      e.set(k % 2 ? 0 : -Math.PI / 2, ed.along === 'x' ? 0 : Math.PI / 2, 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(p, q, one); mesh.setMatrixAt(i++, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.renderOrder = 2;
    this.group.add(mesh);
  }

  // ---------- 未解锁区域 ----------
  private paintCell(p: Vec, dark: number /* 0 = 正常, 1 = 全暗 */, flash = 0) {
    for (const m of this.cellMeshes.get(k2(p)) ?? []) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.setHex(m.userData.baseColor).multiplyScalar(1 - 0.8 * dark);
      if ('emissive' in mat && mat.emissive) {
        if (m.userData.baseEmissive == null) { m.userData.baseEmissive = mat.emissive.getHex(); m.userData.baseEI = mat.emissiveIntensity; }
        if (flash > 0) { mat.emissive.setHex(RED); mat.emissiveIntensity = flash * 1.2; }
        else if (dark > 0) { mat.emissive.setHex(0x1a0004); mat.emissiveIntensity = dark; }
        else { mat.emissive.setHex(m.userData.baseEmissive); mat.emissiveIntensity = m.userData.baseEI; }
      }
    }
  }
  private paintFog() {
    if (!this.b.map.zones) return;
    for (let y = 0; y < this.b.map.height; y++) for (let x = 0; x < this.b.map.width; x++) if (this.locked({ x, y })) this.paintCell({ x, y }, 1);
  }
  /** 锁定格与已解锁格交界：地面红黑斜纹带 + 矮警戒栏 */
  private buildFogEdges() {
    this.group.remove(this.fogEdges);
    this.fogEdges = new THREE.Group();
    this.group.add(this.fogEdges);
    if (!this.b.map.zones) return;
    const tex = hatchTexture();
    const flatMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false });
    const fenceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.b.map.height; y++) for (let x = 0; x < this.b.map.width; x++) {
      const p = { x, y };
      if (!this.locked(p) || this.b.map.tiles[y][x] === 'wall') continue;
      for (const [dx, dy] of D) {
        const q = { x: x + dx, y: y + dy };
        if (!this.b.grid.inBounds(q) || this.locked(q) || this.b.map.tiles[q.y][q.x] === 'wall') continue;
        const c = this.d.w2v(p, 0.03);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(dx ? 0.2 : 0.96, dx ? 0.96 : 0.2), flatMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(c.x + dx * 0.38, c.y, c.z + dy * 0.38);
        const fence = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.26), fenceMat);
        fence.position.set(c.x + dx * 0.48, c.y + 0.13, c.z + dy * 0.48);
        fence.rotation.y = dx ? Math.PI / 2 : 0;
        fence.userData.zone = this.b.zoneOf(p);
        strip.userData.zone = this.b.zoneOf(p);
        this.fogEdges.add(strip, fence);
      }
    }
  }
  /** 区域解锁：从交界处向内逐格扫开（红闪 → 恢复原色），警戒栏下沉消失 */
  async unlockSweep(zone: string) {
    const cells: Vec[] = [];
    for (let y = 0; y < this.b.map.height; y++) for (let x = 0; x < this.b.map.width; x++) if (this.b.zoneOf({ x, y }) === zone) cells.push({ x, y });
    if (!cells.length) return;
    // BFS 距离：从相邻已解锁（非本区）格出发
    const dist = new Map<string, number>();
    const q: Vec[] = [];
    for (const c of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      if (this.b.grid.inBounds(n) && this.b.zoneOf(n) !== zone && !this.locked(n)) { if (!dist.has(k2(c))) { dist.set(k2(c), 0); q.push(c); } }
    }
    if (!q.length) { dist.set(k2(cells[0]), 0); q.push(cells[0]); }
    while (q.length) {
      const c = q.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (this.b.zoneOf(n) === zone && !dist.has(k2(n))) { dist.set(k2(n), dist.get(k2(c))! + 1); q.push(n); }
      }
    }
    const maxD = Math.max(1, ...dist.values());
    const per = Math.min(60, 700 / maxD);
    for (const e of this.fogEdges.children) if (e.userData.zone === zone) {
      const y0 = e.position.y;
      this.tween(300, (k) => { e.position.y = y0 - k * 0.3; e.scale.setScalar(1 - k * 0.6); }, () => { e.visible = false; });
    }
    const all = cells.map((c) => new Promise<void>((res) => {
      const delay = (dist.get(k2(c)) ?? maxD) * per;
      setTimeout(() => this.tween(320, (k) => this.paintCell(c, 1 - k, Math.sin(Math.min(1, k * 1.6) * Math.PI) * (1 - k)), () => { this.paintCell(c, 0); res(); }), delay);
    }));
    for (const [id, ch] of this.chests) {
      const c = this.b.map.chests!.find((x) => x.id === id)!;
      if (this.b.zoneOf(c.pos) === zone) { ch.g.visible = true; ch.g.scale.setScalar(0.01); const d = (dist.get(k2(c.pos)) ?? 0) * per + 200; setTimeout(() => this.tween(300, (k) => ch.g.scale.setScalar(easeOut(k))), d); }
    }
    await Promise.all(all);
    this.buildFogEdges();
  }

  // ---------- 增援预警 / 喇叭禁区（随状态刷新） ----------
  refresh() {
    if (!this.b) return;
    this.group.remove(this.dyn);
    this.dyn = new THREE.Group();
    this.group.add(this.dyn);
    this.pulses = this.pulses.filter((p) => p.kind === 'bob' || p.kind === 'flag');
    const tex = hatchTexture();
    for (const w of spawnWarnings(this.b)) {
      const g = new THREE.Group();
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.75, depthWrite: false }));
      quad.rotation.x = -Math.PI / 2; quad.position.y = 0.035;
      const frame = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 4), basic(RED, { side: THREE.DoubleSide }));
      frame.rotation.x = -Math.PI / 2; frame.rotation.z = Math.PI / 4; frame.position.y = 0.04;
      const bang = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), basic(WHITE));
      bar.position.y = 0.22;
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), basic(WHITE));
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 3), basic(RED));
      tri.position.y = 0.15; tri.rotation.z = Math.PI;
      bang.add(tri, bar, dot);
      bang.position.y = 1.25; bang.scale.setScalar(1.3);
      g.add(quad, frame, bang);
      g.position.copy(this.d.w2v(w.pos));
      this.dyn.add(g);
      this.pulses.push({ m: frame, kind: 'warn', phase: 0 });
      this.pulses.push({ m: bang, kind: 'bob', base: bang.position.clone(), phase: w.pos.x });
    }
    for (const u of this.b.units) {
      if (u.ko || u.prop !== 'speaker') continue;
      const r = SPEAKER_R;
      const pts = [[r + 0.5, 0], [0, r + 0.5], [-(r + 0.5), 0], [0, -(r + 0.5)]].map(([x, z]) => new THREE.Vector3(x, 0, z));
      const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: RED }));
      const c = this.d.w2v(u.pos, 0.06);
      outline.position.copy(c);
      const wave = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 4), basic(RED, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      wave.rotation.x = -Math.PI / 2; wave.rotation.z = Math.PI / 4;
      wave.position.copy(c);
      this.dyn.add(outline, wave);
      this.pulses.push({ m: wave, kind: 'ring', phase: 0, r: (r + 0.5) * Math.SQRT2 });
    }
  }

  // ---------- 事件 ----------
  /** 处理与地图物件有关的事件；返回 true = 已处理（main 不要 rebuild） */
  async onEvent(e: BattleEvent): Promise<boolean> {
    switch (e.type) {
      case 'door': await this.animDoor(e.id, e.open); return true;
      case 'switch': await this.animSwitch(e.id); return true;
      case 'chest': await this.animChest(e.chestId); return true;
      case 'zoneUnlocked': await this.unlockSweep(e.zone); return true;
      default: return false;
    }
  }
  reset() { this.toggled.clear(); }

  // ---------- 动画 ----------
  tween(dur: number, fn: (k: number) => void, done?: () => void) {
    return new Promise<void>((res) => { this.tweens.push({ t0: performance.now(), dur, fn, done: () => { done?.(); res(); } }); });
  }
  update(now = performance.now()) {
    if (document.body.classList.contains('frozen')) return;
    const finished = new Set<Tween>();
    for (const t of [...this.tweens]) {
      const k = Math.min(1, (now - t.t0) / t.dur);
      t.fn(k);
      if (k >= 1) { finished.add(t); t.done?.(); }
    }
    this.tweens = this.tweens.filter((t) => !finished.has(t));
    const s = now / 1000;
    for (const p of this.pulses) {
      if (p.kind === 'warn') { const k = 0.5 + 0.5 * Math.sin(s * 6); p.m.scale.setScalar(1 + 0.12 * k); ((p.m as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(k > 0.5 ? RED : WHITE); }
      else if (p.kind === 'bob' && p.base) p.m.position.y = p.base.y + 0.05 + Math.sin(s * 3 + p.phase) * 0.05;
      else if (p.kind === 'ring' && p.r) { const k = (s * 0.7) % 1; p.m.scale.setScalar(0.3 + k * p.r); ((p.m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k); }
    }
  }
}
