/**
 * mock 像素验收入口（接入件 · 不要改）。由正式仓库根目录 p5r-red-verify.html 加载。
 * 先加载正式仓库自己的全局样式（@/index.css，和正式 main.tsx 一样），再用 demo 原 mock 数据渲染红频道：
 * 截图必须和参考截图（integration/reference/）一致 —— 证明「整包原样拷入」没拆、没漏，
 * 作用域 / preflight 撤销 / tailwind 预编译都对，且正式仓库的旧全局样式没有盖到红频道上。
 * 不连 store、不跑开屏。日夜 / 低动效走 URL：?__mode=day|night&__motion=low。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import RedChannelCore from '@/p5r-red/RedChannelCore';

document.documentElement.setAttribute('data-ui-channel', 'p5');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RedChannelCore />
  </StrictMode>,
);
