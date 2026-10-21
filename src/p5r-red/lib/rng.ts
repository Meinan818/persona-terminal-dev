/** 确定性随机（mulberry32，同 seed 恒同形）—— 与原 P5.rng 逐位一致。 */
export const rng = (seed: number) => {
  let a = (Math.round(seed * 1000) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
