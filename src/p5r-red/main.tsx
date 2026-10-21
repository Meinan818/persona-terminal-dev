import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initPrefs } from '@/p5r-red/lib/prefs';
import { PAGES } from '@/p5r-red/registry/pages';
import { OVERLAYS } from '@/p5r-red/registry/overlays';
import { preload } from '@/p5r-red/shell/lazyRegistry';
import { installHistoryTear } from '@/p5r-red/shell/historyTear';

initPrefs();
installHistoryTear(); // 浏览器前进/后退 → 星形反撕（须在 HashRouter 挂监听之前安装）
// 预热全部页面 / 弹层模块（单 IIFE 包内几乎零成本），转场 swap 时新页立即可渲染
for (const [k, e] of Object.entries(PAGES)) preload(`page:${k}`, e.load);
for (const [k, e] of Object.entries(OVERLAYS)) preload(`overlay:${k}`, e.load);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
