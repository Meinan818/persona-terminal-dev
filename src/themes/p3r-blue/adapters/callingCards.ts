import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, toLocalDateKey } from '@/store';
import type { CallingCard } from '@/types';
export const TODAY_KEY = toLocalDateKey();
export const CC_TODAY = TODAY_KEY;
export function useCallingCardData() {
 const { cards, todos, completions } = useAppStore(useShallow(s => ({cards:s.callingCards,todos:s.todos,completions:s.todoCompletions})));
 return useMemo(() => ({CALLING_CARDS:cards,CC_CARDS:cards,TODOS:todos,CC_LINKED:Object.fromEntries(cards.map(c => { const p=useAppStore.getState().getCallingCardProgress(c.id);return [c.id,{done:p?.todosDone??0,total:p?.todosTotal??0}]; }))}),[cards,todos,completions]);
}
export const callingCardOps = {
 save: (card: CallingCard) => { const existing=useAppStore.getState().callingCards.find(c=>c.id===card.id); return useAppStore.getState().saveCallingCard({...existing,...card,createdAt:existing?.createdAt??card.createdAt??new Date()}); },
 remove: (id: string) => useAppStore.getState().deleteCallingCard(id),
 pin: (id: string|null) => useAppStore.getState().pinCallingCard(id),
 archive: (id: string) => useAppStore.getState().archiveCallingCard(id),
 restore: (id: string) => useAppStore.getState().unarchiveCallingCard(id),
 record: (id: string) => useAppStore.getState().writeCallingCardLedger(id),
 markShown: (id: string) => useAppStore.getState().markCallingCardCutInShown(id),
};
export const ccDaysLeft = (target?: string) => target ? Math.round((new Date(target+'T00:00:00').getTime()-new Date(toLocalDateKey()+'T00:00:00').getTime())/86400000) : null;
export const ccProgress = (card: CallingCard) => useAppStore.getState().getCallingCardProgress(card.id)?.overallProgress ?? 0;
export function cardProgress(card: CallingCard) {
 const p=useAppStore.getState().getCallingCardProgress(card.id);
 const summary=card.archived ? card.archiveReason==='auto_todos'?'已达成':card.archiveReason==='auto_date'?'已至期':'已收存' : card.mode==='todos' ? '已完成 '+(p?.todosDone??0)+'/'+(p?.todosTotal??0)+' 项' : p?.daysLeft===0?'就是今天':p?.daysLeft!==undefined?'还剩 '+p.daysLeft+' 天':'';
 return {overall:Math.round((p?.overallProgress??0)*100),summary,daysLeft:card.targetDate?ccDaysLeft(card.targetDate)??undefined:undefined};
}

export function futureDate(days=30){ const d=new Date();d.setDate(d.getDate()+days);return toLocalDateKey(d); }
export const updateCard=async(id:string,patch:Partial<CallingCard>)=>{
 if(patch.archived===true)return callingCardOps.archive(id);
 if(patch.archived===false)return callingCardOps.restore(id);
 if(patch.pinned!==undefined)return callingCardOps.pin(patch.pinned?id:null);
 const card=useAppStore.getState().callingCards.find(c=>c.id===id);if(card)await callingCardOps.save({...card,...patch});
};
export function usePinnedCallingCard(){
 const data=useCallingCardData();
 const pinned=data.CALLING_CARDS.find(c=>c.pinned&&!c.archived&&!c.terminal)??null;
 const unpinned=data.CALLING_CARDS.filter(c=>!c.pinned&&!c.archived&&!c.terminal).length;
 return {pinned,unpinned,progress:pinned?cardProgress(pinned).overall:0};
}
export function cutInCard(card: CallingCard){
 const p=useAppStore.getState().getCallingCardProgress(card.id);
 return {icon:card.icon??'✦',title:card.title,subtitle:card.subtitle??'',days:card.mode==='deadline'?'目标日 '+(card.targetDate??''): '关联任务 '+(p?.todosDone??0)+' / '+(p?.todosTotal??0)};
}
