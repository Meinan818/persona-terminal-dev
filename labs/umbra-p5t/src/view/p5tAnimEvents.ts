// 原版 P5T AnimationEvent（umbra-assets p5t/1_battle/animation_events/events.csv，函数 AnimationFlagOn）里的命中帧（秒，相对该 clip 起点）。
// GunFire = GunFire clip 的 flag 0（开火帧）；Attack = Attack clip 的 flag 2（第一个标记，推断为命中帧；flag 1 在其后，推断为收招）；
// SkillActStart = 该 clip 最后一个标记（推断为技能释放帧）。int 参数的语义原版数据没写，以上对应关系为 Hark 推断。
// 由 tools/gen-anim-events.py 生成，勿手改。
import type { ClipKey } from './p5tChar';
export const HIT_EVENTS: Record<string, Partial<Record<ClipKey, number>>> = {
 "joker": {
  "SkillActStart": 0.3333,
  "GunFire": 0.0,
  "Attack": 0.6333
 },
 "skull": {
  "SkillActStart": 0.3333,
  "GunFire": 0.1,
  "Attack": 0.5333
 },
 "mona": {
  "SkillActStart": 0.4667,
  "GunFire": 0.0,
  "Attack": 0.6667
 },
 "em0001_110": {
  "GunFire": 0.1
 },
 "marie": {
  "GunFire": 0.0333,
  "ChainFishingStart": 0.6667
 },
 "fox": {
  "SkillActStart": 0.3333,
  "GunFire": 0.0,
  "Attack": 0.4667
 },
 "panther": {
  "SkillActStart": 0.3333,
  "GunFire": 0.0,
  "Attack": 0.5333
 },
 "em0001_016": {
  "GunFire": 0.1
 },
 "em0002_010": {
  "Attack": 0.5667
 },
 "em0003_010": {
  "SkillActStart": 0.2333,
  "Attack": 0.3333
 },
 "fox_bw": {
  "SkillActStart": 0.3333,
  "GunFire": 0.0,
  "Attack": 0.4667
 },
 "panther_bw": {
  "SkillActStart": 0.3333,
  "GunFire": 0.0,
  "Attack": 0.5333
 },
 "queen": {
  "SkillActStart": 1.0,
  "GunFire": 0.0,
  "Attack": 0.6333
 },
 "erina": {
  "SkillActStart": 0.8333,
  "GunFire": 0.0,
  "Attack": 0.6
 },
 "em0001_610": {
  "GunFire": 0.1
 }
};
