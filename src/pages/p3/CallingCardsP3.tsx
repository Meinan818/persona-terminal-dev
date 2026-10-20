import { motion } from 'motion/react';
import { CallingCardSection } from '@/components/callingCard/CallingCardSection';
import { GhostWords, P3R, P3RPage, slantClip, tickClip } from '@/components/p3r/kit';
import { useAppStore } from '@/store';

/** 蓝色 P3R 宣告卡总览页：视觉对位蓝版 demo，数据与操作直接接真实宣告卡组件。 */
export const CallingCardsP3 = () => {
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  return (
    <P3RPage>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative mx-auto min-w-0 max-w-2xl pb-8">
        <GhostWords words={['CALLING', 'CARD']} className="right-1 top-1 text-[58px]" />
        <header className="relative">
          <button
            type="button"
            onClick={() => setCurrentPage('menu')}
            aria-label="返回菜单"
            className="mb-3 flex h-10 items-center gap-2 text-[13px] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--p3r-blue)]"
            style={{ color: P3R.roseInk }}
          >
            <span aria-hidden className="h-0 w-0 border-y-[6px] border-r-[9px] border-y-transparent" style={{ borderRightColor: P3R.blue }} />
            返回
          </button>
          <div className="relative inline-block">
            <h1 className="relative px-8 py-2 text-[34px] font-heavy leading-none" style={{ clipPath: slantClip(16), background: P3R.blue, color: P3R.onBlue }}>
              宣告卡
            </h1>
            <span aria-hidden className="absolute bottom-0 right-2 h-[10px] w-[22px]" style={{ background: P3R.magenta, clipPath: tickClip }} />
          </div>
          <div className="mt-1.5 font-cond text-[12px] tracking-[0.3em]" style={{ color: P3R.roseInk }}>CALLING CARD</div>
          <p className="mt-2 text-[12px] font-bold" style={{ color: P3R.grey }}>为重要的事写一张宣告卡，倒计时随时在此映入眼帘</p>
        </header>

        <div className="relative mt-6">
          <CallingCardSection sectionId="calling-card-page" />
        </div>
      </motion.div>
    </P3RPage>
  );
};
