/**
 * 主题接入：demo 名片状态 <-> 真实 user。
 * demo 的 presence.ts 保持原样；这里只做首帧同步和后续写回。
 */
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';

type PresenceLike = { name: string; avatar: string | null; theme: string };
type SetPresence = (p: Partial<PresenceLike>) => void;

export function PresenceBridge({ presence, setPresence }: { presence: PresenceLike; setPresence: SetPresence }) {
  const user = useAppStore((s) => s.user);
  const ready = useRef(false);

  useEffect(() => {
    if (!user || ready.current) return;
    ready.current = true;
    setPresence({ name: user.name, avatar: user.avatarDataUrl ?? null, theme: user.theme });
  }, [user?.name, user?.avatarDataUrl, user?.theme, setPresence]);

  useEffect(() => {
    if (!ready.current || !user) return;
    const store = useAppStore.getState();
    if (presence.name && presence.name !== user.name) {
      void store.updateUser({ name: presence.name });
    }
    if ((presence.avatar ?? null) !== (user.avatarDataUrl ?? null)) {
      void store.updateUser({ avatarDataUrl: presence.avatar ?? undefined });
    }
  }, [presence.name, presence.avatar, user?.name, user?.avatarDataUrl]);

  return null;
}
