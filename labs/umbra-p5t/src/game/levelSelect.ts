// Q12 关卡选择（最简按钮列表，Hark 之后美化）。逻辑部分（列表/存档）纯函数可测；DOM 部分只建按钮。
import { LEVEL_JSON, levelMap } from './levels';
import { isUnlocked, loadSave, recordResult, writeSave, type KV, type SaveData } from './save';
import type { Battle } from '../rules/battle';
import type { MapDef } from '../rules/types';

export interface LevelEntry { id: string; name: string; objective: string; stars: number; cleared: boolean; unlocked: boolean }

export function levelEntries(save: SaveData): LevelEntry[] {
  const ids = LEVEL_JSON.map((l) => l.id);
  return LEVEL_JSON.map((l) => ({
    id: l.id, name: l.name, objective: l.objective ?? '',
    stars: save.levels[l.id]?.stars ?? 0, cleared: !!save.levels[l.id]?.cleared, unlocked: isUnlocked(save, ids, l.id),
  }));
}

/** 战斗结束时把结果（星/回合/宝箱）写进存档 */
export function trackResult(b: Battle, levelId: string, store?: KV | null) {
  return b.on((e) => {
    if (e.type !== 'result') return;
    const s = loadSave(store);
    recordResult(s, levelId, { outcome: e.outcome, turn: e.turn, crowns: e.crowns, loot: b.loot });
    writeSave(s, store);
  });
}

export interface LevelSelectOptions {
  /** 宿主开一局：传入生成 MapDef 的函数，返回新建的 Battle（用来记存档） */
  onPick: (make: () => MapDef, id: string) => Battle;
  parent?: HTMLElement;
  store?: KV | null;
  /** 开发期：未解锁的关也能点（缺省 true；正式版改 false） */
  allowLocked?: boolean;
}

/** 在页面左上角（地图下拉框下面）放一个「关卡」按钮，点开是 L01–L10 按钮列表 */
export function mountLevelSelect(o: LevelSelectOptions): HTMLElement {
  const doc = document;
  const root = doc.createElement('div');
  root.id = 'level-select';
  root.style.cssText = 'position:fixed;left:8px;top:48px;z-index:50;font-size:14px';
  const toggle = doc.createElement('button');
  toggle.textContent = '关卡';
  const list = doc.createElement('div');
  list.style.cssText = 'display:none;flex-direction:column;gap:4px;margin-top:4px;background:#000c;padding:6px';
  toggle.onclick = () => { list.style.display = list.style.display === 'none' ? 'flex' : 'none'; if (list.style.display === 'flex') render(); };
  const render = () => {
    list.innerHTML = '';
    for (const l of levelEntries(loadSave(o.store))) {
      const btn = doc.createElement('button');
      btn.dataset.level = l.id;
      btn.textContent = `${l.id} ${l.name}  ${'★'.repeat(l.stars)}${'☆'.repeat(3 - l.stars)}${l.unlocked ? '' : ' 🔒'}`;
      btn.title = l.objective;
      btn.disabled = !l.unlocked && o.allowLocked === false;
      btn.onclick = () => {
        list.style.display = 'none';
        const b = o.onPick(() => levelMap(l.id), l.id);
        trackResult(b, l.id, o.store);
      };
      list.appendChild(btn);
    }
  };
  root.append(toggle, list);
  (o.parent ?? doc.body).appendChild(root);
  return root;
}
