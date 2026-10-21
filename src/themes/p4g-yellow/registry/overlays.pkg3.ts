/**
 * 工作包 3 的弹窗登记（只由工作包 3 的代理修改）。路由：#/overlay/<key>（key = INVENTORY 里的路由 id）
 */
import type { OverlayRegistry } from './types';

const bd = 'page:cooperation';
export const overlays: OverlayRegistry = {
  'bond-menu': { title: '同伴系统菜单', load: () => import('@yellow/screens/overlays/CooperationMenu.p4g'), backdrop: bd },
  'bond-create': { title: '结识一位同伴', load: () => import('@yellow/screens/overlays/ConfidantCreateModal.p4g'), backdrop: bd },
  'bond-detail': { title: '同伴详情', load: () => import('@yellow/screens/overlays/ConfidantDetailModal.p4g'), backdrop: bd },
  'bond-sync-avatar-confirm': { title: '同步换成卡面？', load: () => import('@yellow/screens/overlays/ConfidantDetailModalAvatarConfirm.p4g'), backdrop: bd },
  'bond-delete-confirm': { title: '彻底删除同伴确认', load: () => import('@yellow/screens/overlays/ConfidantDetailModal.p4g').then((m) => ({ default: m.DeleteConfirmDemo })), backdrop: bd },
  'bond-unbind-confirm': { title: '解除 COOP 确认', load: () => import('@yellow/screens/overlays/ConfidantDetailModal.p4g').then((m) => ({ default: m.UnbindConfirmDemo })), backdrop: bd },
  'bond-interaction': { title: '今日互动', load: () => import('@yellow/screens/overlays/ConfidantInteractionModal.p4g'), backdrop: bd },
  'bond-memorial': { title: '共战纪念', load: () => import('@yellow/screens/overlays/CoopMemorialPanel.p4g'), backdrop: bd },
  'bond-pact-panel': { title: '一起进步面板', load: () => import('@yellow/screens/overlays/PactPanel.p4g'), backdrop: bd },
  'bond-pact-create': { title: '发起一起进步', load: () => import('@yellow/screens/overlays/PactModals.p4g'), backdrop: bd },
  'bond-pact-respond': { title: '回应一起进步邀请', load: () => import('@yellow/screens/overlays/PactModals.p4g').then((m) => ({ default: m.PactRespondDemo })), backdrop: bd },
  'bond-counsel-chat': { title: '谏言对话', load: () => import('@yellow/screens/overlays/CounselChatModal.p4g') },
  'bond-counsel-archive': { title: '谏言归档库', load: () => import('@yellow/screens/overlays/CounselArchiveModal.p4g'), backdrop: bd },
  'bond-notifications': { title: '通知面板', load: () => import('@yellow/screens/overlays/NotificationsPanel.p4g'), backdrop: bd },
  'bond-add-online': { title: '邀请在线同伴', load: () => import('@yellow/screens/overlays/AddOnlineConfidantModal.p4g'), backdrop: bd },
  'bond-online-profile': { title: '在线同伴名片', load: () => import('@yellow/screens/overlays/OnlineConfidantProfileCard.p4g'), backdrop: bd },
  'bond-coop-propose': { title: '发起 COOP 提议', load: () => import('@yellow/screens/overlays/CoopProposeModal.p4g'), backdrop: bd },
  'bond-coop-accept': { title: '响应 COOP 提议', load: () => import('@yellow/screens/overlays/CoopAcceptModal.p4g'), backdrop: bd },
  'bond-coop-ai-match': { title: '星象匹配', load: () => import('@yellow/screens/overlays/CoopAiMatchModal.p4g'), backdrop: bd },
  'bond-prayer-fx': { title: '祈愿特效', load: () => import('@yellow/screens/overlays/PrayerEffectOverlay.p4g'), backdrop: bd },
  'bond-shadow-battle': { title: '羁绊之影共斗', load: () => import('@yellow/screens/overlays/CoopShadowBattleModal.p4g') },
  'bond-allout': { title: '总攻击演出', load: () => import('@yellow/screens/overlays/AllOutOverlay.p4g') },
  'bond-victory': { title: '共战结算', load: () => import('@yellow/screens/overlays/CoopVictoryScreen.p4g') },
  'bond-rankup-cutin-p4': { title: '羁绊升级演出 · 电视节目版', load: () => import('@yellow/screens/overlays/ConfidantRankUpCutInP4.p4g'), backdrop: bd },
  'bond-celebrate-p4': { title: '亲密度升级恭喜页', load: () => import('@yellow/screens/overlays/ConfidantCelebrateScreenP4.p4g'), backdrop: bd },
  'bond-starshift-p4': { title: '星移 · 电视剪辑版', load: () => import('@yellow/screens/overlays/ConfidantStarShiftModalP4.p4g'), backdrop: bd },
  'bond-p4-cinema': { title: '升级链电影层', load: () => import('@yellow/screens/overlays/ConfidantP4FxLayer.p4g'), backdrop: bd },
};
