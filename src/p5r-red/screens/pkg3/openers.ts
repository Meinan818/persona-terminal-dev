// @ts-nocheck —— pkg3 弹层 / 演出的直达入口：inventory id / fx id → 调命令式组件（同一组件多状态用 ?step= / ?state= / ?variant= / ?tab=）。
import { P5 } from './p5';
import { OC } from './oc';
import { OD } from './od';
import { openFlip, nameFx, memberMenu, postMenu, confirmBox, report, OPS } from './hideout';
import { navigate } from '@/p5r-red/shell/shellBus';

type Q = URLSearchParams;
const CF = () => OC.CF;
const low = () => P5.reduced();
/** 在 el 出现后点它（演示自动推进；最多等 maxMs） */
const clickWhen = (sel: string, delay: number, maxMs = 8000) => new Promise<boolean>((res) => {
  const t0 = performance.now();
  const tick = () => { const el = document.querySelector(sel) as HTMLElement | null; if (el && !el.disabled && el.offsetParent !== null) { el.click(); res(true); return; } if (performance.now() - t0 > maxMs) { res(false); return; } setTimeout(tick, 120); };
  setTimeout(tick, delay);
});

/** RANK UP → 确认 → 恭喜 → 使用星移 → 星移（input → thinking → preview → done）一条龙自动连播（FIXLIST 四-d） */
export async function cinema(q?: Q) {
  const cf = CF()[0]; cf.starShiftCharges = Math.max(1, cf.starShiftCharges || 0);
  OC.rankUp(cf, { oldLevel: 6, newLevel: 7 });
  const L = low();
  if (q?.get('auto') === '0') return;
  if (!(await clickWhen('.oc-rk .rk-confirm.on .go', L ? 500 : 5900))) return;
  if (!(await clickWhen('.oc-cl [data-a="shift"]', L ? 700 : 2600))) return;
  if (!(await clickWhen('.oc-sf [data-a="start"]', L ? 700 : 1700))) return;
  await clickWhen('.oc-sf [data-a="ink"]', L ? 400 : 1500);
}

const confirmTexts = {
  avatar: () => OC.confirm({ eyebrow: 'CARD FACE', title: '同步换成卡面？', text: '选「同步」会把羁绊墙上这位同伴的整张塔罗牌面换成刚上传的图；选「只当头像」则仅在档案里用它，牌面保持塔罗。', ok: '同步卡面', cancel: '只当头像', onOk: () => P5.toast('已同步为卡面') }),
  del: () => { const cf = CF()[0]; OC.confirm({ eyebrow: 'DANGER', title: `确认彻底删除 ${cf.name}？`, text: '此操作不可撤销', list: ['这位同伴的档案、亲密度、能力解锁将一并被抹去', '所有互动记录与星移痕迹也会被清空', 'Ta 所占用的塔罗大阿卡纳将被释放，可重新分配给新的同伴', '如果只是暂时不想看见 Ta，建议使用「暂时归档」'], ok: '确认删除', onOk: () => P5.toast('已删除') }); },
  sever: () => { const cf = CF()[3]; OC.confirm({ eyebrow: 'SEVER COOP', title: `解除与 ${cf?.linkedProfile?.nickname ?? ''} 的 COOP 契约`, text: '解除后，本端的同伴卡会自动归档；对方下次同步时，那边的卡也会归档。<br>7 天内无法再次缔结 COOP。已积累的羁绊与历史会保留在归档里。', ok: '确认解除', onOk: () => P5.toast('已解除 COOP · 同伴卡已归档') }); },
};

/** ConfidantNameFx 名字特效演示（待回祈流光 / 满级粒子 / 两态叠加），挂在列表条目同款黑底上 */
function nameFxDemo(q?: Q) {
  const v = q?.get('variant') || 'all';
  const rows = [['waiting', '待回祈 · 流光扫过', { waiting: true }, '新岛真'], ['max', '满级 Lv.10 · 猩红 + 上浮粒子', { max: true }, '佐仓双叶'], ['both', '两态叠加（流光优先，满级色作基色）', { waiting: true, max: true }, '明智吾郎']].filter((r) => v === 'all' || r[0] === v);
  OC.dialog({ eyebrow: 'ConfidantNameFx', title: '名字特效', sub: '同伴 / 好友名字本身的两种状态（列表 / 专辑墙共用）', size: 's', seed: 351, cls: 'pk3-nfx-dlg',
    body: `<div class="pk3-nfx-demo">${rows.map(([, l, o, n]) => `<div class="pk3-nfx-row"><span class="cp-li-n">${nameFx(n, o)}<em class="cp-on">ONLINE</em></span><small>${l}</small></div>`).join('')}<p class="oc-note">低动效档两种动画都停，只留静态色。</p></div>` });
}

export const OPEN: Record<string, (q: Q) => unknown> = {
  /* ── 羁绊 ── */
  'bond-menu': () => navigate('cooperation', { via: 'none', replace: true, params: { menu: '1' } }),
  'bond-create': (q) => OC.createModal({ stage: q.get('step') || 'basic' }),
  'bond-detail': (q) => {
    const v = q.get('variant'); const cf = v === 'online' || v === 'readonly' ? CF()[3] : v === 'archived' ? Object.assign({}, CF()[1], { archivedAt: '2026-10-19' }) : CF()[0];
    const d = OC.detail(cf, { readonly: v === 'readonly' }); const tab = q.get('tab');
    if (tab && tab !== 'info') d.dlg.querySelector(`.oc-tabs [data-v="${tab}"]`)?.click();
  },
  'bond-sync-avatar-confirm': () => confirmTexts.avatar(),
  'bond-delete-confirm': () => confirmTexts.del(),
  'bond-unbind-confirm': () => confirmTexts.sever(),
  'bond-interaction': (q) => OC.interaction(CF()[0], { stage: q.get('step') || q.get('state') || 'input', alreadyToday: q.get('state') === 'today' }),
  'bond-memorial': (q) => OC.memorial(CF()[3], { empty: q.get('state') === 'empty' }),
  'bond-pact-panel': (q) => OC.pactPanelModal('新岛真', q.get('state') || 'active'),
  'bond-pact-create': () => OC.pactPropose('新岛真'),
  'bond-pact-quick': () => OC.pactQuick(),
  'bond-arcana-picker': () => OC.arcanaPicker(),
  'bond-pact-respond': (q) => OC.pactAccept('新岛真', { state: q.get('state') || 'open' }),
  'bond-counsel-chat': (q) => {
    const s = q.get('state'); const dlg = q.get('dialog');
    const d = OC.counselChat({ state: s === 'expired' || s === 'cooldown' ? s : dlg ? 'live' : 'start', mention: CF()[0] });
    if (dlg === 'leave') setTimeout(() => d.dlg.querySelector('[data-a="exit"]')?.click(), 60);
    if (dlg === 'archive') setTimeout(() => d.body.querySelector('[data-a="arch"]')?.click(), 60);
  },
  'bond-counsel-archive': (q) => OC.counselArchive({ empty: q.get('state') === 'empty' }),
  'bond-notifications': (q) => OC.notifications({ state: q.get('state') || 'list' }),
  'bond-add-online': (q) => OC.addOnline({ phase: q.get('step') || 'search' }),
  'bond-online-profile': (q) => OC.profileCard({ coop: q.get('state') || 'linked' }),
  'bond-coop-propose': (q) => OC.propose('新岛真', { phase: q.get('step') || 'choice' }),
  'bond-coop-accept': (q) => OC.accept('坂本龙司', { phase: q.get('step') || 'choice' }),
  'bond-coop-ai-match': (q) => OC.aiMatch('新岛真', { stage: q.get('step') || 'description' }),
  'bond-prayer-fx': (q) => OC.prayer({ kind: q.get('variant') === 'recip' ? 'reciprocal' : 'sent' }),
  'bond-shadow-battle': (q) => OC.shadowBattle({ phase: q.get('step') || 'battle' }),
  'bond-allout': () => OC.allOut({}),
  'bond-victory': (q) => OC.victory({ win: q.get('variant') !== 'retreat' }),
  'bond-rankup-cutin-p5': () => OC.rankUp(CF()[0], { oldLevel: 6, newLevel: 7 }),
  // 同 v3 c.js reg：有星移 = CF[0] 原等级；无星移 = CF[1]
  'bond-celebrate-p5': (q) => { const zero = q.get('variant') === 'zero'; OC.celebrate(CF()[zero ? 1 : 0], { charges: zero ? 0 : 1 }); },
  'bond-starshift-p5': (q) => { const cf = CF()[0]; cf.starShiftCharges = Math.max(1, cf.starShiftCharges || 0); OC.starShift(cf, { stage: q.get('stage') || 'input' }); },
  'bond-p5-cinema': (q) => cinema(q),
  'bond-namefx': (q) => nameFxDemo(q),
  'bond-wall-spin': () => OC.wallSpin(),
  /* ── 据点 ── */
  'hideout-member-flip': (q) => openFlip(q.get('member') || 'm2'),
  'hideout-member-menu': (q) => memberMenu(q.get('member') || 'm2', document.createElement('div')),
  'hideout-board-menus': (q) => { const k = q.get('step') || 'menu'; if (k === 'report') report('post'); else if (k === 'delete') confirmBox('删除这条动态？', '「跑完了第一个五公里！」和它上面的标签会一起删除。', '删除', () => P5.toast('删掉了')); else postMenu('p1', document.createElement('div')); },
  'hideout-op-dialogs': (q) => {
    const k = q.get('step') || 'menu'; const o = OPS[0] || { title: '全员期中周冲刺', big: true };
    if (k === 'out') confirmBox('这次不参加？', '你会从这场作战的名单里退出，任务里那条会收起来。退出之后不能再回来。', '不参加了', () => P5.toast('这次不参加了，任务里那条已经收起来'), '再想想');
    else if (k === 'cancel') confirmBox('取消这个作战？', `「${o.title}」：所有人任务里的这一条都会收起来，已经做完的不受影响。这一步不能撤销。`, '取消作战', () => P5.toast('作战已取消'), '再想想');
    else P5.actionSheet(o.title, [{ label: '举报这个作战', onClick: () => report('op') }, { label: '屏蔽发起人（只在本机生效）', onClick: () => P5.toast('已屏蔽，不再显示 Ta 的动态') }]);
  },
  'hideout-op-create': (q) => OD.openOpCreate(q.get('variant') === 'big' ? 'big' : 'small'),
  'hideout-raid': (q) => OD.openRaid(q.get('state') || 'night'),
  'hideout-borrow-mask': (q) => OD.openBorrowMask(q.get('state') || 'ok'),
  'hideout-settings': (q) => OD.openOrgSettings(q.get('variant') !== 'member'),
  'hideout-settings-confirm': (q) => {
    const k = q.get('step') || 'code', C = OD.confirm, n = '坂本龙司', O = OD.ORG.name;
    if (k === 'kick') OD.sheet(`请「${n}」离开？`, `<p class="sh-p">对方会从名册里消失；邀请码会一起换掉，旧码不能再用。</p><div class="tg"><b>同时删除 Ta 的动态和标签</b><i class="sw" role="switch" aria-checked="false" tabindex="0"></i></div><div class="sh-acts">${P5.ui.btn('取消', { tone: 'ink', seed: 761, attrs: 'data-x' })}${P5.ui.btn('请离', { tone: 'red', size: 'lg', seed: 762, attrs: 'data-ok' })}</div>`, (s2, c2) => { s2.querySelector('[data-x]').onclick = c2; s2.querySelector('[data-ok]').onclick = () => { c2(); P5.toast(`已请离「${n}」，邀请码也换了新的`); }; });
    else if (k === 'give') C(`把队长交给「${n}」？`, '转让之后你是普通成员，改资料、换码、请离都由新队长来做。', '转让', () => P5.toast(`队长已经交给「${n}」`), { danger: false });
    else if (k === 'leave') C(`退出「${O}」？`, '你的成员牌会从名册里拿掉，你在这里分享的动态和贴的标签也会一起删除；以后想回来要重新拿邀请码。', '退出', () => P5.toast('已退出'));
    else if (k === 'dissolve') C(`解散「${O}」？`, '组织、名册会一起删除，所有成员都会收到「你已不在」的提示。这一步不能撤销。', '解散', () => P5.toast('组织已解散'));
    else C('换一个邀请码？', '旧码会立即作废，已经在组织里的人不受影响。', '换码', () => P5.toast('换好了，旧码已经作废'), { danger: false });
  },
  'hideout-titles': (q) => OD.openOrgTitles(q.get('variant') !== 'member'),
  'hideout-onboarding': (q) => openOnboard(q),
  'hideout-org-celebration': (q) => OD.openOrgCeleb(q.get('variant') || 'level'),
  'hideout-map': (q) => OD.openHideoutMap(q.get('state') || 'raid'),
  'hideout-meeting-room': (q) => OD.openMeeting(q.get('state') || 'open'),
  'hideout-share': (q) => OD.openShareToOrg(q.get('state') || 'form'),
};

/** 组织引导：?flow=create|join&step=rules|info|code|preview|card|name|welcome（自动点「下一步」推进到目标步） */
function openOnboard(q: Q) {
  const step = q.get('step') || 'rules';
  const flow = q.get('flow') || (step === 'join' || step === 'code' || step === 'preview' ? 'join' : 'create');
  OD.openOrgOnboard(flow);
  const seq = flow === 'create' ? ['rules', 'info', 'card', 'name', 'welcome'] : ['rules', 'code', 'preview', 'card', 'name', 'welcome'];
  const target = step === 'create' ? 'info' : step === 'join' ? 'code' : step === 'codename' ? 'name' : step;
  const n = Math.max(0, seq.indexOf(target));
  let i = 0;
  const adv = () => { if (i >= n) return; const b = document.querySelector('.sheet-veil [data-host] [data-next]') as HTMLElement | null; if (!b) return; b.click(); i++; setTimeout(adv, b.dataset.busy ? 620 : 90); };
  setTimeout(adv, 80);
}

/* ── 演出 fx id（#/overlay/fx-*） ── */
Object.assign(OPEN, {
  'fx-rankup': OPEN['bond-rankup-cutin-p5'],
  'fx-celebrate': () => OPEN['bond-celebrate-p5'](new URLSearchParams()),
  'fx-celebrate-0': () => OPEN['bond-celebrate-p5'](new URLSearchParams('variant=zero')),
  'fx-starshift-input': () => OPEN['bond-starshift-p5'](new URLSearchParams('stage=input')),
  'fx-starshift-loading': () => OPEN['bond-starshift-p5'](new URLSearchParams('stage=thinking')),
  'fx-starshift-preview': () => OPEN['bond-starshift-p5'](new URLSearchParams('stage=preview')),
  'fx-starshift-done': () => OPEN['bond-starshift-p5'](new URLSearchParams('stage=done')),
  'fx-starshift-error': () => OPEN['bond-starshift-p5'](new URLSearchParams('stage=error')),
  'fx-cinema': (q: Q) => cinema(q),
  'fx-prayer': () => OC.prayer({ kind: 'sent' }),
  'fx-prayer-recip': () => OC.prayer({ kind: 'reciprocal' }),
  'fx-allout': () => OC.allOut({}),
  'fx-victory': () => OC.victory({ win: true }),
  'fx-victory-retreat': () => OC.victory({ win: false }),
  'fx-namefx': (q: Q) => nameFxDemo(q),
  'fx-wall-spin': () => OC.wallSpin(),
  'fx-org-level': () => OD.openOrgCeleb('level'),
  'fx-org-raid': () => OD.openOrgCeleb('raid'),
  'fx-org-op': () => OD.openOrgCeleb('op'),
  'fx-raid-strike': () => { OD.openRaid('night'); clickWhen('.sheet-veil [data-act="hit"]', low() ? 200 : 900); },
  'fx-member-flip': () => { openFlip('m2'); if (!low()) setTimeout(() => (document.querySelector('.og-fv .og-fv-card') as HTMLElement | null)?.click(), 1100); },
});
