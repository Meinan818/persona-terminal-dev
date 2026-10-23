import type { OrgOperation, OrgReactionTag, OrgView } from '@/types';

export type OpsUiState = Record<string, Record<string, { state: string; plan?: string }>>;

export function orgReactionData(view: OrgView) {
  const mine: Record<string, OrgReactionTag[]> = {};
  const counts: Record<string, Partial<Record<OrgReactionTag, number>>> = {};
  for (const reaction of view.reactions ?? []) {
    const postCounts = counts[reaction.postId] ?? {};
    postCounts[reaction.tag] = (postCounts[reaction.tag] ?? 0) + 1;
    counts[reaction.postId] = postCounts;
    if (reaction.userId === view.me.userId) {
      mine[reaction.postId] = [...(mine[reaction.postId] ?? []), reaction.tag];
    }
  }
  return { mine, counts };
}

export function activeOrgOps(view: OrgView): OrgOperation[] {
  return (view.ops ?? []).filter((operation) => operation.status === 'active');
}

export function buildOrgOpsState(view: OrgView): OpsUiState {
  const result: OpsUiState = {};
  for (const operation of view.ops ?? []) {
    const users: Record<string, { state: string; plan?: string }> = {};
    for (const userId of operation.participants) users[userId] = { state: 'todo' };
    for (const checkin of view.checkins ?? []) {
      if (checkin.operationId !== operation.id) continue;
      const current = users[checkin.userId] ?? { state: 'todo' };
      if (checkin.kind === 'done') current.state = 'done';
      else if (checkin.kind === 'out') current.state = 'out';
      else {
        current.plan = checkin.text;
        if (current.state !== 'done' && current.state !== 'out') current.state = 'todo';
      }
      users[checkin.userId] = current;
    }
    result[operation.id] = users;
  }
  return result;
}

export function endedOrgOps(view: OrgView, today: string) {
  return (view.ops ?? [])
    .map((operation) => {
      const states = buildOrgOpsState(view)[operation.id] ?? {};
      const counted = operation.participants.filter((userId) => !['out', 'gone'].includes(states[userId]?.state)).length;
      const done = operation.participants.filter((userId) => states[userId]?.state === 'done').length;
      return {
        id: operation.id,
        kind: operation.kind,
        title: operation.title,
        day: operation.deadline,
        done,
        counted,
        status: operation.status === 'cancelled' ? 'cancelled' as const : operation.deadline < today ? (done >= counted && counted > 0 ? 'achieved' as const : 'failed' as const) : null,
      };
    })
    .filter((item) => item.status !== null);
}

export function orgRaidCardData(view: OrgView) {
  const raid = [...(view.raids ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (!raid) return null;
  const hits = (view.raidHits ?? []).filter((hit) => hit.raidId === raid.id);
  const damage = hits.reduce((sum, hit) => sum + hit.damage, 0);
  const byUser = new Map<string, { userId: string; nights: Set<string>; allout: boolean }>();
  for (const hit of hits) {
    const row = byUser.get(hit.userId) ?? { userId: hit.userId, nights: new Set<string>(), allout: false };
    if (hit.kind === 'allout') row.allout = true;
    else row.nights.add(hit.night);
    byUser.set(hit.userId, row);
  }
  const date = new Date(raid.createdAt);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    left: Math.max(0, raid.hpMax - damage),
    hpMax: raid.hpMax,
    nights: [day, day],
    hitters: [...byUser.values()].map((row) => ({ userId: row.userId, nights: row.nights.size, allout: row.allout })),
  };
}
