#!/usr/bin/env bash
# r14：原版技能特效贴图 + 召唤 Persona（Codex batch-05 skills_arsene，私用不入库）
#   skills.csv UseEffect：Zio=[10300,30100]、Garu=[10300,30200]、Eiha=[10300,30000]（10300 = 共通召唤/命中层：Fire_5x2 蓝焰 + flash_tex00/01）
#   → public/p5t-fx/skill/*.webp（gitignore，最大 512）；Arsene_Ps1001_000.glb → public/p5t-fx/persona/arsene.glb
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_battle/batch-05/skills_arsene"
DST="public/p5t-fx/skill"; mkdir -p "$DST" public/p5t-fx/persona
python3 - "$SRC/vfx" "$DST" <<'PY'
import sys, glob, os
from PIL import Image
src, dst = sys.argv[1:3]
for f in sorted(glob.glob(f'{src}/*/textures/*.png')):
    grp = f.split('/')[-3]; n = os.path.basename(f).split('__')[1]
    o = f'{dst}/{grp}_{n}.webp'
    im = Image.open(f).convert('RGBA')
    if max(im.size) > 512: im.thumbnail((512, 512))
    im.save(o, 'WEBP', quality=90, method=6, exact=True)
    print('ok', o, im.size)
PY
cp -f "$SRC/Arsene/Arsene_Ps1001_000.glb" public/p5t-fx/persona/arsene.glb && echo ok arsene.glb
# r16：队员人格面具（Codex batch-10 personas，原版模型+SkillActStart/Loop/SpecialACut 动作，私用不入库）
P10="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_battle/batch-10/personas"
for pair in kidd:Captain_Kidd/Captain_Kidd_Ps1002_000 zorro:Zorro/Zorro_Ps1003_000 carmen:Carmen/Carmen_Ps1004_000 goemon:Goemon/Goemon_Ps1005_000 \
            johanna:Johanna/Johanna_Ps1006_000 milady:Milady/Milady_Ps1007_000 robin:Robin_Hood/Robin_Hood_Ps1009_000 cendrillon:Cendrillon/Cendrillon_Ps1010_000 ernesto:Ernesto/Ernesto_Ps1021_000; do
  k=${pair%%:*}; f=${pair#*:}
  if [ -f "$P10/$f.glb" ]; then cp -f "$P10/$f.glb" "public/p5t-fx/persona/$k.glb" && echo "ok $k.glb"; else echo "miss $k ($f)"; fi
done
# r16：Bufu 030400 的 Star/Crunch 输出贴图是外部引用（typetree NamedObject FileID 3，名字不在本 bundle）→ 借用同系 eff_030499 的同名候选（推测）
SFX="${UMBRA_ASSETS:-$(cd ../../.. && pwd)/umbra-assets}/p5t/1_battle/skill_fx/textures"
python3 - "$SFX" "$DST" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1:3]
for a, b in [('eff_030499__Star_flare.png', 'bufu_Star_flare'), ('eff_030499__bufu_alphacrunch.png', 'bufu_alphacrunch')]:
    im = Image.open(f'{src}/{a}').convert('RGBA'); im.save(f'{dst}/{b}.webp', 'WEBP', quality=90, method=6, exact=True); print('ok', b)
PY
