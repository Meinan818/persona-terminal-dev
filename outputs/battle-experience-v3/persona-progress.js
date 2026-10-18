/**
 * Persona 经验与等级。等级只是成长结果，具体战斗数值仍由
 * p5r-battle-adapter 按等级和覆盖计算。
 */

export function xpNeeded(level = 1) {
  return 60 + Math.max(1, Math.floor(Number(level) || 1)) * 30;
}

export function grantPersonaXp({ xp = 0, level = 1 } = {}, amount = 0) {
  let nextLevel = Math.max(1, Math.floor(Number(level) || 1));
  let nextXp = Math.max(0, Math.floor(Number(xp) || 0)) + Math.max(0, Math.floor(Number(amount) || 0));
  let leveled = 0;
  while (nextLevel < 99 && nextXp >= xpNeeded(nextLevel)) {
    nextXp -= xpNeeded(nextLevel);
    nextLevel += 1;
    leveled += 1;
  }
  return {
    xp: nextXp,
    level: nextLevel,
    leveled,
    needed: xpNeeded(nextLevel),
  };
}
