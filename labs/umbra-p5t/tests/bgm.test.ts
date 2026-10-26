import { describe, it, expect } from 'vitest';
import { LEVEL_BGM, BGM_TRACKS, bgmForLevel } from '../src/view/bgmData';

describe('r13 BGM 映射（原版 stages.csv BgmId）', () => {
  it('BgmId − 30000 = ACB 序号；有导出的用原曲，没导出的标 substitute', () => {
    expect(LEVEL_BGM.L03).toMatchObject({ stageId: 1030, bgmId: 30021, origCue: 'bgm_021', track: 'bgm_021', substitute: false });
    expect(LEVEL_BGM.L06.track).toBe('bgm_025');
    expect(LEVEL_BGM.L10.track).toBe('bgm_038');
    expect(LEVEL_BGM.L01).toMatchObject({ origCue: 'bgm_002', substitute: false, track: 'bgm_002' }); // r15 d 系列到货
    expect(LEVEL_BGM.L04.track).toBe('bgm_003'); expect(LEVEL_BGM.L08.track).toBe('bgm_001');
    expect(bgmForLevel('demo-x').track).toBe('bgm_021');
  });
  it('loop 点在曲内且 start<end', () => {
    for (const t of Object.values(BGM_TRACKS)) { expect(t.loopStart).toBeGreaterThan(0); expect(t.loopEnd).toBeGreaterThan(t.loopStart); }
  });
});
