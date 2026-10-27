// r19：面部/面具特写探针页（只渲染一个角色，正脸机位；可只显示某个材质）。tools/r19-face-shot.mjs 驱动。
import * as THREE from 'three';
import { preloadChar, makeChar } from '../src/view/p5tChar';
const W = 480, H = 480;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(W, H); renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x40ff40);
scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 2.2)); const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(2, 4, 3); scene.add(sun);
const cam = new THREE.PerspectiveCamera(20, W / H, 0.01, 50);
let rig: any = null;
(window as any).__face = {
  async load(key: string) { if (!(await preloadChar(key))) return false; if (rig) scene.remove(rig.root); rig = makeChar(key); scene.add(rig.root); return true; },
  shot(only: string | null, yaw = 0, dist = 0.9) {
    const r = rig; r.mixer.stopAllAction(); r.cur = null; r.play('Idle', 0); r.setYaw?.(0); r.mixer.update(0.1); r.root.updateMatrixWorld(true);
    const mats: string[] = [];
    r.root.traverse((o: any) => {
      if (!o.isMesh) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of arr) { mats.push(o.name + ':' + (m.name || '?') + (m.visible === false ? '(hid)' : '')); if (only !== null) { if (m.userData.__v === undefined) m.userData.__v = m.visible; m.visible = m.userData.__v && only.split('|').some((k) => (m.name || '').includes(k)) && !o.userData.outline; } else if (m.userData.__v !== undefined) m.visible = m.userData.__v; }
    });
    let head = r.root.getObjectByName('Jnt_C_Head') || null;
    if (!head) r.root.traverse((o: any) => { if (!head && /Head/i.test(o.name) && o.isBone) head = o; });
    const hp = head ? head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, r.height * 0.8, 0);
    const c = hp.clone().add(new THREE.Vector3(0, -0.01, 0));
    cam.position.set(c.x + Math.sin(yaw) * dist, c.y + 0.02, c.z + Math.cos(yaw) * dist); cam.lookAt(c);
    renderer.render(scene, cam);
    return { head: head?.name, mats };
  },
};
(window as any).__faceReady = true;
