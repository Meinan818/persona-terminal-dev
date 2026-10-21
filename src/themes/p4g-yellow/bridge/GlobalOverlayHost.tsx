/**
 * 全局弹层宿主：真实 App.tsx 顶层由 store 状态触发的弹层/演出（升级、成就、技能、愿望进度、宣告卡结算、
 * BIG DEAL 收官、组织庆祝、羁绊升级、星移、同步冲突…）在这里改挂 demo 版本。
 * 按 INTEGRATE-THEMES.md 第 7 步的表逐个填写；未填的演出在主题下不会出现（=漏演出，验收不通过）。
 */
export function GlobalOverlayHost() {
  return null;
}
