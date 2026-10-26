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
const ITEMS: Record<CmdKey, { act: string; btn: 'Y' | 'X' | 'A'; en: string; zh: string; x: number; y: number; w: number; h: number; boxW: number; boxH: number }> = {
  // x/y = 可见牌中心相对头顶（px@720）；w/h = 帧上可见牌尺寸；boxW/H = prefab bg 尺寸 ×0.5 ×(720/1080)
  // r13：按 command_3456 重新量（Joker 头顶 ≈ (632,362)：PERSONA 牌中心 (795,378)、GUN (752,440)、SWORD (800,505)）→ 牌左尖贴住角色右肩
  persona: { act: 'skill', btn: 'Y', en: 'PERSONA', zh: '使用技能', x: 148, y: 16, w: 205, h: 70, boxW: 240, boxH: 83 },
  gun: { act: 'gun', btn: 'X', en: 'GUN', zh: '举枪瞄准', x: 106, y: 78, w: 170, h: 55, boxW: 206, boxH: 64 },
  sword: { act: 'melee', btn: 'A', en: 'SWORD', zh: '近战武器攻击', x: 152, y: 143, w: 200, h: 60, boxW: 242, boxH: 99 },
};
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
        const tex0 = p5.has(`cmd_${k}`) ? p5.url(`cmd_${k}`) : CMD_TEX[k], tex = tex0 ? new URL(tex0, location.href).href : null, bt = CMD_TEX[`btn${it.btn}` as const];
        return `<div class="cp ${k}${sel === it.act ? ' sel' : ''}${tex ? ' tex' : ''}" data-act="${it.act}" style="--x:${it.x};--y:${it.y};--w:${it.w};--h:${it.h};--bw:${it.boxW};--bh:${it.boxH}${tex ? `;--tex:url(${tex})` : ''}">
          <i class="btn b${it.btn}"${bt ? ` style="background-image:url(${bt})"` : ''}>${bt ? '' : it.btn}</i><b data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#ffffff" data-out="#000000" data-ow="0.3" data-sp="-6">${it.en}</b><small>${it.zh}</small><em class="ph">待原版贴图</em></div>`;
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
