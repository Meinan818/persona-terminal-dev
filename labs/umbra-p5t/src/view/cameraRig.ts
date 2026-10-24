// P5T 式镜头（Hark 美术区）：正交俯视，单指拖动平移（限制在地图内）、双指捏合/滚轮缩放（3 档左右，平滑）、
// 双指扭转或 Q/E 按 90° 固定步进旋转（平滑过渡）。所有状态都在「视图坐标」里：
//   ox/oy = 视野中心相对地图中心在相机 right/up 轴上的偏移；zoom = 相对「整图刚好放下」的倍率；yaw = 方位角。
import * as THREE from 'three';

export interface MapBox { width: number; height: number; maxY: number }
interface CamState { ox: number; oy: number; zoom: number; yaw: number }

const DIST = 30;
const PITCH_DIR_Y = 1.25; // 与原 fitCamera 的 (1,1.25,1) 同俯角
const BASE_YAW = Math.PI / 4;

export class CameraRig {
  readonly cam: THREE.OrthographicCamera;
  private box: MapBox = { width: 1, height: 1, maxY: 1.4 };
  private aspect = 1;
  cur: CamState = { ox: 0, oy: 0, zoom: 1, yaw: BASE_YAW };
  tgt: CamState = { ox: 0, oy: 0, zoom: 1, yaw: BASE_YAW };
  /** 旋转时保持不动的地面点（世界坐标）；null = 不在旋转 */
  private pivot: THREE.Vector3 | null = null;
  /** 玩家自己选的缩放（敌方回合推近后回到它） */
  userZoom = 1;
  zMax = 2.6;
  levels: number[] = [1, 1.6, 2.6];
  /** 默认（P5T 式）近景倍率：角色约 50–60px 高（1280×720），地图部分出画 */
  defZoom = 1;
  step = 0; // 当前 90° 步数

  constructor(cam: THREE.OrthographicCamera) { this.cam = cam; }

  get center() { return new THREE.Vector3((this.box.width - 1) / 2, 0, (this.box.height - 1) / 2); }
  private axes(yaw: number) {
    const dir = new THREE.Vector3(Math.sin(yaw), PITCH_DIR_Y, Math.cos(yaw)).normalize();
    // 与 Object3D.lookAt(up=Y) 同算法：right = Y × dir，up = dir × right
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    return { dir, right, up };
  }
  /** 当前 yaw 下整张地图（含高度）投影到视图平面的半宽/半高（已按屏幕比例补齐 + 留边） */
  private fit(yaw: number) {
    const { right, up } = this.axes(yaw);
    const c = this.center, b = this.box;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, z] of [[-0.5, -0.5], [b.width - 0.5, -0.5], [-0.5, b.height - 0.5], [b.width - 0.5, b.height - 0.5]])
      for (const y of [0, b.maxY]) {
        const p = new THREE.Vector3(x, y, z).sub(c);
        const px = p.dot(right), py = p.dot(up);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    const padX = 1.06 + (this.aspect > 1.6 ? 0.12 : 0.04), padY = 1.08;
    let halfW = ((maxX - minX) / 2) * padX, halfH = ((maxY - minY) / 2) * padY;
    if (halfW / halfH < this.aspect) halfW = halfH * this.aspect; else halfH = halfW / this.aspect;
    return { halfW, halfH, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, extW: (maxX - minX) / 2, extH: (maxY - minY) / 2 };
  }

  /** 新地图 / 窗口尺寸变化 */
  setMap(box: MapBox, aspect: number, keepView = false, pxH = 720) {
    this.box = box; this.aspect = aspect;
    const f = this.fit(this.cur.yaw);
    // 默认近景：身高 1.1 格的角色在屏幕上约 px 像素（720 高 ≈ 56px，手机横屏 390 高 ≈ 40px）
    const upY = this.axes(this.cur.yaw).up.y;
    const px = Math.min(58, Math.max(40, pxH * 0.078));
    this.defZoom = Math.max(1, (px * 2 * f.halfH) / (1.1 * upY * pxH));
    // 最大倍率：竖直方向约看见 7 格；至少 1.8 倍，且比默认近景再近一档
    this.zMax = Math.max(1.8, f.halfH / 3.2, this.defZoom * 1.45);
    const mid = Math.sqrt(this.defZoom);
    this.levels = [...new Set([1, mid, this.defZoom, this.zMax].map((z) => +z.toFixed(3)))].sort((a, b) => a - b);
    if (!keepView) {
      this.step = 0;
      this.cur = { ox: f.cx, oy: f.cy, zoom: this.defZoom, yaw: BASE_YAW };
      this.tgt = { ...this.cur };
      this.userZoom = this.cur.zoom;
    }
    this.clamp(this.cur); this.clamp(this.tgt);
    this.apply();
  }

  /** 把视野中心限制在地图投影范围内（放大倍率越高可移动范围越大；整图倍率时锁在中心） */
  private clamp(s: CamState) {
    s.zoom = Math.min(this.zMax, Math.max(1, s.zoom));
    const f = this.fit(s.yaw);
    const hw = f.halfW / s.zoom, hh = f.halfH / s.zoom;
    const slack = 0.6; // 允许边缘多看半格
    // 放大后视野中心可以一直移到地图边缘（大图 32×40 也能看到角落）
    const free = 1 - 1 / s.zoom;
    const rx = Math.max(0, f.extW + slack - hw, f.extW * free), ry = Math.max(0, f.extH + slack - hh, f.extH * free);
    s.ox = Math.min(f.cx + rx, Math.max(f.cx - rx, s.ox));
    s.oy = Math.min(f.cy + ry, Math.max(f.cy - ry, s.oy));
  }

  /** 世界点 → 指定 yaw 下的视图偏移 */
  private viewOf(p: THREE.Vector3, yaw: number) {
    const { right, up } = this.axes(yaw);
    const d = p.clone().sub(this.center);
    return { ox: d.dot(right), oy: d.dot(up) };
  }
  /** 当前屏幕中心落在地面（y=0）上的点 */
  groundAtCenter(s: CamState = this.cur) {
    const { dir, right, up } = this.axes(s.yaw);
    const p = this.center.clone().addScaledVector(right, s.ox).addScaledVector(up, s.oy);
    // 沿视线方向投到 y=0
    const t = p.y / dir.y;
    return p.addScaledVector(dir, -t);
  }

  apply() {
    const s = this.cur;
    const { dir, right, up } = this.axes(s.yaw);
    const f = this.fit(s.yaw);
    const look = this.center.clone().addScaledVector(right, s.ox).addScaledVector(up, s.oy);
    this.cam.position.copy(look).addScaledVector(dir, DIST);
    this.cam.up.copy(up);
    this.cam.lookAt(look);
    const hw = f.halfW / s.zoom, hh = f.halfH / s.zoom;
    this.cam.left = -hw; this.cam.right = hw; this.cam.top = hh; this.cam.bottom = -hh;
    this.cam.updateProjectionMatrix();
    this.cam.updateMatrixWorld();
  }

  /** 每帧：平滑逼近目标 */
  update() {
    const k = 0.16;
    const c = this.cur, t = this.tgt;
    if (this.pivot) {
      c.yaw += (t.yaw - c.yaw) * k;
      if (Math.abs(t.yaw - c.yaw) < 0.002) { c.yaw = t.yaw; }
      const v = this.viewOf(this.pivot, c.yaw);
      c.ox = v.ox; c.oy = v.oy;
      if (c.yaw === t.yaw) { const vt = this.viewOf(this.pivot, t.yaw); t.ox = vt.ox; t.oy = vt.oy; this.clamp(t); this.pivot = null; }
    } else {
      c.ox += (t.ox - c.ox) * k; c.oy += (t.oy - c.oy) * k;
    }
    c.zoom += (t.zoom - c.zoom) * k;
    this.apply();
  }
  get rotating() { return !!this.pivot; }

  /** 拖动平移：屏幕像素位移（立即生效，目标同步） */
  panPixels(dx: number, dy: number, screenW: number, screenH: number) {
    const hw = this.cam.right - this.cam.left, hh = this.cam.top - this.cam.bottom;
    this.cur.ox -= (dx / screenW) * hw; this.cur.oy += (dy / screenH) * hh;
    this.clamp(this.cur);
    this.tgt.ox = this.cur.ox; this.tgt.oy = this.cur.oy;
    this.apply();
  }
  /** 缩放：factor > 1 放大；可选屏幕锚点（NDC），让手指下的点不动 */
  zoomBy(factor: number, ndc?: { x: number; y: number }, instant = false) {
    const z0 = this.tgt.zoom;
    const z1 = Math.min(this.zMax, Math.max(1, z0 * factor));
    if (ndc) {
      const f = this.fit(this.tgt.yaw);
      // 锚点在视图平面的位置不变：o' = o + a*(hw0 - hw1)
      this.tgt.ox += ndc.x * (f.halfW / z0 - f.halfW / z1);
      this.tgt.oy += ndc.y * (f.halfH / z0 - f.halfH / z1);
    }
    this.tgt.zoom = z1; this.userZoom = z1;
    this.clamp(this.tgt);
    if (instant) { this.cur.zoom = this.tgt.zoom; this.cur.ox = this.tgt.ox; this.cur.oy = this.tgt.oy; this.apply(); }
  }
  /** 滚轮：在 3 档之间步进 */
  zoomStep(dir: 1 | -1, ndc?: { x: number; y: number }) {
    const z = this.tgt.zoom;
    const next = dir > 0 ? this.levels.find((l) => l > z + 0.05) ?? this.zMax : [...this.levels].reverse().find((l) => l < z - 0.05) ?? 1;
    this.zoomBy(next / z, ndc);
  }
  /** 捏合结束：吸附到最近一档 */
  snapZoom() {
    const z = this.tgt.zoom;
    const best = this.levels.reduce((a, b) => (Math.abs(Math.log(b / z)) < Math.abs(Math.log(a / z)) ? b : a));
    this.zoomBy(best / z);
  }
  /** 全图 ⇄ 默认近景（近景时对准 p） */
  toggleOverview(p?: { x: number; y: number; z: number } | null) {
    if (this.tgt.zoom > 1.05) { this.userZoom = 1; this.focus(null, 1); }
    else { this.userZoom = this.defZoom; this.focus(p ?? null, this.defZoom); }
  }
  /** 90° 步进旋转（+1 = 顺时针） */
  rotate(dir: 1 | -1) {
    if (!this.pivot) this.pivot = this.groundAtCenter(this.tgt);
    this.step = (this.step + dir + 4) % 4;
    this.tgt.yaw += dir * (Math.PI / 2);
  }
  /** 对准世界点；zoom 缺省 = 保持玩家倍率 */
  focus(p: { x: number; y: number; z: number } | null, zoom?: number) {
    if (!p) {
      const f = this.fit(this.tgt.yaw);
      this.tgt.ox = f.cx; this.tgt.oy = f.cy; this.tgt.zoom = this.userZoom; this.clamp(this.tgt); return;
    }
    const v = this.viewOf(new THREE.Vector3(p.x, p.y, p.z), this.tgt.yaw);
    this.tgt.ox = v.ox; this.tgt.oy = v.oy;
    this.tgt.zoom = zoom ?? this.userZoom;
    this.clamp(this.tgt);
  }
  /** 框住一组世界点（Triple Threat 三角）：中心对准包围盒，倍率取刚好放下（pad = 留边比例），不改 userZoom */
  fitPoints(ps: { x: number; y: number; z: number }[], pad = 1.5) {
    if (!ps.length) return;
    const f = this.fit(this.tgt.yaw);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ps) {
      const v = this.viewOf(new THREE.Vector3(p.x, p.y, p.z), this.tgt.yaw);
      minX = Math.min(minX, v.ox); maxX = Math.max(maxX, v.ox); minY = Math.min(minY, v.oy); maxY = Math.max(maxY, v.oy);
    }
    const ew = Math.max(1.5, (maxX - minX) / 2 * pad), eh = Math.max(1.2, (maxY - minY) / 2 * pad);
    this.tgt.ox = (minX + maxX) / 2; this.tgt.oy = (minY + maxY) / 2 + eh * 0.12; // 略往上：下方留给切入带
    this.tgt.zoom = Math.min(f.halfW / ew, f.halfH / eh);
    this.clamp(this.tgt);
  }
  /** 存 / 取目标镜头（演出结束后回到演出前） */
  saveTarget() { return { ...this.tgt }; }
  restoreTarget(s: CamState) { this.tgt = { ...s, yaw: this.tgt.yaw }; this.clamp(this.tgt); }
  /** 世界点是否在当前画面里（留 margin 比例） */
  inView(p: THREE.Vector3, margin = 0.15) {
    const v = p.clone().project(this.cam);
    return Math.abs(v.x) < 1 - margin && Math.abs(v.y) < 1 - margin;
  }
}
