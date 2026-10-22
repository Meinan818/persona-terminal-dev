// 扫描 skins/<id>/audio/{bgm,se,voice}/ 下的实际音频文件，生成 present.json。
// 运行时只请求 present.json 里存在的文件，缺文件静默，不产生 404。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SKINS_DIR = path.join(ROOT, 'src', 'umbra', 'skins');
const AUDIO_EXTS = new Set(['.opus', '.m4a', '.aac', '.ogg', '.mp3', '.wav']);

const skinIds = fs.readdirSync(SKINS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== '__tests__')
  .map((entry) => entry.name)
  .sort();

for (const skinId of skinIds) {
  const audioDir = path.join(SKINS_DIR, skinId, 'audio');
  if (!fs.existsSync(audioDir)) continue;
  const files = [];
  for (const sub of ['bgm', 'se', 'voice']) {
    const dir = path.join(audioDir, sub);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (AUDIO_EXTS.has(path.extname(file).toLowerCase())) {
        files.push(`${sub}/${file}`);
      }
    }
  }
  files.sort();
  const present = { skin: skinId, files };
  fs.writeFileSync(path.join(audioDir, 'present.json'), `${JSON.stringify(present, null, 2)}\n`);
  console.log(`[present] ${skinId}: ${files.length} files`);
}
