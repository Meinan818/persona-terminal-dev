import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKIN_ID = process.argv[2];

const fail = (message) => {
  console.error(`[skin:check] ${message}`);
  process.exit(1);
};

if (!SKIN_ID) fail('用法：node scripts/skin-check.mjs <skinId>');

const skinDir = path.join(ROOT, 'src', 'umbra', 'skins', SKIN_ID);
const indexFile = path.join(skinDir, 'index.ts');
const packFile = path.join(skinDir, 'pack.json');

if (!fs.existsSync(indexFile)) fail(`缺少 ${indexFile}`);
if (!fs.existsSync(packFile)) fail(`缺少 ${packFile}`);

const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
if (pack.id !== SKIN_ID) fail(`pack.id 与皮肤目录不一致：${pack.id} / ${SKIN_ID}`);
if (pack.handlers) fail('皮肤包禁止 handlers 字段');
if (!Array.isArray(pack.manifest?.assets)) fail('manifest.assets 必须是数组');
if (!Array.isArray(pack.recipes)) fail('recipes 必须是数组');

// 与 src/umbra/skins/_contract/recipe.ts / src/umbra/director.ts CAPS 对齐。
const EVENT_NAMES = new Set([
  'scene:enter','scene:leave','battle:start','turn:start','action','unit:down','onemore','highlight','holdup','allout',
  'talk:start','talk:result','battle:end','map:move','map:encounter','ui:open','ui:close','env:change',
  'baton','persona:switch','shield:break','levelup','card:pick','buff:grant','boss:phase','fusion:result',
  'shop:enter','shop:exit','party:switch','bond:assist','ailment:apply','ailment:cure','escape','velvet:alarm',
  'fusion:accident','callingcard:send','explore:scan','achievement:unlock','persona:levelup','bond:rankup','bgm:cue',
  'holdup:result','explore:move','explore:cover','explore:spotted','explore:interact',
  'ui:cursor','ui:confirm','ui:cancel','ui:page','ui:error','item:get','money:get','shop:buy','skill:learn',
  'unit:spawn','unit:flee','unit:revive','unit:lowhp','intent:show','navi:scan','explore:sneak','alert:change',
  'explore:exit','boss:intro','run:fail','run:retreat',
]);
const PRIMITIVE_NAMES = new Set([
  'tween','show','hide','sfx','vibrate','title','dim','radialBurst','hitStop','shake','flashSprite','flashScreen',
  'squashHit','particles','afterimage','slashLine','damageNumber','tag','shockwave','rgbSplit','cutin','speedLines',
  'banner','silhouetteDash','freezeFrame','finishCard','totalDamage','slashPanels','maskWipe','blockPush','tvStatic',
  'glassShatter','cardFlip','cardShatter','dateFlip','bakedSwap','portraitDown','skinFilter',
  'summon','personaShow','nameplate','pose','batonPass','showtimeLogo','eyeStrip','onomatopoeia','checkerFloor','ringSplash',
  'comicPanels','duoEntrance','duoStrike','duoTitle','maskRip','camera','holdupRing',
]);
const CAPS = {
  'battle:start': [900, 350], 'turn:start': [300, 100], 'action': [1800, 600], 'action:enemy': [1500, 500],
  'unit:down': [500, 200], 'onemore': [450, 250], 'highlight': [3500, 1200], 'holdup': [1000, 400], 'allout': [3500, 1200],
  'talk:start': [800, 300], 'talk:result': [1200, 400], 'battle:end': [1500, 500], 'scene:enter': [600, 250], 'scene:leave': [600, 250],
  'map:move': [800, 300], 'map:encounter': [900, 350], 'env:change': [600, 250], 'ui:open': [280, 150], 'ui:close': [280, 150],
  'baton': [600, 250], 'persona:switch': [500, 200], 'shield:break': [500, 200], 'levelup': [1000, 400], 'card:pick': [600, 300],
  'buff:grant': [800, 300], 'boss:phase': [2000, 600], 'fusion:result': [3000, 1000],
  'shop:enter:full': [1200, 300], 'shop:enter:short': [500, 300], 'shop:exit': [600, 250], 'party:switch': [500, 200],
  'bond:assist': [800, 300], 'ailment:apply': [400, 150], 'ailment:cure': [400, 150], 'escape': [600, 250], 'velvet:alarm': [800, 300],
  'fusion:accident': [1000, 400], 'callingcard:send': [3000, 1000], 'explore:scan': [400, 200], 'persona:levelup': [800, 300], 'bond:rankup': [1500, 500],
  'holdup:result': [400, 150], 'explore:move:cell': [250, 120], 'explore:cover': [300, 150], 'explore:spotted': [500, 200], 'explore:interact': [400, 200],
  'unit:spawn': [600, 250], 'unit:flee': [600, 250], 'unit:revive': [600, 250], 'explore:sneak:cell': [350, 150], 'explore:exit': [800, 300],
  'boss:intro': [2000, 600], 'run:fail': [1500, 500], 'run:retreat': [1000, 400],
  '__encounterCombo': [1200, 700],
};
const REQUIRED_LABELS = [
  'label.requestBoard','label.heartCard','label.holdup','label.allout','label.onemore','label.highlight','label.rank',
  'label.world','label.dive','label.totalDamage','label.more','label.darkHour','label.baton','label.battleStart',
  'label.finish','result.levelup','tag.WEAK','tag.CRIT','tag.RESIST','tag.MISS','tag.NULL','tag.REPEL','tag.DOWN',
];

const capKey = (ev, p, merges) => (ev === 'map:encounter' && merges?.includes('battle:start')) ? '__encounterCombo'
  : ev === 'action' && p?.side === 'enemy' ? 'action:enemy'
  : ev === 'shop:enter' ? (p?.firstVisitToday ? 'shop:enter:full' : 'shop:enter:short')
  : ev === 'explore:move' ? 'explore:move:cell' : ev === 'explore:sneak' ? 'explore:sneak:cell' : ev;
const wallMs = (recipe) => recipe.duration + (recipe.tracks ?? [])
  .filter((track) => track.prim === 'hitStop')
  .reduce((sum, track) => sum + (track.dur ?? track.args?.ms ?? 0), 0);

for (const count of [1, 2, 3, 4, 5]) {
  if (!Array.isArray(pack.enemyLayouts?.[count])) {
    fail(`enemyLayouts 缺少 ${count} 只敌人站位`);
  }
}

for (const asset of pack.manifest.assets) {
  if (asset.source !== 'official' && asset.source !== 'generated') {
    fail(`素材 source 非法：${asset.id}`);
  }
}

for (const recipe of pack.recipes) {
  if (!(recipe.duration > 0)) fail(`recipe duration 非法：${recipe.id}`);
  if (!EVENT_NAMES.has(recipe.event)) fail(`未知事件名：${recipe.event}（${recipe.id}）`);
  if (!Array.isArray(recipe.tracks)) fail(`recipe tracks 非法：${recipe.id}`);
  for (const track of recipe.tracks) {
    if (!PRIMITIVE_NAMES.has(track.prim)) fail(`未知原语：${track.prim}（${recipe.id}）`);
    if (!(track.at >= 0)) fail(`track at 非法：${recipe.id}`);
    if (track.at + (track.dur ?? 0) > recipe.duration) {
      fail(`track 超出 duration：${recipe.id}`);
    }
  }
  const cap = CAPS[capKey(
    recipe.event,
    { side: recipe.match?.side, firstVisitToday: recipe.match?.skinShopId === undefined ? undefined : false },
    recipe.merges,
  )]?.[0];
  if (cap && wallMs(recipe) > cap) {
    fail(`recipe 墙钟超上限：${recipe.id}（${wallMs(recipe)}ms > ${cap}ms）`);
  }
}

for (const key of REQUIRED_LABELS) {
  if (!pack.labels?.[key]) fail(`缺少必填 label：${key}`);
}

const commandSets = pack.slots?.['hud.command']?.sets ?? {};
for (const [setName, set] of Object.entries(commandSets)) {
  for (const item of set.items ?? []) {
    const hit = item.hit;
    if (!Array.isArray(hit) || hit.length < 4) continue;
    const min = item.main ? 96 : 86;
    if (Number(hit[2]) < min) {
      fail(`hud.command.sets.${setName}.${item.id} 命中区宽度 ${hit[2]} < ${min}`);
    }
  }
}

const source = fs.readFileSync(indexFile, 'utf8');
const ast = ts.createSourceFile(indexFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const visit = (node) => {
  if (ts.isImportDeclaration(node)) {
    const spec = node.moduleSpecifier?.text ?? '';
    if (/\brules\/|\bui\/|@\/store|@\/store\/|\.\.\/\.\.\/\.\./.test(spec)) {
      fail(`非法静态 import：${spec}`);
    }
  }
  if (
    ts.isCallExpression(node)
    && node.expression.kind === ts.SyntaxKind.ImportKeyword
  ) {
    fail('皮肤 index.ts 禁止动态 import()');
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'require') {
    fail('皮肤 index.ts 禁止 require()');
  }
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'glob') {
    fail('皮肤 index.ts 禁止 import.meta.glob');
  }
  ts.forEachChild(node, visit);
};
visit(ast);

const fontsBytes = (pack.manifest.fonts ?? []).reduce((sum, font) => sum + (Number(font.bytes) || 0), 0);
if (fontsBytes > 120 * 1024) fail(`字体超预算：${fontsBytes} bytes`);

console.log(`[skin:check] ${SKIN_ID} OK`);
