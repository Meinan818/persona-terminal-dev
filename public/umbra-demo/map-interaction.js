const DIRECTIONS = [
  ['up', 0, -1],
  ['right', 1, 0],
  ['down', 0, 1],
  ['left', -1, 0],
];

export function adjacentRoomDirection(from, to) {
  if (!from || !to) return null;
  const dx = Number(to.x) - Number(from.x);
  const dy = Number(to.y) - Number(from.y);
  return DIRECTIONS.find(([, stepX, stepY]) => dx === stepX && dy === stepY)?.[0] ?? null;
}
