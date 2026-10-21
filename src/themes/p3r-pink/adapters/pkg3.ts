/**
 * 数据适配层：pkg3
 * 初始状态 = 原样转发 demo 假数据（外观与 demo 完全一致，用来先验收版式）。
 * 接真实数据时：在下面「真实数据覆盖区」写同名导出覆盖掉 mock 的同名导出（ES 规则：本文件显式导出优先于 export *）。
 * 规则：只在这里接 store / utils，不改 screens/ 里的 JSX、className、style、动画。
 */
export * from '../mock/pkg3';

// ───── 真实数据覆盖区（按 INTEGRATE-THEMES.md 第 6 步填写）─────
export {
  PK3_BATTLE_LOG,
  PK3_CONFIDANTS,
  PK3_COUNSEL_ARCHIVES,
  PK3_FRIENDS,
  PK3_INTERACTION_AI,
  PK3_MATERIALIZE_BLOCKERS,
  PK3_NOTIFS,
  PK3_NOTIF_TITLE,
  PK3_PACTS,
  PK3_PERSONAS,
  PK3_PROFILES,
  PK3_SHADOW,
  PK3_STARSHIFT,
  PK3_TODAY,
  pk3Events,
  shadowForConfidant,
  useCooperationData,
  type CooperationFriend,
  type Pk3Notif,
  type Pk3NotifType,
} from '@/themes/cooperationData';
