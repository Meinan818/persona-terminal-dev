/**
 * 第一座塔 · 区段规则
 *
 * 新行程为 4 区 × 10 层；旧 100 层行程继续使用原来的五区规则。
 */

import { DUNGEON_FLOORS } from './tower-layout.js';

const LEGACY_REGIONS = [
  {
    id: 'outer',
    from: 1,
    to: 20,
    name: '外环 · 月台与档案',
    short: '外环',
    rule: '基础规则。先熟悉迷雾、钥匙、安全屋和守卫。',
    steps: 0,
    securityPerMove: 0,
    chestBonus: 0,
    reward: 1,
    safeHeal: 0.3,
    corrodeEvery: 0,
    clockEvery: 0,
  },
  {
    id: 'corrode',
    from: 21,
    to: 40,
    name: '腐蚀区 · 温室与剧场',
    short: '腐蚀区',
    rule: '每走 4 步，藤蔓腐蚀 HP -2；安全屋恢复更多。',
    steps: 2,
    securityPerMove: 0,
    chestBonus: 0,
    reward: 1,
    safeHeal: 0.4,
    corrodeEvery: 4,
    corrodeDamage: 2,
    clockEvery: 0,
  },
  {
    id: 'spotlight',
    from: 41,
    to: 60,
    name: '聚光区 · 走廊与泳池',
    short: '聚光区',
    rule: '每步警戒 +2，但战斗与交涉金钱 +35%。',
    steps: -2,
    securityPerMove: 2,
    chestBonus: 0,
    reward: 1.35,
    safeHeal: 0.3,
    corrodeEvery: 0,
    clockEvery: 0,
  },
  {
    id: 'clock',
    from: 61,
    to: 80,
    name: '钟摆区 · 食堂与钟楼',
    short: '钟摆区',
    rule: '每走 5 步，钟摆扣 1 步并推高警戒；月匣品质 +1。',
    steps: 1,
    securityPerMove: 0,
    chestBonus: 1,
    reward: 1,
    safeHeal: 0.3,
    corrodeEvery: 0,
    clockEvery: 5,
    clockTime: 1,
    clockSecurity: 3,
  },
  {
    id: 'elite',
    from: 81,
    to: 100,
    name: '镜厅区 · 天台与塔顶',
    short: '镜厅区',
    rule: '守卫更硬，安全屋只恢复 15%；精英掉落与金钱更高。',
    steps: -1,
    securityPerMove: 1,
    chestBonus: 1,
    reward: 1.2,
    safeHeal: 0.15,
    corrodeEvery: 0,
    clockEvery: 0,
    elite: true,
  },
];

export const REGIONS = LEGACY_REGIONS.filter(region => region.id !== 'clock').map((region, index) => ({
  ...region, from: index * 10 + 1, to: (index + 1) * 10,
}));

export function regionForFloor(floor = 1, maxFloor = DUNGEON_FLOORS) {
  const regions = maxFloor > DUNGEON_FLOORS ? LEGACY_REGIONS : REGIONS;
  const value = Math.max(1, Math.min(regions.at(-1).to, Number(floor) || 1));
  return regions.find(region => value >= region.from && value <= region.to) ?? regions[0];
}

export function regionRangeLabel(region) {
  return `${region.from}–${region.to}F`;
}
