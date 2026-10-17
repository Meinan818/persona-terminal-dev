import { P5Collage, P5R, P5Rough, P5_TITLE_FONT } from '@/components/p5r/kit';

const ANGLES = [-7, 4, -3, 6, -5, 2, -4, 5, -2, 7, -6];
const OFFSETS = [1, -2, 3, 0, -3, 2, -1, 4, -2];
const SCALES = [1.12, 0.94, 1.02, 0.97, 1.08, 0.92, 1.04];

/** 验证码预告函的剪报正文：纸片逐字独立，位置由固定种子决定。 */
function PastedLine({ text, seed, loud = false, rot = 0 }: {
  text: string;
  seed: number;
  loud?: boolean;
  rot?: number;
}) {
  return (
    <p className="relative flex flex-wrap items-center justify-center gap-x-[2px] gap-y-2 py-1" style={{ transform: `rotate(${rot}deg)` }}>
      <span className="sr-only">{text}</span>
      {Array.from(text).map((ch, i) => {
        const n = seed + i;
        const redPaper = i === 0 || (loud && i % 4 === 1);
        const lightPaper = !redPaper && n % 7 === 0;
        const redInk = !redPaper && !lightPaper && n % 4 === 0;
        const punctuation = /[，。：！「」—]/.test(ch);
        return (
          <span
            key={i}
            aria-hidden="true"
            data-calling-card-tile=""
            className="relative inline-flex shrink-0 items-center justify-center font-black"
            style={{
              width: punctuation ? '0.74em' : '1.2em',
              height: `${n % 3 === 0 ? 1.5 : 1.36}em`,
              fontSize: `${(punctuation ? 0.9 : SCALES[n % SCALES.length]) * (loud ? 1.15 : 1)}em`,
              lineHeight: 1,
              fontFamily: P5_TITLE_FONT,
              marginTop: OFFSETS[n % OFFSETS.length],
              transform: `rotate(${ANGLES[n % ANGLES.length]}deg)`,
              color: lightPaper ? P5R.ink : redInk ? '#ff454b' : P5R.white,
              zIndex: n % 3,
            }}
          >
            <P5Rough seed={n * 1.71} jag={1.1} frame={1.3} face={redPaper ? P5R.red : lightPaper ? P5R.paper : P5R.ink} frameColor={P5R.paper} shadow={{ x: 2, y: 3 }} />
            <span className="relative">{ch}</span>
          </span>
        );
      })}
    </p>
  );
}

export function P5CallingCard() {
  return (
    <section aria-label="预告函已送达" className="relative overflow-hidden px-3 pb-5 pt-3" style={{ background: P5R.ink }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ background: `repeating-radial-gradient(circle at 52% 57%, ${P5R.ink} 0 30px, ${P5R.red} 31px 62px)` }} />
      <div className="relative flex items-center justify-between px-1 text-[9px] font-black tracking-[0.16em]" style={{ color: P5R.paper }}>
        <span className="bg-black px-2 py-1">MASKARIA</span>
        <span className="bg-black px-2 py-1">CLOUD · ACCESS</span>
      </div>
      <h2 className="sr-only">预告函已送达</h2>
      <div className="relative mb-3 mt-4 flex justify-center pb-2" aria-hidden="true">
        <P5Collage size={33} gap={3} tiles={[
          { ch: '预', bg: P5R.red, fg: P5R.white, scale: 1.13, rot: -9, dy: 0 },
          { ch: '告', bg: P5R.ink, fg: P5R.paper, scale: 0.97, rot: 4, dy: 8 },
          { ch: '函', bg: P5R.ink, fg: P5R.redHot, scale: 1.05, rot: -5, dy: 4 },
        ]} />
      </div>
      <div className="relative space-y-1" style={{ fontSize: 'clamp(18px, 5.5vw, 26px)' }}>
        <PastedLine text="致一成不变的日常：" seed={12} rot={-3} />
        <PastedLine text="封锁下一幕的门，" seed={37} rot={1.8} />
        <PastedLine text="已被我等锁定。" seed={53} rot={-1.4} />
        <PastedLine text="揭下面具，" seed={76} loud rot={2.2} />
        <PastedLine text="夺回你的可能性！" seed={91} loud rot={-2} />
      </div>
      <div className="relative ml-auto mt-3 w-fit max-w-full" style={{ fontSize: 'clamp(9px, 2.8vw, 12px)' }}>
        <PastedLine text="MASKARIA，参上！" seed={115} rot={-3} />
      </div>
    </section>
  );
}
