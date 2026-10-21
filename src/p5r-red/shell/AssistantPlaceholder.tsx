/** 助手面板占位（底栏中间键短按 / 侧栏「助手」）。登记 overlays['assistant-window'] 后外壳自动改用它。
 *  原生版：/workspace/work/p5r/chat/index.html（由另一位工作者负责）。 */
import { P5Sheet } from '@/p5r-red/kit/P5Sheet';
export default function AssistantPlaceholder({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <P5Sheet open={open} onClose={onClose} title="助手 · NAVI" seed={77}>
      <p style={{ margin: '0 0 10px', font: '900 15px/1.5 var(--f-title)' }}>助手聊天面板接入处（占位）</p>
      <p style={{ margin: 0, font: '800 13px/1.6 var(--f-sans)', color: '#3b3733' }}>
        原生 demo 的中间键链接到 chat/index.html（另一位工作者负责）。React 版：在 overlays.pkg2.ts 登记 <b>assistant-window</b>（NavigatorWindow） 后，短按会自动打开它；长按 500ms 仍是快捷轮盘。
      </p>
    </P5Sheet>
  );
}
