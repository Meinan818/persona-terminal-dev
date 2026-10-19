import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceRoom,
  applyBattleLoss,
  applyBattleWin,
  battleReward,
  cleanRecord,
  createSliceRun,
  currentRoom,
  dangerCost,
  normalizeFloorSpec,
  offlineFloorSpec,
  offlineJudge,
  resolveTalk,
  retireRun,
  sliceSummary,
  sneakRoom,
  talkChance,
  themeKeyFor,
  towerFloorSpec,
} from './night-slice.js';

const record = '今天开会时被否掉了方案，回家路上一直在想怎么解释';

test('记录会去空白并截到 120 字', () => {
  assert.equal(cleanRecord('  今天   有点累  '), '今天 有点累');
  assert.equal(cleanRecord('x'.repeat(200)).length, 120);
  assert.equal(cleanRecord(null), '');
});

test('离线夜层由记录决定主题与片段', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  assert.equal(spec.mode, 'offline');
  assert.ok(spec.theme.includes('加班') || spec.theme.includes('楼层'));
  assert.ok(spec.rooms.some(room => room.line.includes('开会') || room.line.includes('方案')));
  assert.equal(themeKeyFor('明天要交报告，还没写完'), 'work');
  assert.equal(themeKeyFor('想给她回消息，但不知道怎么开口'), 'relation');
  assert.equal(themeKeyFor('又熬夜刷手机'), 'self');
});

test('同一记录与日期得到同一晚，换日期会变', () => {
  const first = offlineFloorSpec(record, { date: '2026-10-19' });
  const again = offlineFloorSpec(record, { date: '2026-10-19' });
  const next = offlineFloorSpec(record, { date: '2026-10-20' });
  assert.deepEqual(first, again);
  assert.notDeepEqual(first, next);
});

test('不写记录也能生成「空白的一天」', () => {
  const spec = offlineFloorSpec('', { date: '2026-10-19' });
  assert.equal(spec.mode, 'offline');
  assert.equal(spec.theme, '空白的一天');
  assert.equal(spec.source, '');
  assert.ok(spec.rooms.length >= 3);
  assert.equal(spec.rooms.find(room => room.kind === 'shadow').shadow.name, '沉默的回声');
  assert.ok(!spec.rooms.some(room => room.line.includes('今天有一件没说出口的事')));
  assert.ok(!spec.memory.includes('「'));
});

test('塔自己的夜层不读记录，命名来自塔的主题', () => {
  const spec = towerFloorSpec({ date: '2026-10-19' });
  assert.equal(spec.origin, 'tower');
  assert.equal(spec.source, '');
  assert.ok(spec.rooms.length >= 3 && spec.rooms.length <= 5);
  assert.equal(spec.rooms.at(-1).kind, 'exit');
  assert.ok(spec.rooms.some(room => room.kind === 'guard'));
  assert.ok(spec.rooms.some(room => room.kind === 'shadow'));
  assert.ok(!spec.rooms.some(room => room.line.startsWith('「')));
  const again = towerFloorSpec({ date: '2026-10-19' });
  assert.deepEqual(spec, again);
});

test('离线夜层始终 3–5 间房，带守卫、影子和最后出口', () => {
  for (let day = 1; day <= 12; day += 1) {
    const spec = offlineFloorSpec(record, { date: `2026-10-${String(day).padStart(2, '0')}` });
    assert.ok(spec.rooms.length >= 3 && spec.rooms.length <= 5);
    assert.ok(spec.rooms.some(room => room.kind === 'guard'));
    assert.ok(spec.rooms.some(room => room.kind === 'shadow'));
    assert.equal(spec.rooms.at(-1).kind, 'exit');
    assert.ok(spec.rooms.every(room => !('hp' in room) && !('sp' in room)));
  }
});

test('少于三间房的模型输出退回离线夜层', () => {
  const spec = normalizeFloorSpec({ rooms: [{ kind: 'exit' }] }, { record });
  assert.equal(spec.mode, 'offline');
  assert.ok(spec.rooms.length >= 3);
});

test('模型输出只保留白名单内容，出口在最后', () => {
  const spec = normalizeFloorSpec({
    title: '  一条没走完的走廊  ',
    theme: '走廊',
    memory: '这次你没有绕开。',
    rooms: [
      { kind: 'unknown', title: '不该存在的房间', danger: 'deadly', reward: { itemId: 'god-sword', money: 99999 } },
      {
        kind: 'shadow',
        title: '回声',
        danger: 'high',
        shadow: { name: '回声', personality: 'unknown', opening: '停下。', demand: '说。' },
        reward: { itemId: 'painkiller', money: 120 },
      },
      { kind: 'exit', title: '门', line: '门开着。' },
    ],
  }, { record });
  assert.equal(spec.mode, 'ai');
  assert.equal(spec.title, '一条没走完的走廊');
  assert.equal(spec.rooms.at(-1).kind, 'exit');
  assert.ok(!('reward' in spec.rooms.at(-1)));
  assert.ok(spec.rooms.some(room => room.kind === 'guard'));
  assert.ok(spec.rooms.some(room => room.kind === 'shadow'));
  const shadow = spec.rooms.find(room => room.kind === 'shadow');
  assert.ok(['proud', 'cowardly', 'greedy', 'wrathful', 'calm'].includes(shadow.shadow.personality));
  const rewardRoom = spec.rooms.find(room => room.reward && room.kind !== 'exit');
  assert.ok(['painkiller', 'sportsDrink', 'energyDrink', 'echoShard', 'wanderShard', 'psyShard', 'enhanceStone'].includes(rewardRoom.reward.itemId));
  assert.ok(rewardRoom.reward.money <= 400);
});

test('模型不能把玩家记录当成影子名字', () => {
  const spec = normalizeFloorSpec({
    rooms: [
      { kind: 'guard', title: '门', line: '门开着。' },
      {
        kind: 'shadow',
        title: '影子',
        shadow: { name: '今天开会时没敢说出自己的想法', personality: 'proud', opening: '停下。', demand: '说。' },
      },
      { kind: 'exit', title: '出口', line: '天亮。' },
    ],
  }, { record });
  const shadow = spec.rooms.find(room => room.kind === 'shadow');
  assert.ok(!shadow.shadow.name.includes('开会'));
  assert.equal(shadow.shadow.name, '没做完的表格');
});

test('房间危险档位换算成固定代价', () => {
  assert.deepEqual(dangerCost('low'), { hp: 5, sp: 2, alert: 6 });
  assert.deepEqual(dangerCost('mid'), { hp: 10, sp: 5, alert: 10 });
  assert.deepEqual(dangerCost('high'), { hp: 16, sp: 8, alert: 16 });
});

test('绕行消耗夜色与警戒，夜色用完会结束', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 20, maxHp: 52, maxSp: 34 });
  run.time = 1;
  const result = sneakRoom(run);
  assert.equal(result.ok, true);
  assert.equal(run.time, 0);
  assert.ok(run.alert > 0);
  assert.equal(run.finished, true);
  assert.equal(run.reason, 'timeout');
});

test('硬刚胜利给钱与物品，失败直接结束本夜', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 20 });
  const room = currentRoom(run);
  const reward = applyBattleWin(run, room);
  assert.ok(reward.money > 0);
  assert.equal(run.loot.length, 1);
  assert.ok(run.index > 0);
  assert.equal(battleReward(run, room).money > 0, true);

  const lost = createSliceRun(spec, { hp: 40, sp: 20 });
  applyBattleLoss(lost, currentRoom(lost));
  assert.equal(lost.finished, true);
  assert.equal(lost.reason, 'defeat');
  assert.equal(lost.hp, 1);
});

test('交涉成功率受人格、语气与质量影响，没 SP 不能贿赂', () => {
  assert.ok(talkChance({ personality: 'proud', tone: 'flatter', quality: 70 }) >
    talkChance({ personality: 'proud', tone: 'threaten', quality: 70 }));
  assert.ok(talkChance({ personality: 'calm', tone: 'reason', quality: 80 }) >
    talkChance({ personality: 'calm', tone: 'reason', quality: 30 }));
  assert.equal(talkChance({ personality: 'greedy', tone: 'bribe', quality: 90, sp: 10 }), 0);
  const chance = talkChance({ personality: 'greedy', tone: 'bribe', quality: 100, sp: 40 });
  assert.ok(chance <= 95 && chance >= 5);
});

test('交涉成功推进房间，失败扣血并推高警戒', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 20 });
  const shadowIndex = spec.rooms.findIndex(room => room.kind === 'shadow');
  run.index = shadowIndex;
  const room = currentRoom(run);
  const original = Math.random;
  try {
    Math.random = () => 0.01;
    const success = resolveTalk(run, room, { tone: 'reason', quality: 90 });
    assert.equal(success.success, true);
    assert.equal(run.talked, 1);
    assert.ok(run.loot.length > 0);

    const failRun = createSliceRun(spec, { hp: 40, sp: 20 });
    failRun.index = shadowIndex;
    const beforeHp = failRun.hp;
    Math.random = () => 0.99;
    const fail = resolveTalk(failRun, currentRoom(failRun), { tone: 'reason', quality: 10 });
    assert.equal(fail.success, false);
    assert.ok(failRun.hp < beforeHp);
    assert.ok(failRun.alert >= 18);
  } finally {
    Math.random = original;
  }
});

test('贿赂在尝试时扣除 20 SP', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 40, maxSp: 60 });
  run.index = spec.rooms.findIndex(room => room.kind === 'shadow');
  const original = Math.random;
  try {
    Math.random = () => 0.01;
    resolveTalk(run, currentRoom(run), { tone: 'bribe', quality: 80 });
    assert.equal(run.sp, 20);
  } finally {
    Math.random = original;
  }
});

test('离线判定会根据输入给出不同语气与质量', () => {
  const room = { shadow: { demand: '告诉我，你为什么要走。', personality: 'calm' } };
  const threat = offlineJudge({ text: '别动，再动我就打你。', room });
  const reason = offlineJudge({ text: '因为你在这里等了很久，我想知道你为什么不走。', room });
  assert.equal(threat.tone, 'threaten');
  assert.equal(reason.tone, 'reason');
  assert.ok(reason.quality > 30);
  assert.ok(threat.reply.length > 0);
});

test('结算摘要保留房间数、击破与回响', () => {
  const spec = offlineFloorSpec(record, { date: '2026-10-19' });
  const run = createSliceRun(spec, { hp: 40, sp: 20 });
  advanceRoom(run, '走过第一间房');
  retireRun(run, 'descend');
  const summary = sliceSummary(run);
  assert.equal(summary.rooms, spec.rooms.length);
  assert.equal(summary.reason, 'descend');
  assert.ok(Array.isArray(summary.loot));
  assert.ok(Array.isArray(summary.memories));
});
