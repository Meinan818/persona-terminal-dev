// Engine：把舞台、打击感、粒子、单位、皮肤资源装在一起，给原语和 HUD 用。
import { Assets, Container, Rectangle, Sprite, Texture, ColorMatrixFilter } from 'pixi.js';
import type { SkinPack } from '../skins/_contract';
import { Stage } from './stage';
import { Fx } from './fx';
import { Particles } from './particles';
import { UnitNode, updateUnit } from './units';
import { fontsFrom, Fonts, loadFonts, unloadFonts, hex } from './text';
import { TIERS, TierName } from './quality';
import { AudioBus } from './audio';

export class Engine {
  st = new Stage();
  fx!: Fx;
  ps!: Particles;
  skin!: SkinPack;
  base = '';
  tex: Record<string, Texture> = {};
  frames: Record<string, Texture> = {};      // 'atlas.party#joker'
  units = new Map<string, UnitNode>();
  fonts!: Fonts;
  faces: FontFace[] = [];
  tier: TierName = 'high';
  idleT = 0;
  whiteFlash = new ColorMatrixFilter();
  bgSprite?: Sprite;
  sfxLog: string[] = [];
  /** 音频占位接口（AUDIO-MAP §6；缺文件静默） */
  audio = new AudioBus();
  errors: string[] = [];
  /** 固定件缓存（cut-in 带、横幅、定格画…），首次用时创建，之后复用 */
  fix = new Map<string, Container>();

  constructor() { this.whiteFlash.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0]; }

  get tierK() { return TIERS[this.tier].particleK; }
  label(k: string) { return this.skin.labels[k] ?? k; }
  color(k: string): number {
    if (typeof k === 'string' && k.startsWith('@color.')) return hex((this.skin.tokens.color as any)[k.slice(7)] ?? '#ff00ff');
    return hex(k as any);
  }
  font(k: unknown): string {
    if (typeof k === 'string' && k.startsWith('@font.')) return (this.skin.tokens.font as any)[k.slice(6)];
    return (k as string) ?? this.fonts.display;
  }

  /** 只加载当前皮肤（§0.9）；返回后 tex/frames/fonts 可用 */
  async loadSkin(pack: SkinPack, base: string, groups: string[] = []) {
    this.skin = pack; this.base = base;
    this.fonts = fontsFrom(pack.tokens);
    this.faces = await loadFonts(pack.manifest, base);
    void this.audio.init(base);
    const first = pack.manifest.assets.filter((a) => a.firstPack || (a.group && groups.includes(a.group)));
    groups.forEach((g) => this.groupsLoaded.add(g));
    await this.loadAssets(first);
  }
  groupsLoaded = new Set<string>();
  private pending = new Map<string, Promise<void>>();
  private async loadAssets(list: SkinPack['manifest']['assets']) {
    const pack = this.skin, base = this.base;
    const loaded = await Assets.load(list.map((a) => ({ alias: `${pack.id}:${a.id}`, src: base + a.file })));
    for (const a of list) {
      const t = loaded[`${pack.id}:${a.id}`] as Texture;
      this.tex[a.id] = t;
      if (a.frames) for (const [n, f] of Object.entries(a.frames)) this.frames[`${a.id}#${n}`] = new Texture({ source: t.source, frame: new Rectangle(...(f as [number, number, number, number])) });
    }
  }
  /** 懒加载素材组（manifest.assets[].group，如 char:skull / show:mona-panther）；幂等，可并发调用 */
  loadGroup(g: string): Promise<void> {
    if (this.groupsLoaded.has(g)) return Promise.resolve();
    let p = this.pending.get(g);
    if (!p) {
      const list = this.skin.manifest.assets.filter((a) => a.group === g && !this.tex[a.id]);
      p = this.loadAssets(list).then(() => { this.groupsLoaded.add(g); this.pending.delete(g); this.onGroup.forEach((f) => f(g)); });
      this.pending.set(g, p);
    }
    return p;
  }
  onGroup: ((g: string) => void)[] = [];
  /** 当前行动者（$actor 素材解析用） */
  actor = 'joker';
  /** 'char.$actor#cutin' → 'char.skull#cutin' */
  resolve(id: string, actor?: string | Record<string, any>) {
    const p: any = typeof actor === 'object' && actor ? actor : null;
    const act = p ? (p.actorId ?? p.unitId ?? this.actor) : (actor ?? this.actor);
    let s = id.replace(/\$actor/g, act);
    if (p?.finisherId) s = s.replace(/\$finisher/g, p.finisherId === 'joker' ? '__default' : p.finisherId);
    if (p?.pairIds) s = s.replace(/\$a\b/g, p.pairIds[0]).replace(/\$b\b/g, p.pairIds[1]).replace(/\$pair/g, p.pairIds.join('-'));
    return s;
  }
  frame(id: string, actor?: string | Record<string, any>): Texture | undefined { const k = this.resolve(id, actor); return this.frames[k] ?? this.tex[k]; }
  /** 切换皮肤时释放（纹理 destroy + Assets.unload + 字体删除 + 引用清空） */
  async unloadSkin() {
    const ids = this.skin.manifest.assets.map((a) => `${this.skin.id}:${a.id}`);
    for (const k of Object.keys(this.frames)) this.frames[k].destroy(false);
    this.frames = {}; this.tex = {};
    await Assets.unload(ids);
    unloadFonts(this.faces); this.faces = [];
    this.fix.forEach((c) => c.destroy({ children: true })); this.fix.clear();
  }

  getFix<T extends Container>(key: string, make: () => T, layer: Container): T {
    let c = this.fix.get(key) as T | undefined;
    if (!c) { c = make(); c.visible = false; layer.addChild(c); this.fix.set(key, c); }
    return c;
  }

  updateWorld(wdt: number) {
    this.idleT += wdt;
    for (const u of this.units.values()) updateUnit(u, this.idleT, wdt);
    this.ps.update(wdt);
  }
}
