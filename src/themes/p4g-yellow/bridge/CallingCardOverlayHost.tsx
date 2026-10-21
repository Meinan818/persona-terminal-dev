import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { callingCardOps } from '@yellow/adapters/callingCards';
import CallingCardCutIn from '@yellow/screens/overlays/CallingCardCutIn.p4g';

/** 复用原有宣告卡归档事件队列；数据和确认操作来自真实 store。 */
export function CallingCardOverlayHost() {
  const cards = useAppStore(s => s.callingCards);
  const blocked = useAppStore(s => s.modalBlocker || !!s.levelUpNotification || !!s.achievementNotification || !!s.skillNotification);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pending = cards.filter(c => c.archived && c.cutInShown === false && !c.terminal)
    .sort((a,b) => new Date(a.archivedAt ?? a.createdAt).getTime() - new Date(b.archivedAt ?? b.createdAt).getTime())[0];
  const card = cards.find(c => c.id === activeId) ?? null;
  useEffect(() => { if (!activeId && !blocked && pending) setActiveId(pending.id); }, [activeId, blocked, pending]);
  const close = async () => { if (activeId) await callingCardOps.markShown(activeId); setActiveId(null); };
  return <CallingCardCutIn open={!!card && !blocked} onClose={() => { void close(); }} card={card} reason={card?.archiveReason ?? 'manual'} params={new URLSearchParams('reason=' + (card?.archiveReason ?? 'manual'))} />;
}
