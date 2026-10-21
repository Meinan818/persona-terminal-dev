import { useAppStore } from '@/store';
import type { CallingCard } from '@/types';
import { callingCardOps } from '@yellow/adapters/callingCards';
export const getCallingCards=()=>useAppStore.getState().callingCards;
export function useCallingCards(): [CallingCard[]] { return [useAppStore(s=>s.callingCards)]; }
export const updateCard=async(id:string,patch:Partial<CallingCard>)=>{
 if(patch.archived===true)return callingCardOps.archive(id);
 if(patch.archived===false)return callingCardOps.restore(id);
 if(patch.pinned!==undefined)return callingCardOps.pin(patch.pinned?id:null);
 const card=getCallingCards().find(c=>c.id===id);if(card)await callingCardOps.save({...card,...patch});
};
export const removeCard=callingCardOps.remove;
export const saveCard=callingCardOps.save;
