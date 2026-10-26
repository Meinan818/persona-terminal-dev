// r13：每关战斗 BGM —— 原版数据 p5t/1_data/stages.csv 的 BgmId（StageSettingData/stage_database 原值）。
// BgmId → 曲目：BgmId − 30000 = sound/bgm/ 下 ACB 文件序号（000_bgm_d00 … 100_bgm_s20）。
//   这个对应关系是推断，但已用原版第一章录像验证：第 3 场战斗（StageId 1030，BgmId 30021）的录像音轨与 021_bgm_b01 频谱互相关 0.73/0.50（两段独立片段），
//   其它 19 首 b 系列 ≤0.11。见 notes/P5T-R13。
// umbra-assets 目前只导出了 b01–b20（021–040）。d 系列（001–020，第一章 1010/1020/1040/1050/1070/1210 用）未导出 →
//   这些关先用 021_bgm_b01（第一章录像里确认出现的战斗曲）代替，标 substitute（推断替代，非原版指定）。
export interface BgmTrack { file: string; loopStart: number; loopEnd: number; rate: number }
/** p5t/1_audio/bgm/index.csv 原值（loop 点 = AWB 头里的采样值） */
export const BGM_TRACKS: Record<string, BgmTrack> = {
  bgm_021: { file: 'bgm_021', loopStart: 934639, loopEnd: 6746531, rate: 48000 },
  bgm_025: { file: 'bgm_025', loopStart: 843467, loopEnd: 17327368, rate: 48000 },
  bgm_038: { file: 'bgm_038', loopStart: 1077201, loopEnd: 7967668, rate: 48000 },
};
export interface LevelBgm { stageId: number; bgmId: number; origCue: string; track: keyof typeof BGM_TRACKS; substitute: boolean }
const bank = (id: number) => `bgm_${String(id - 30000).padStart(3, '0')}`;
const L = (stageId: number, bgmId: number): LevelBgm => {
  const origCue = bank(bgmId);
  const has = origCue in BGM_TRACKS;
  return { stageId, bgmId, origCue, track: (has ? origCue : 'bgm_021') as keyof typeof BGM_TRACKS, substitute: !has };
};
/** 我们的关卡 → 原版 StageId（见各关 JSON 的 source）→ BgmId（stages.csv） */
export const LEVEL_BGM: Record<string, LevelBgm> = {
  L01: L(1010, 30002), // d02 未导出 → 替代
  L02: L(1020, 30002), // d02 未导出 → 替代
  L03: L(1030, 30021), // b01 原版 ✓（录像验证）
  L04: L(1040, 30003), // d03 未导出 → 替代
  L05: L(1050, 30003), // d03 未导出 → 替代
  L06: L(1090, 30025), // b05 原版 ✓
  L07: L(1080, 30021), // b01 原版 ✓
  L08: L(1210, 30001), // d01 未导出 → 替代
  L09: L(1070, 30001), // d01 未导出 → 替代
  L10: L(1180, 30038), // M22 = ListId 22 首个 StageId 1180 → b18 原版 ✓（1181/1182 用 b03、1183 用 b02，阶段对应未知，没用）
};
export function bgmForLevel(id: string): LevelBgm { return LEVEL_BGM[id] ?? L(0, 30021); }
