/** 动效 / 舞台 / 剪影 / 转场 / 音效 —— 迁移自 shared/{bg,sil,transitions,fx,radar}.js 与 core.js 的 spring/panelIn/slamTiles。 */
export { P5BgSVG, P5Stage, P5StageLayers, defaultStage, type StageSpec, type StageOpts, type BgOpts } from './bg';
export { P5Sil, SIL_NAMES, type SilName } from './sil';
export { spring, springT, type SpringOpts } from './spring';
export { panelIn, slamTiles, segIn } from './motion';
export { waterNav, starTear, cutIn, cutInTodoDone, type Origin, type CutInOpts } from './transitions';
export { surprise, installSurpriseFx, maskHTML, blink, type SurpriseKind } from './surprise';
export { sfx, SFX_MAP, type SfxKey } from './sfx';
export { PersonaRadar } from './radar';
export { TypeOut } from './TypeOut';
// FIXLIST 六 fx 名单别名：StarTear 星形反撕 / WaterRipple 水波纹 / CutInStage 舞台（命令式函数）
export { starTear as StarTear, waterNav as WaterRipple, cutIn as CutInStage } from './transitions';
export { thinkingCircleHTML } from './thinkingCircle';
// 其余 fx 件所在位置（不在本目录、未从此处导出，避免把弹层文件拉进 kit 依赖）：
//   ThinkingCircle 思索环 React 版 = ThinkingCircleP5（src/screens/overlays/ThinkingCircle.p5r.tsx，red-thinking）；字符串版 = thinkingCircleHTML（上，pkg3/pkg4 命令式屏共用）
//   CutInBackdrop 四纹理 bands/rings/lines/ripple + Cut-in 总览 = src/screens/overlays/CutInGallery.p5r.tsx（red-cutin-gallery）
//   演出连播 = src/screens/demo-harness/FxShowreel.tsx（#/overlay/fx-showreel）；演出目录 = src/fxCatalog.ts
