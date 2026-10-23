import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '@/store';
import { useNavigatorStore } from '@/store/navigator';
import { buildPreviewLines, executeDraft } from '@/utils/navigatorRegistry';
import type { NavigatorDraft } from '@/utils/navigatorRegistry';
import { db } from '@/db';
import { getProfile, saveProfile } from '@/utils/navigatorMemory';
import { deletePromise, listPromises, updatePromiseDate } from '@/utils/navigatorPromise';
import type { NavigatorMemo } from '@/types';

export interface ThemeChatMessage {
  id: string;
  role: 'cat' | 'user' | 'card' | 'divider' | 'time' | 'image';
  text?: string;
  draftKind?: NavigatorDraft['kind'];
  draft?: NavigatorDraft;
  lines?: string[];
  status?: 'pending' | 'done' | 'cancelled' | 'failed';
  receipt?: string;
  image?: string;
}

export function useNavigatorThemeData() {
  const { messages, hasOlder, hydrateSession } = useNavigatorStore(useShallow((state) => ({
    messages: state.messages,
    hasOlder: state.hasOlder,
    hydrateSession: state.hydrateSession,
  })));
  const todos = useAppStore((state) => state.todos);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  const CHAT_MESSAGES = useMemo<ThemeChatMessage[]>(() => {
    const out: ThemeChatMessage[] = [];
    for (const message of messages) {
      if (message.role === 'summary') {
        out.push({ id: message.id, role: 'divider' });
        continue;
      }
      if (message.imageDataUrl && message.role !== 'card') {
        out.push({ id: `${message.id}-image`, role: 'image', image: message.imageDataUrl });
      }
      if (message.role === 'card') {
        out.push({
          id: message.id,
          role: 'card',
          draftKind: message.draft?.kind,
          draft: message.draft,
          status: message.cardStatus,
          lines: message.draft ? buildPreviewLines(message.draft) : [],
          receipt: message.receipt,
        });
      } else if (message.text) {
        out.push({ id: message.id, role: message.role, text: message.text });
      }
    }
    return out;
  }, [messages]);

  const PICKER_TODOS = useMemo(() => todos
    .filter((todo) => todo.isActive !== false)
    .map((todo) => ({
      id: todo.id,
      title: todo.title,
      attribute: todo.attribute,
      points: todo.points,
      repeatDaily: todo.repeatDaily === true,
    })), [todos]);

  return { CHAT_MESSAGES, PICKER_TODOS, hasOlder };
}

export const navigatorThemeOps = {
  hydrate: () => useNavigatorStore.getState().hydrateSession(),
  pushUser: (text: string, imageDataUrl?: string) => useNavigatorStore.getState().pushUser(text, imageDataUrl),
  pushCat: (text: string) => useNavigatorStore.getState().pushCat(text),
  pushCard: (draft: Parameters<ReturnType<typeof useNavigatorStore.getState>['pushCard']>[0]) => useNavigatorStore.getState().pushCard(draft),
  updateCard: (id: string, patch: Parameters<ReturnType<typeof useNavigatorStore.getState>['updateCard']>[1]) => useNavigatorStore.getState().updateCard(id, patch),
  loadOlder: () => useNavigatorStore.getState().loadOlder(),
  executeDraft,
};

export function useNavigatorNotebook(open: boolean) {
  const profile = useLiveQuery(async () => open ? getProfile() : '', [open]) ?? '';
  const promises = useLiveQuery(async () => open ? listPromises() : [], [open]) ?? [];
  const memos = useLiveQuery(
    async () => open ? db.navigatorMemos.where('status').equals('active').reverse().sortBy('createdAt') : [],
    [open],
  ) ?? [];
  return { profile, promises, memos };
}

export const navigatorNotebookOps = {
  saveProfile,
  updatePromiseDate,
  deletePromise,
  saveMemo: async (id: string, patch: Partial<NavigatorMemo>) => {
    const memo = await db.navigatorMemos.get(id);
    if (memo) await db.navigatorMemos.put({ ...memo, ...patch });
  },
  deleteMemo: (id: string) => db.navigatorMemos.delete(id),
};
