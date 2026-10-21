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
  if (!Array.isArray(recipe.tracks)) fail(`recipe tracks 非法：${recipe.id}`);
  for (const track of recipe.tracks) {
    if (!(track.at >= 0)) fail(`track at 非法：${recipe.id}`);
    if (track.at + (track.dur ?? 0) > recipe.duration) {
      fail(`track 超出 duration：${recipe.id}`);
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
