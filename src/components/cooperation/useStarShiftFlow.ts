/**
 * 星移流程的共享逻辑 —— p3（原版）与 p5（红黑剪报版）两套皮肤共用。
 *
 * 为什么单独抽出来：星移弹窗的业务逻辑不轻（最近记录的筛选合并、AI 落墨调用、
 * 消耗次数并写回）。若两版各抄一份，将来改一处要改两处，且极易漂移。
 * 抽到这里之后，两版组件**只负责渲染**，行为天然一致。
 *
 * 这与 confidantRankUpShared.ts 是同一套理由（Wave 1 起沿用的模式）：
 * 共用逻辑下沉到不带 JSX 的文件，皮肤组件各自 import。
 */
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';
import { useBackHandler } from '@/utils/useBackHandler';
import type { Confidant } from '@/types';
import { TAROT_BY_ID } from '@/constants/tarot';
import { starShiftConfidant, type StarShiftResult } from '@/utils/confidantAI';

export type StarShiftStage = 'input' | 'thinking' | 'preview' | 'done' | 'error';

export interface StarShiftFlow {
  stage: StarShiftStage;
  setStage: (s: StarShiftStage) => void;
  changeNote: string;
  setChangeNote: (v: string) => void;
  result: StarShiftResult | null;
  err: string | null;
  recentActs: Array<{ date: string; text: string }>;
  charges: number;
  handleStartShift: () => Promise<void>;
  handleConfirm: () => Promise<void>;
}

/**
 * @param isOpen    弹窗是否打开（关闭时重置到输入屏）
 * @param confidant 目标同伴（为 null 时不应渲染内容，但 hook 仍须无条件调用）
 * @param onClose   关闭回调（✕ / 点遮罩 / Android 返回键）
 */
export function useStarShiftFlow(
  isOpen: boolean,
  confidant: Confidant | null,
  onClose: () => void,
): StarShiftFlow {
  const { settings, consumeStarShift, confidantEvents, activities } = useAppStore(useShallow(s => ({
    settings: s.settings,
    consumeStarShift: s.consumeStarShift,
    confidantEvents: s.confidantEvents,
    activities: s.activities,
  })));

  const [stage, setStage] = useState<StarShiftStage>('input');
  const [changeNote, setChangeNote] = useState('');
  const [result, setResult] = useState<StarShiftResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStage('input');
      setChangeNote('');
      setResult(null);
      setErr(null);
    }
  }, [isOpen, confidant?.id]);

  // Android 返回键：
  //   - thinking 阶段（AI 生成星移内容）→ 点遮罩已被阻止，back 同样 no-op
  //   - 其余阶段 → 关闭弹窗（等同点 ✕ / 点遮罩）
  useBackHandler(isOpen, () => {
    if (stage === 'thinking') return;
    onClose();
  });

  // 截取最近 6 条与此同伴「一起做的事」——
  // 严格只用 conversation 事件里用户自己输入的原话 + 当时馆长给的建议；
  // 不把 AI 的解读 narrative 再发回去，避免 AI 被自己之前的叙述带偏
  const recentActs = useMemo(() => {
    if (!confidant) return [] as Array<{ date: string; text: string }>;
    const convs = confidantEvents
      .filter(e => e.confidantId === confidant.id && e.type === 'conversation' && typeof e.userInput === 'string' && e.userInput!.trim())
      .slice(0, 10);
    const merged: Array<{ when: number; date: string; text: string }> = [];
    for (const e of convs) {
      const pieces = [`事件：${(e.userInput as string).trim()}`];
      if (e.advice && e.advice.trim()) pieces.push(`当时的建议：${e.advice.trim()}`);
      merged.push({
        when: new Date(e.createdAt).getTime(),
        date: e.date,
        text: pieces.join('\n'),
      });
    }
    // 另外补充一些「记录」里用户明确关联到 Ta 的条目（category=confidant）作为外部线索
    const related = activities
      .filter(a => a.confidantId === confidant.id)
      .slice(0, 10);
    for (const a of related) {
      // 活动 description 形如 `[同伴] 名字：事件`，这里只拿冒号后的事件
      const text = a.description.includes('：') ? a.description.split('：').slice(1).join('：') : a.description;
      merged.push({
        when: new Date(a.date).getTime(),
        date: new Date(a.date).toLocaleDateString('zh-CN'),
        text: `事件：${text}`,
      });
    }
    merged.sort((a, b) => b.when - a.when);
    return merged.slice(0, 6).map(m => ({ date: m.date, text: m.text }));
  }, [confidant, activities, confidantEvents]);

  const card = confidant ? TAROT_BY_ID[confidant.arcanaId] : undefined;
  const charges = confidant?.starShiftCharges ?? 0;

  const handleStartShift = async () => {
    if (!confidant || charges <= 0) return;
    setErr(null);
    setStage('thinking');
    try {
      const r = await starShiftConfidant({
        settings,
        confidantName: confidant.name,
        arcanaName: card?.name ?? '塔罗',
        orientation: confidant.orientation,
        currentLevel: confidant.intimacy,
        previousDescription: confidant.description,
        previousInterpretation: confidant.aiInterpretation,
        previousAdvice: confidant.aiAdvice,
        changeNote: changeNote.trim(),
        recentActivities: recentActs,
      });
      setResult(r);
      setStage('preview');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '星移失败');
      setStage('error');
    }
  };

  const handleConfirm = async () => {
    if (!confidant || !result) return;
    try {
      await consumeStarShift(confidant.id, {
        description: result.description,
        interpretation: result.interpretation,
        advice: result.advice,
        orientation: result.orientation,
        summary: result.summary,
      });
      setStage('done');
      setTimeout(() => onClose(), 1400);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败');
      setStage('error');
    }
  };

  return {
    stage, setStage,
    changeNote, setChangeNote,
    result, err,
    recentActs, charges,
    handleStartShift, handleConfirm,
  };
}
