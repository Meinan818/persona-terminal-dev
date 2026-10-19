import {
  ARCANA_LABELS,
  PERSONAS,
  createCompendium,
  fuse,
  itemize,
  lockdown,
  register,
  sacrifice,
  withdraw,
} from './velvet-rules.js';
import { ITEM_DEFS } from './economy-rules.js';

const root = document.querySelector('#velvet');
const warden = document.querySelector('#warden-line');

let roster = Object.values(PERSONAS).map(persona => ({ ...persona, stats: { ...persona.stats }, skills: [...persona.skills] }));
let selected = [];
let inherit = [];
let compendium = createCompendium();
let wallet = { money: 8000 };
let result = null;
let log = ['看守把一串钥匙放在桌上。今天可以处置这些面具。'];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = id => ARCANA_LABELS[id] ?? id;
const skillText = persona => (persona.skillNames?.length ? persona.skillNames : persona.skills).join(' / ');
const elementText = persona => persona.elementLabel ?? persona.element;
const selectedPersonas = () => selected.map(id => roster.find(p => p.id === id)).filter(Boolean);

function say(line) {
  warden.textContent = `“${line}”`;
}

function personaCard(persona) {
  return `<button class="persona ${selected.includes(persona.id) ? 'selected' : ''}" data-persona="${persona.id}">
    <h3>${esc(persona.name)}</h3>
    <div class="meta"><span class="tag">${esc(label(persona.arcana))}</span><span class="tag red">Lv.${persona.level}</span><span class="tag">${esc(elementText(persona))}</span></div>
    <small>${esc(skillText(persona))}</small>
  </button>`;
}

function fusionPanel() {
  const pair = selectedPersonas();
  const pool = pair.length === 2 ? [...new Set(pair.flatMap(persona => persona.skills))] : [];
  return `<section class="panel"><h2>双体合成 / FUSION</h2><p>选两个面具，把它们关进同一间牢房。技能最多继承 4 个。</p>
    <div class="fusion-box">
      <div class="fusion-slots"><div class="slot ${pair[0] ? 'filled' : ''}">${pair[0] ? esc(pair[0].name) : '选择第一个'}</div><b>×</b><div class="slot ${pair[1] ? 'filled' : ''}">${pair[1] ? esc(pair[1].name) : '选择第二个'}</div></div>
      ${pool.length ? `<div class="skills">${pool.map(skill => `<label><input type="checkbox" data-inherit="${skill}" ${inherit.includes(skill) ? 'checked' : ''}>${esc(skill)}</label>`).join('')}</div>` : ''}
      <div class="btn-row"><button class="primary" data-action="fuse" ${pair.length === 2 ? '' : 'disabled'}>合成</button><button data-action="clear" ${selected.length ? '' : 'disabled'}>取消选择</button><button class="danger" data-action="gallows" ${pair.length === 2 ? '' : 'disabled'}>绞刑 · 献祭升级</button></div>
    </div>
    ${result ? resultCard() : ''}
  </section>`;
}

function resultCard() {
  const persona = result.persona;
  return `<div class="result"><h3>${esc(persona.name)}</h3><p>${esc(label(persona.arcana))} · Lv.${persona.level} · ${esc(elementText(persona))}</p><div class="statline"><span>HP <b>${persona.stats.hp}</b></span><span>SP <b>${persona.stats.sp}</b></span><span>攻 <b>${persona.stats.attack}</b></span><span>防 <b>${persona.stats.defense}</b></span></div><p>技能：${esc(skillText(persona))}</p><div class="btn-row"><button class="primary" data-action="register">登记图鉴</button><button data-action="keep">加入名册</button></div></div>`;
}

function executionPanel() {
  const one = selectedPersonas()[0];
  return `<section class="panel"><h2>处刑 / EXECUTION</h2><p>电椅把面具变成材料；禁闭把面具关起来训练。选中一个面具后执行。</p>
    <div class="btn-row">
      <button class="danger" data-action="electric" ${one ? '' : 'disabled'}>电椅 · 物品化</button>
      <button data-action="lockdown-hp" ${one ? '' : 'disabled'}>禁闭 · HP</button>
      <button data-action="lockdown-sp" ${one ? '' : 'disabled'}>禁闭 · SP</button>
      <button data-action="lockdown-attack" ${one ? '' : 'disabled'}>禁闭 · 攻</button>
      <button data-action="lockdown-defense" ${one ? '' : 'disabled'}>禁闭 · 防</button>
    </div>
    ${one ? `<p style="margin-top:10px">当前选中：${esc(one.name)}</p>` : ''}
  </section>`;
}

function compendiumPanel() {
  return `<section class="panel"><h2>图鉴 / COMPENDIUM</h2><p>登记过的面具可以花 ¥ 取回。取回费用 = 等级 × 300。</p>
    <div class="compendium">${compendium.entries.length ? compendium.entries.map(persona => `<button data-withdraw="${persona.id}"><span>${esc(persona.name)} · Lv.${persona.level}</span><b>¥${persona.level * 300}</b></button>`).join('') : '<p>图鉴还是空的。</p>'}</div>
  </section>`;
}

function logPanel() {
  return `<section class="panel"><h2>看守记录 / LOG</h2><div class="log">${log.map(line => `<p>${esc(line)}</p>`).join('')}</div><div class="btn-row"><span style="font-size:11px;color:var(--muted)">钱包 ¥${wallet.money}</span></div></section>`;
}

function render() {
  root.innerHTML = `<section class="panel"><h2>囚室名册 / ROSTER</h2><p>点两个面具进行合成；点一个面具进行处刑或禁闭。</p><div class="roster">${roster.map(personaCard).join('')}</div></section>
    <div style="display:grid;gap:12px">${fusionPanel()}${executionPanel()}${compendiumPanel()}${logPanel()}</div>`;
}

function addLog(text) {
  log.push(text);
  if (log.length > 40) log.shift();
}

root.addEventListener('click', event => {
  const personaNode = event.target.closest('[data-persona]');
  if (personaNode) {
    const id = personaNode.dataset.persona;
    if (selected.includes(id)) selected = selected.filter(item => item !== id);
    else if (selected.length < 2) selected.push(id);
    inherit = [];
    result = null;
    render();
    return;
  }
  const checkbox = event.target.closest('[data-inherit]');
  if (checkbox) {
    const skill = checkbox.dataset.inherit;
    inherit = checkbox.checked
      ? [...new Set([...inherit, skill])].slice(0, 4)
      : inherit.filter(item => item !== skill);
    render();
    return;
  }
  const withdrawNode = event.target.closest('[data-withdraw]');
  if (withdrawNode) {
    const got = withdraw(compendium, withdrawNode.dataset.withdraw, wallet);
    if (!got.ok) {
      addLog(got.reason);
    } else {
      roster.push(got.persona);
      addLog(`从图鉴取回 ${got.persona.name}（¥${got.cost}）。`);
      say('取回的东西，最好别再弄丢。');
    }
    render();
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  const pair = selectedPersonas();
  if (action === 'clear') {
    selected = [];
    inherit = [];
    result = null;
    render();
    return;
  }
  if (action === 'fuse') {
    const fused = fuse(pair[0].id, pair[1].id, { inherit });
    if (!fused.ok) {
      addLog(fused.reason);
    } else {
      result = fused;
      addLog(`合成 ${pair[0].name} × ${pair[1].name} → ${fused.persona.name}（Lv.${fused.persona.level}，¥${fused.cost}）。`);
      say('两个名字关进同一间牢房，剩下的那个，才是结果。');
    }
    render();
    return;
  }
  if (action === 'register') {
    if (result) {
      register(compendium, result.persona);
      addLog(`${result.persona.name} 已登记进图鉴。`);
      say('名字留下了。下一次，它会记得你。');
      render();
    }
    return;
  }
  if (action === 'keep') {
    if (result) {
      roster.push(result.persona);
      addLog(`${result.persona.name} 已加入名册。`);
      result = null;
      selected = [];
      render();
    }
    return;
  }
  if (action === 'gallows') {
    const sacrificed = sacrifice(pair[0], pair[1]);
    if (!sacrificed.ok) addLog(sacrificed.reason);
    else {
      roster = roster.map(persona => persona.id === pair[0].id ? sacrificed.persona : persona).filter(persona => persona.id !== pair[1].id);
      addLog(`${pair[1].name} 被献祭，${pair[0].name} 升到 Lv.${sacrificed.persona.level}。`);
      say('献祭不是结束，是另一种加法。');
    }
    selected = [];
    result = null;
    render();
    return;
  }
  if (action === 'electric') {
    const item = itemize(pair[0]);
    if (!item.ok) addLog(item.reason);
    else {
      roster = roster.filter(persona => persona.id !== pair[0].id);
      wallet.inventory = wallet.inventory ?? {};
      wallet.inventory[item.itemId] = (wallet.inventory[item.itemId] ?? 0) + item.qty;
      addLog(`${pair[0].name} 坐上电椅，留下 ${item.itemLabel ?? ITEM_DEFS[item.itemId]?.name ?? item.itemId} ×${item.qty}。`);
      say('坐上电椅。别担心，它比你更疼。');
    }
    selected = [];
    result = null;
    render();
    return;
  }
  if (action.startsWith('lockdown-')) {
    const stat = action.slice('lockdown-'.length);
    const trained = lockdown(pair[0], stat);
    if (!trained.ok) addLog(trained.reason);
    else {
      roster = roster.map(persona => persona.id === pair[0].id ? trained.persona : persona);
      addLog(trained.message);
      say('锁上门。等它学会你想要的样子。');
    }
    selected = [];
    result = null;
    render();
  }
});

render();
