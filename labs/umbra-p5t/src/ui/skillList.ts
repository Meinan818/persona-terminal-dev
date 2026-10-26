// r10：P5T 人格面具技能列表（prefab_ui2d_skill_select）。
// 位置：src/ui/data/skill-list-layout.json（tools/gen-skill-list-layout.py 由原版 RectTransform 换算，Unity 画布 1920×1080），
//       按屏高缩放（--cu = 100vh/1080），水平以屏幕中心为基准（原版节点锚点都在画布中心）。
// 文本/数值：src/rules/data/p5t-skill-ui.json（tools/gen-skill-ui.py，原版 skills.csv + 中文 word 表 + conditions 表）。
// 文字样式：原版 TMP 参数（技能名 29 白 / SP 数字 27 #fe78e9 斜体 ×0.8×1.2 / 说明 27 #d3d3d3 / 威力 18 白斜体 ×2×2.8，画布单位）。
// 时序（帧库 INDEX.md 逐 0.1s 量测）：打开 → 立绘滑入 + 面板 0.2s 淡入 → 技能行晚 0.1s 出现；确定/返回 → 瞬间消失。
//
// 贴图：原版 Image.m_Sprite 运行时绑定（prefab 里 serialized_null），Codex 正在导出（HARK-TO-CODEX af38a6c，image/battle/skillcommand）。
//   每个槽位一个短名（SKL_TEX）；tools/fetch-p5t-hud.sh 把导出的 png 以这个短名放进 public/p5t-hud/ 后自动启用（只换文件路径，不改代码）。
//   缺图时 = 最简纯色块占位【待原版贴图】：黑色斜面板 / 红色光标条 / 黑底属性签+色块 / 红色威力条 / 立绘位用原版 party_ Q 版头像代替。
import layout from './data/skill-list-layout.json';
import skillUi from '../rules/data/p5t-skill-ui.json';
import { p5, PORTRAIT } from './p5tHud';
import type { SkillDef, Unit } from '../rules';

type R = { x: number; y: number; w: number; h: number; rot: number };
const LY = layout as unknown as Record<string, R> & { rowPitch: number; rowStagger: number };

export interface SkillUi { id: number; name: string | null; desc: string | null; sp: number | null; power: number; label: string | null; icon: number; range: number; hitType: number; hitParam: number }
const SUI = skillUi as unknown as Record<string, SkillUi>;
/** 游戏技能 → 原版显示数据（按英文名；没有 → null，界面回退到游戏内名字/SP/威力） */
export const skillUiOf = (s: SkillDef): SkillUi | null => SUI[s.name] ?? null;
export const skillNameZh = (s: SkillDef) => skillUiOf(s)?.name ?? s.name;

/** 贴图槽位 → public/p5t-hud 短名【待原版贴图】。icon_<BattleMenuIconType>、chara_<PORTRAIT 名> 同理。 */
export const SKL_TEX = {
  window: 'skl_window', cursor: 'skl_cursor', label: 'skl_label', dmgWin: 'skl_damage_window', dmgIcon: 'skl_damage_icon',
  hpGauge: 'skl_hp_gauge', spGauge: 'skl_sp_gauge', tag: 'skl_name_plate',
} as const;
const tex = (n: string) => (p5.has(n) ? `background:url("${p5.url(n)}") 0 0/100% 100% no-repeat;` : '');
/** 占位色块的属性颜色（只用于【待原版贴图】的图标色块；按原版 BattleMenuIconType 分类，颜色取帧里的图标主色/自定） */
const ICON_COL: Record<number, string> = { 2: '#ff6a1a', 3: '#5fd7ff', 4: '#3fd24a', 5: '#a040ff', 6: '#ffd400', 7: '#ff3df0', 8: '#ff7ad9', 9: '#fff3a0', 10: '#8a8aff', 12: '#4fe08a', 13: '#d0d0d0', 20: '#ffffff' };

/** 画布矩形 → CSS（水平相对屏幕中心，垂直相对屏幕中心，单位 --cu） */
const pos = (r: { x: number; y: number; w?: number; h?: number }) =>
  `left:calc(50vw + ${(r.x - 960).toFixed(1)} * var(--cu));top:calc(50vh + ${(r.y - 540).toFixed(1)} * var(--cu));` +
  (r.w != null ? `width:calc(${r.w.toFixed(1)} * var(--cu));` : '') + (r.h != null ? `height:calc(${r.h.toFixed(1)} * var(--cu));` : '');

/** 父元素内相对位置（画布单位） */
const rel = (r: { x: number; y: number; w?: number; h?: number }) =>
  `left:calc(${r.x.toFixed(1)} * var(--cu));top:calc(${r.y.toFixed(1)} * var(--cu));` + (r.w != null ? `width:calc(${r.w.toFixed(1)} * var(--cu));` : '') + (r.h != null ? `height:calc(${r.h.toFixed(1)} * var(--cu));` : '');

export interface SkillListHooks {
  /** 光标移到某技能（预览范围、转镜头） */
  onHover(id: string): void;
  /** 确定 */
  onPick(id: string): void;
  /** B / 返回 */
  onBack(): void;
}

export class SkillList {
  readonly el: HTMLDivElement;
  private unit: Unit | null = null;
  private skills: SkillDef[] = [];
  private cur = 0;
  private hooks: SkillListHooks;
  open = false;
  constructor(root: HTMLElement, hooks: SkillListHooks) {
    this.hooks = hooks;
    this.el = document.createElement('div');
    this.el.id = 'skill-list';
    this.el.className = 'hidden';
    root.appendChild(this.el);
    this.el.addEventListener('click', (ev) => {
      const t = ev.target as HTMLElement;
      const row = t.closest('[data-i]') as HTMLElement | null;
      if (row) { const i = +row.dataset.i!; if (i === this.cur) this.confirm(); else this.move(i); }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'ArrowUp' || e.key === 'w') { this.move((this.cur + this.skills.length - 1) % this.skills.length); e.preventDefault(); }
      else if (e.key === 'ArrowDown' || e.key === 's') { this.move((this.cur + 1) % this.skills.length); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { this.confirm(); e.preventDefault(); }
      else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'x') { this.hooks.onBack(); e.preventDefault(); }
    });
  }
  get current(): SkillDef | undefined { return this.skills[this.cur]; }
  usable(s: SkillDef) { return !!this.unit && this.unit.sp >= s.sp; }

  show(u: Unit, skills: SkillDef[], selId?: string | null) {
    this.unit = u; this.skills = skills;
    const i = skills.findIndex((s) => s.id === selId);
    this.cur = i >= 0 ? i : Math.max(0, skills.findIndex((s) => u.sp >= s.sp));
    this.render();
    this.el.classList.remove('hidden', 'in');
    void this.el.offsetWidth; // 重新触发入场动画
    this.el.classList.add('in');
    this.open = true;
    this.hooks.onHover(this.skills[this.cur].id);
  }
  /** 原版：确定/返回后 0.1s 内消失，无滑出动画 → 直接隐藏 */
  hide() { this.open = false; this.el.classList.add('hidden'); this.el.classList.remove('in'); }
  private move(i: number) {
    if (i === this.cur) return;
    this.cur = i; this.render(); this.hooks.onHover(this.skills[i].id);
  }
  private confirm() {
    const s = this.skills[this.cur];
    if (!s || !this.usable(s)) return;
    this.hooks.onPick(s.id);
  }

  private render() {
    const u = this.unit!; const pk = PORTRAIT[u.id];
    const L = LY;
    const s = this.skills[this.cur];
    const su = s ? skillUiOf(s) : null;
    // 视口 4 行（Viewport 高 176 = 4×45 − 4），光标固定在第 1 行 → 选中项上方的行滚出（原版 ScrollRect，滚动方式为推断）
    const first = Math.max(0, Math.min(this.cur, this.skills.length - 4));
    const rows = this.skills.slice(first, first + 4).map((sk, k) => {
      const i = first + k; const d = skillUiOf(sk);
      const dx = (i % 2) * L.rowStagger; // 原版 skill_contents 偶/奇行 x 错开 12（左右交替）
      const y = k * L.rowPitch;
      const col = ICON_COL[d?.icon ?? 0] ?? '#999';
      const sp = d?.sp ?? sk.sp;
      return `<div class="sk-row${i === this.cur ? ' sel' : ''}${this.usable(sk) ? '' : ' off'}" data-i="${i}" style="${pos({ x: L.row0.x + dx, y: L.row0.y + y, w: L.row0.w, h: L.row0.h })}">
        <span class="lab" style="${rel({ x: L.label.x - L.row0.x, y: L.label.y - L.row0.y, w: L.label.w, h: L.label.h })}${tex(SKL_TEX.label)}">${p5.has(`icon_${d?.icon}`) ? p5.img(`icon_${d?.icon}`, 'ic') : `<i class="ic" style="background:${col}"></i>`}<em>${d?.label ?? ''}</em></span>
        <span class="nm" style="${rel({ x: L.name.x - L.row0.x, y: 0, h: L.row0.h })}">${d?.name ?? sk.name}</span>
        <span class="cost" style="${rel({ x: L.cost.x - L.row0.x - 20, y: 0, h: L.row0.h })}"><b data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#fe78e9" data-out="#000000" data-ow="0.3" data-sp="-28">${sp}</b><small>SP</small></span>
      </div>`;
    }).join('');
    const cur = this.cur - first;
    const face = pk && p5.has(`chara_${pk}`) ? p5.img(`chara_${pk}`, 'full') : pk && p5.has(`party_${pk}`) ? p5.img(`party_${pk}`, 'stand-in') : '';
    const pct = (n: number, m: number) => `${Math.max(0, Math.min(100, (100 * n) / Math.max(1, m)))}%`;
    this.el.innerHTML = `
      <div class="sk-chara" data-ph="${p5.has(`chara_${pk}`) ? '' : '待原版立绘：暂用原版 party Q 版头像'}" style="${pos(L.chara)}">${face}</div>
      <div class="sk-win" style="${pos(L.window)}${tex(SKL_TEX.window)}"></div>
      <div class="sk-stat">
        <div class="gw" style="${pos({ x: 66, y: 886 })}">${p5.img('word_hp', 'whp')}${p5.img('word_sp', 'wsp')}<b class="nh" data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#68ffe1" data-back="#338776" data-pad="4" data-out="#000000" data-ow="0.3" data-sp="-26">${u.hp}</b>${p5.img('gage_slash', 'sl')}<b class="ns" data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#ef51f8" data-back="#783671" data-pad="3" data-out="#000000" data-ow="0.3" data-sp="-26">${u.sp}</b>
          <i class="bar hp" style="--p:${pct(u.hp, u.maxHp)}"></i><i class="bar sp" style="--p:${pct(u.sp, u.maxSp ?? 1)}"></i></div>
      </div>
      <div class="sk-rows">
        <div class="sk-cursor" style="${pos({ x: L.cursor.x + (this.cur % 2) * L.rowStagger, y: L.cursor.y + cur * L.rowPitch, w: L.cursor.w, h: L.cursor.h })}${tex(SKL_TEX.cursor)}"></div>
        ${rows}
      </div>
      <div class="sk-info">
        <span class="sk-dmg${p5.has(SKL_TEX.dmgWin) ? ' tint' : ''}" style="${pos(L.dmgWin)}">${p5.has(SKL_TEX.dmgWin) ? `<i class="dwbg" style="-webkit-mask:url('${p5.url(SKL_TEX.dmgWin)}') 0 0/100% 100% no-repeat;mask:url('${p5.url(SKL_TEX.dmgWin)}') 0 0/100% 100% no-repeat"></i><small class="dlab">DAMAGE</small>` : ''}${p5.has(SKL_TEX.dmgIcon) ? p5.img(SKL_TEX.dmgIcon, 'di') : '<i class="di"></i>'}<b data-sdf="FOT_YURUKASTD_UB_SDF" data-col="#ffffff" data-out="#000000" data-ow="0.3" data-sp="-25">${su?.power ?? s?.power ?? ''}</b></span>
        <span class="txt" style="${pos({ x: L.info.x, y: L.info.y })}">${(su?.desc ?? '').replace(/\n/g, '<br/>')}</span>
      </div>`;
  }
}
