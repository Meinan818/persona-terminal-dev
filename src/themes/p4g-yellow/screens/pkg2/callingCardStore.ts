/**
 * 宣告卡（倒计时）共享假数据 store —— 行动·任务「倒计时」面（GoalDeck/CallingCardSection）与「宣告卡」总览页（#/p/callingcard）读写同一份。
 * 初值 = src/mock/pkg2.ts#CALLING_CARDS。接入真实 app 时换成 useAppStore(s => s.callingCards) 与对应 action（钉选互斥、归档、删除、保存）。
 */
import { useSyncExternalStore } from 'react';
import type { CallingCard } from '@real/types';
import { CALLING_CARDS } from '@yellow/mock/pkg2';

let cards: CallingCard[] = CALLING_CARDS.map((c) => ({ ...c }));
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const getCallingCards = () => cards;
export function setCallingCards(next: CallingCard[] | ((l: CallingCard[]) => CallingCard[])) {
  cards = typeof next === 'function' ? next(cards) : next; emit();
}
export function useCallingCards(): [CallingCard[], typeof setCallingCards] {
  const v = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getCallingCards, getCallingCards);
  return [v, setCallingCards];
}
/** 钉选互斥（真实：钉到主页只能一张）。p.pinned=true 时其它卡全部取消钉选 */
export const updateCard = (id: string, p: Partial<CallingCard>) => setCallingCards((l) => l.map((c) => (c.id === id ? { ...c, ...p } : p.pinned ? { ...c, pinned: false } : c)));
export const removeCard = (id: string) => setCallingCards((l) => l.filter((c) => c.id !== id));
export const saveCard = (c: CallingCard) => setCallingCards((l) => { const exists = l.some((x) => x.id === c.id); const base = c.pinned ? l.map((x) => ({ ...x, pinned: false })) : l; return exists ? base.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [c, ...base]; });
