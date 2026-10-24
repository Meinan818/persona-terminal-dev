import { useAppStore } from '@/store';
import { P5 } from '@/p5r-red/screens/pkg4/p5';
import { todoCompleteP5 } from '@/p5r-red/screens/overlays/cutins.p5r';

export interface RedTaskLike {
  id: string;
  title: string;
  points: number;
  extra?: Array<{ points: number }>;
}

export interface RedTaskCompletion {
  accepted: boolean;
  completed: boolean;
}

/** 完成一次红色任务；拒绝和异常都不改本地状态，中间计数只提示不播完成条。 */
export async function completeRedTask(t: RedTaskLike): Promise<RedTaskCompletion> {
  const state = useAppStore.getState();
  const progress = state.getTodayTodoProgress(t.id);
  if (!progress.isComplete && progress.count + 1 >= progress.target) {
    state.setModalBlocker(true);
  }
  try {
    const result = await state.completeTodo(t.id);
    if (!result) {
      state.setModalBlocker(false);
      P5.toast('没有记上：任务可能已完成、已停用或档案已切换');
      return { accepted: false, completed: false };
    }
    if (!result.completed) {
      state.setModalBlocker(false);
      P5.toast('这次进度已记下，到目标后才发点数');
      return { accepted: true, completed: false };
    }
    const points = t.points + (t.extra?.reduce((sum, boost) => sum + boost.points, 0) ?? 0);
    P5.sfx('success', 0.5);
    todoCompleteP5({
      title: t.title,
      points,
      unlock: result.unlockHints.achievements + result.unlockHints.skills > 0,
      heading: '今日完成',
      onClose: () => useAppStore.getState().setModalBlocker(false),
    });
    return { accepted: true, completed: true };
  } catch {
    state.setModalBlocker(false);
    P5.toast('任务没有写入，进度已保留原样');
    return { accepted: false, completed: false };
  }
}
