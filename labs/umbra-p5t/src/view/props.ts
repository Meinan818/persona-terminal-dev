// 物件单位的造型（Hark 美术区）：敌方红旗、喇叭。P5T 红/黑/白，程序几何。
import * as THREE from 'three';

const RED = 0xe60012, BLACK = 0x0d0d0f, WHITE = 0xf4f4f4;
const std = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });

let flagTex: THREE.CanvasTexture | null = null;
/** 红底旗面 + 黑色锯齿边 + 白色 P5 式星徽 */
function flagTexture() {
  if (flagTex) return flagTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 80;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e60012'; g.fillRect(0, 0, 128, 80);
  g.fillStyle = '#0d0d0f';
  g.beginPath(); g.moveTo(128, 0); for (let i = 0; i <= 8; i++) g.lineTo(i % 2 ? 116 : 128, i * 10); g.lineTo(128, 80); g.closePath(); g.fill();
  g.fillRect(0, 0, 128, 6); g.fillRect(0, 74, 128, 6);
  g.save(); g.translate(56, 40); g.rotate(-0.15);
  g.fillStyle = '#0d0d0f';
  const star = (r: number) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star(30); g.fillStyle = '#f4f4f4'; star(22);
  g.restore();
  flagTex = new THREE.CanvasTexture(c);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  return flagTex;
}

export function makeFlag(g: THREE.Group) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.12, 6), std(BLACK));
  base.position.y = 0.06;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 6), std(RED, { emissive: RED, emissiveIntensity: 0.4 }));
  ring.position.y = 0.13;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.75, 8), std(WHITE, { metalness: 0.3 }));
  pole.position.y = 0.95;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6), std(RED, { emissive: RED, emissiveIntensity: 0.3 }));
  tip.position.y = 1.9;
  // 旗面：细分平面，每帧顶点波动（waveFlag）
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5, 10, 4), new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(0.42, 1.55, 0);
  cloth.name = 'cloth';
  cloth.geometry.userData.rest = (cloth.geometry.attributes.position.array as Float32Array).slice();
  g.add(base, ring, pole, tip, cloth);
  g.rotation.y = Math.PI / 4; // 旗面正对默认镜头
}
export function waveFlag(g: THREE.Object3D, t: number) {
  const cloth = g.getObjectByName('cloth') as THREE.Mesh | undefined;
  if (!cloth) return;
  const rest = cloth.geometry.userData.rest as Float32Array | undefined;
  if (!rest) return;
  const pos = cloth.geometry.attributes.position;
  const a = pos.array as Float32Array;
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3] + 0.4; // 0 = 旗杆侧
    a[i * 3 + 2] = Math.sin(t * 4 + x * 7) * 0.07 * x;
    a[i * 3 + 1] = rest[i * 3 + 1] - x * x * 0.08;
  }
  pos.needsUpdate = true;
}

export function makeSpeaker(g: THREE.Group) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), std(BLACK));
  base.position.y = 0.06;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), std(0x2a2a2e));
  post.position.y = 0.55;
  const g2 = new THREE.Group();
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.1, 0.5, 14, 1, true), std(WHITE, { side: THREE.DoubleSide }));
  horn.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 18), std(RED, { emissive: RED, emissiveIntensity: 0.5 }));
  rim.position.z = 0.25;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), std(BLACK));
  back.rotation.x = Math.PI / 2; back.position.z = -0.3;
  g2.add(horn, rim, back);
  g2.position.set(0, 1.08, 0.05);
  g2.rotation.x = 0.25;
  g2.name = 'horn';
  // 第二只喇叭朝另一侧
  const g3 = g2.clone(); g3.rotation.y = Math.PI; g3.position.z = -0.05;
  g.add(base, post, g2, g3);
}
export function pulseSpeaker(g: THREE.Object3D, t: number) {
  g.children.forEach((c) => { if (c.name === 'horn') c.scale.setScalar(1 + Math.max(0, Math.sin(t * 6)) * 0.08); });
}
