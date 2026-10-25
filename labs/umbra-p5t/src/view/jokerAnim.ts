// Joker 正版 Q 版战斗模型：10-26 起由共用加载器 p5tChar.ts 处理（batch-02 20 动作包 + 正版枪 Gn01000 / 刀 Wp01900；缺 batch-02 时退回 pilot 14 动作）。
// 这里只保留旧接口名给 jokerModel.ts 用。
import { preloadChar, charReady, makeChar } from './p5tChar';
import type { P5tRig } from './p5tChar';

export const preloadJokerPilot = () => preloadChar('joker');
export const jokerPilotReady = () => charReady('joker');
export function makeJokerPilot(): P5tRig | null { return makeChar('joker'); }
