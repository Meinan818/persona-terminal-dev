# UMBRA 四皮皮肤包 v1 · 给 App 的合并说明

分支：`origin/feat/umbra-skins-v1`（基于 `feat/theme-kit-integration@350e798`，提交 `2e182f7`）
对象：`feat/umbra-app-m2`（已验证 HEAD `3e93e13`）
内容：`src/umbra/skins/{p5r-red,p3-blue,p3r-pink,p4-yellow}/` + `tools/umbra-skins/build_packs.py` + `src/umbra/skins/__tests__/skinPacks.test.ts`。
不改 App 已有的任何文件（contract.ts / loaders.ts / registry.ts / themeLoader.ts / skin-check.mjs 都原样不动）。

## 1. 合并步骤（在 App 工作目录）

```bash
git fetch origin
git checkout feat/umbra-app-m2
git merge --no-ff origin/feat/umbra-skins-v1 -m "merge: 四皮皮肤包 v1"
```

已在独立 worktree 里试合并：**0 冲突**（merge-base 就是 350e798，App 分支已含这些文档，本次只新增文件）。

## 2. 验证命令（合并后，全部已实测通过）

```bash
for s in p5r-red p3-blue p3r-pink p4-yellow; do npm run skin:check -- $s; done   # 四个都打印 [skin:check] <id> OK
npx tsc --noEmit                                                                 # exit 0，无输出
npx vitest run src/umbra --exclude "src/umbra/balance/**"                        # 31 个文件 / 147 个测试全过（含新增 skinPacks 28 个）
```

## 3. 每个皮肤包里有什么

| 文件 | 说明 |
|---|---|
| `index.ts` | 只有 `import pack from './pack.json'; export default pack;`。没有演出代码，没有动态 import，也没有副作用（skin:check 的 AST 规则通过）。`loaders.ts` 的 `import.meta.glob('./*/index.ts')` 会自动发现它 |
| `pack.json` | skin:check 读的唯一数据源，字段对齐 `contract.ts` 的 `UmbraSkinPack`：`id / manifest / tokens / recipes / labels / enemyLayouts / roster / compendiumArt` |
| `assets/` | 素材，来自各自的 `feat/umbra-skin-<id>` 分支（红色取 `labs/umbra-m3-red/src/umbra/skins/p5r-red`） |
| `audio/{playlist,sfx,voice}.json` | 契约 v1.3 §7 的音频清单。音频文件本身不入库，缺文件时静音。`present.json` 由构建生成，没有提交 |
| `ui.css` | 皮肤 DOM 样式（`.umbra-skin-<id>` 根下） |
| `TODO.md` | 本皮的占位和待办清单 |

pack.json 的扩展字段（contract 没有声明，App 可以按需读）：
- `tokenTree`：原始嵌套 tokens。`tokens` 已拍平成 `Record<string,string>`，比如 `color.primary`
- `slots`、`templates`：契约 §4.1 / §4.3
- `roster.hero / navigator / navigatorPersona / partyDefault / members{ name, persona, personaName, personaAwakened, portrait, body, role } / showtime`
- `audio`、`css`、`budget`、`todo`、`origin{ref, commit}`

## 4. roster 内容（按原作，D-005）

| 皮 | heroPersona | companions（前 3 个 = 原作初始队伍 partyDefault） | 导航 |
|---|---|---|---|
| p5r-red | arsene | skull/captain-kidd, mona/zorro, panther/carmen, fox/goemon, queen/johanna, noir/milady, crow/robin-hood, violet/cendrillon | oracle/necronomicon |
| p3-blue | orpheus | yukari/io, junpei/hermes, akihiko/polydeuces, mitsuru/penthesilea, aigis/palladion, ken/nemesis, koromaru/cerberus, shinjiro/castor | fuuka/lucia |
| p3r-pink | orpheus-f | 同 p3-blue（女主 hamuko、NPC 提奥多亚，素材为生成图） | fuuka/lucia |
| p4-yellow | izanagi | yosuke/jiraiya, chie/tomoe, yukiko/konohana-sakuya, kanji/take-mikazuchi, teddie/kintoki-douji, naoto/sukuna-hikona | rise/himiko |

`excludedPersonas` 以共享 P5R 图鉴的 232 个 id 为准：
- 红：排除 P3/P4/PQ2 联动 DLC 面具
- 蓝/粉：排除 P5 独有面具（arsene、raoul、satanael、宝魔）、P4 系、另一位 P3 主角的俄耳甫斯，以及全部 picaro
- 黄：排除 P5 独有、P3 系、全部 picaro

这是保守清单，没有逐个核对每作的全图鉴（见 §7）。

**App 需要知道的两件事（不是冲突，是接线缺口）：**
1. `partyFromRoster` 会把 **全部** companions 都当作初始同伴，而 demoBridge 期望 3 人。建议改成用 `roster.partyDefault`（或 `companions.slice(0, 3)`）。
2. 同伴专属面具（captain-kidd、io、jiraiya……）**不在** P5R 共享图鉴里，`buildBattlePersona(id)` 会返回 null，结果被 filter 掉。现在的效果是：红、黄初始只有主角一人；蓝、粉只有 cerberus（虎狼丸）能建出来。需要 App 补一张「同伴面具数据表」，或者先 fallback 到公共面具。皮肤侧的 id 已经按原作给齐。

## 5. 首包预算（契约 §5，≤1MB）

| 皮 | 首包图（firstPack + 初始队伍 head 组） | 字体 | ui.css gz | pack.json gz | 合计 |
|---|---|---|---|---|---|
| p5r-red | 269,880 | 61,388 | 796 | 17,558 | **349,622 B** |
| p3-blue | 410,222 | 23,004 | 1,365 | 12,495 | **447,086 B** |
| p3r-pink | 505,464 | 18,404 | 1,556 | 10,775 | **536,199 B** |
| p4-yellow | 637,406 | 55,484 | 1,163 | 11,469 | **705,522 B** |

红色全部素材 4.1MB，但大部分是懒加载组（char/back/show/duo），不进首包。

## 6. 常见冲突怎么处理

- **`src/umbra/skins/<id>/` add/add 冲突**（App 自己先放了临时包）：以本分支为准，执行 `git checkout --theirs src/umbra/skins/<id> && git add src/umbra/skins/<id>`。App 的测试替身请放在 `__tests__` 里，不要放进皮肤目录。
- **`skins/__tests__/` 同名文件**：本分支只新增 `skinPacks.test.ts`。如果重名，把 App 那份改名后两份都保留。
- **App 以后改了 `contract.ts` 字段名**：不用手改 pack.json，只改 `tools/umbra-skins/build_packs.py` 里组装 `pack = {...}` 的那一段，然后运行 `python3 tools/umbra-skins/build_packs.py` 重建四皮（它会用 `git archive` 读各 `feat/umbra-skin-<id>` 分支，不切分支），再跑 §2 的验证。
- **皮肤分支更新了素材**：同样运行上面的重建脚本，可以用 `--ref p5r-red=<commit>` 锁定版本。
- **docs 下的 `*.md` 被 gitignore**：提交时要加 `git add -f`。

## 7. 回滚

- 合并后还没推：`git merge --abort`（合并进行中），或 `git reset --hard ORIG_HEAD`（仅限本地未推送、你自己的分支）
- 已经推送：`git revert -m 1 <merge提交>`。四皮全是新增文件，revert 后 App 回到「无皮肤包 → loadSkin 失败 → createDefaultUmbraCombat 默认队伍」的旧行为

## 8. 占位 / TODO 汇总（详见各皮 TODO.md）

- **头像占位**（程序绘制色块 + id，`assets/placeholder/head.<id>.webp`，group `head:<id>`，不进首包）：
  - 蓝/粉：mitsuru、aigis、ken、koromaru、shinjiro、fuuka
  - 黄：kanji、teddie、naoto、rise
  - 这些同伴也没有身体层立绘，引擎用通用剪影兜底
- **compendiumArt**：
  - 红：只有 9 个队伍面具（缺 necronomicon）
  - 蓝：只有 orpheus、apsaras
  - 粉、黄：还没有本作面具图
  - 公共恶魔的本作图鉴图都没做，App 用共享图兜底
- **roster.showtime**：只有红色有。P3 系和 P4 的 duo highlight 走引擎「A × B」兜底
- **enemyLayouts**：红色用自己 M3 实测的坐标。黄、蓝、粉暂时借用红色坐标（scale = h/340），等本皮实机截图后微调
- **音频**：
  - 红：清单来自样板（playlist 只含战斗子集 8 条）
  - 黄、蓝、粉：playlist 由 AUDIO-MAP §2 自动生成（条件和循环点待人工校），sfx 沿用红色 se 表，voice 只有占位路径
  - 四皮的音频文件都没入库
- **labels**：契约 v1.3 §8 的必填键已补齐。部分英文默认值待各皮润色（如蓝/粉 `label.baton`=SHIFT，黄 `label.finish`=FINISH!）
- **excludedPersonas**：保守版，P3/P4 全图鉴逐个核对待做
- **红色 recipes**：取自 M3 lab，已剔除给黄蓝粉看的 `demo.*` 演示（共 49 条）。M4/M4b 的探索 recipe 还在 labs/umbra-m4-red，没有并入 v1
