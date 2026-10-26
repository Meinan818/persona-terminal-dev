// r12：原版指令菜单（prefab_ui2d_battle_command / base_command）。
// 位置：贴在当前角色头顶旁、阶梯状右下错开，自上而下 PERSONA / GUN / SWORD（command_1255/2448/3410/3429/3456）。
//  - 顺序与错开方向 = prefab：skill_command_group/pivot (142,45)、gun_command/pivot (40,0)、sword_command/pivot (193,−66)（Unity y 向上），
//    竖向间距按 GameObject/*_guid（skill 402 / gun 309 / sword 192，画布 1920×1080）→ 720 高 62px / 78px；
//  - 相对角色头顶的像素偏移取 command_3456 实测（Joker 头顶 ≈ (630,380)，PERSONA 中心 (817,375)、GUN (765,447)、SWORD (800,510)，1280×720）。
//    prefab 底图 sprite 的可见部分在框内的偏移不知道（贴图 serialized_null，未导出）→ 按帧摆，框尺寸按 prefab bg sizeDelta × base_command 缩放 0.5。
// 出现时序（视频 34:50–34:56 逐 0.1s）：角色站定后各项同时淡入 ≈0.2s；移动中隐藏；走到敌人旁 SWORD 淡入、其余项淡出再一起出现；无逐项错开。
// 贴图：底牌 = 原版 bom01_{persona,gun,sword}_ui（image/battle/operation，fetch-p5t-ui.sh → p5t-hud/cmd_*），按 prefab bg 框尺寸画在牌中心；
// 字样 PERSONA/GUN/SWORD + 小字 是 TMP 文字（字体未全提取 → 系统粗斜体）；按钮圈 prefab_ButtonHelpIcon 贴图不在导出里 → CSS 圈（缺）。
export const CMD_TEX: Record<'persona' | 'gun' | 'sword' | 'btnY' | 'btnX' | 'btnA', string | null> = {
  persona: null, gun: null, sword: null, btnY: null, btnX: null, btnA: null,
};
import { p5 } from './p5tHud';
import { hydrateSdf } from './sdfFont';
export type CmdKey = 'persona' | 'gun' | 'sword';
// r14：按 command_3456 逐像素重量（1280×720，Joker 头顶 ≈ (645,367)；见 tools/r14-cmd-overlay.py 的叠图核对）。
//  - 底牌 = 原版 bom01_*_ui 2160p 贴图 ×1/3（=720/2160）原尺寸、不旋转（倾斜已画在贴图里），左上角相对头顶 box=(x,y)；叠图与原帧重合。
//  - 按钮圆心 btn、英文字样中心 en（宽/字高/旋转）、中文小字中心 zh（宽/字高/旋转）全部取自原帧。
//  - SWORD 始终显示（原版指令牌固定三项；无近战目标时点了进近战选目标模式）。
type Box = { x: number; y: number; w: number; h: number; r: number };
const ITEMS: Record<CmdKey, { act: string; btn: 'Y' | 'X' | 'A'; en: string; zh: string; box: [number, number]; tex: [number, number]; b: [number, number]; E: Box; Z: Box }> = {
  persona: { act: 'skill', btn: 'Y', en: 'PERSONA', zh: '使用技能', box: [35, -37], tex: [712, 244], b: [71, 18], E: { x: 155, y: -7, w: 124, h: 32, r: -12 }, Z: { x: 202, y: 13, w: 76, h: 17, r: -10 } },
  gun: { act: 'gun', btn: 'X', en: 'GUN', zh: '举枪瞄准', box: [-3, 38], tex: [618, 192], b: [45, 65], E: { x: 117, y: 63, w: 74, h: 31, r: -3 }, Z: { x: 120, y: 85, w: 52, h: 14, r: -2 } },
  sword: { act: 'melee', btn: 'A', en: 'SWORD', zh: '近战武器攻击', box: [35, 90], tex: [706, 290], b: [82, 105], E: { x: 165, y: 119, w: 124, h: 33, r: 7 }, Z: { x: 187, y: 146, w: 86, h: 16, r: 12 } },
};
const bx = (B: Box) => `--cx:${B.x};--cy:${B.y};--bw:${B.w};--bh:${B.h};--r:${B.r}deg`;
export class CommandMenu {
  readonly el: HTMLDivElement;
  private shown = '';
  private anchorKey = '';
  constructor(host: HTMLElement, onAct: (act: string) => void) {
    this.el = document.createElement('div'); this.el.id = 'cmd'; this.el.className = 'hud hidden';
    host.appendChild(this.el);
    this.el.addEventListener('click', (ev) => { const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (b) { ev.stopPropagation(); onAct(b.dataset.act!); } });
  }
  /** headX/headY = 角色头顶屏幕像素；keys = 可用指令；anchor = 站位格键（换格则重新淡入） */
  show(headX: number, headY: number, keys: CmdKey[], anchor: string, sel: string | null, pxH: number) {
    const u = pxH / 720;
    this.el.style.setProperty('--u', String(u)); this.el.classList.remove('hidden'); // 先定字号再画 SDF（否则 calc 无 --u → 16px）
    const sig = keys.join(',') + '|' + sel + '|' + u.toFixed(3);
    if (sig !== this.shown || anchor !== this.anchorKey) {
      this.el.innerHTML = keys.map((k) => {
        const it = ITEMS[k];
        const tex0 = p5.has(`cmd_${k}`) ? p5.url(`cmd_${k}`) : CMD_TEX[k], tex = tex0 ? new URL(tex0, location.href).href : null;
        return `<div class="cp ${k}${sel === it.act ? ' sel' : ''}${tex ? ' tex' : ''}" data-act="${it.act}" style="--x:${it.box[0]};--y:${it.box[1]};--w:${it.tex[0] / 3};--h:${it.tex[1] / 3}${tex ? `;--tex:url(${tex})` : ''}">
          <i class="btn b${it.btn}" style="--bx:${it.b[0] - it.box[0]};--by:${it.b[1] - it.box[1]}">${it.btn}</i><b class="en" style="${bx({ ...it.E, x: it.E.x - it.box[0], y: it.E.y - it.box[1] })}" data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#ffffff" data-out="#000000" data-ow="0.25" data-sp="-6">${it.en}</b><small style="${bx({ ...it.Z, x: it.Z.x - it.box[0], y: it.Z.y - it.box[1] })}">${it.zh}</small></div>`;
      }).join('');
      hydrateSdf(this.el); // r13：英文字样 = 原版 TMP 字体 FOT-Yuruka Std UB（umbra-assets p5t/1_ui/fonts/tmp），白字黑描边；字体对应是推断（按字形比对 command_3456）
      this.el.classList.remove('in'); void this.el.offsetWidth; this.el.classList.add('in');
      this.shown = sig; this.anchorKey = anchor;
    }
    this.el.style.setProperty('--u', String(u));
    this.el.style.left = `${headX}px`; this.el.style.top = `${headY}px`;
    this.el.classList.remove('hidden');
  }
  hide() { if (!this.el.classList.contains('hidden')) { this.el.classList.add('hidden'); this.shown = ''; this.anchorKey = ''; } }
}
