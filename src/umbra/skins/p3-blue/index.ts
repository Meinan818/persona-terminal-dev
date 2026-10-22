// p3-blue 皮肤包入口（契约 v1.3 · skins v1）。只导出 pack.json：无演出代码、无动态 import、无副作用。
// 由 tools/umbra-skins/build_packs.py 从 origin/feat/umbra-skin-p3-blue@2873303 组装；App 侧经 skins/loaders.ts 的 import.meta.glob 懒加载。
import pack from './pack.json';

export default pack;
