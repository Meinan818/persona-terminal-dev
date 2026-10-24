// Plan 02 R02: enrich the 87 unresolved file-level differences with branch evidence.
// This does not change application code or claim that deferred runtime acceptance is complete.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(process.argv[2] ?? 'docs/THEME-BEHAVIOR-AUDIT-20261024.json');
const audit = JSON.parse(readFileSync(path, 'utf8'));
const pending = audit.differences.filter((item) => item.category === '待确认');
if (pending.length !== 87) throw new Error(`Expected 87 unresolved differences, found ${pending.length}`);

const groups = [
  {
    match: /^src\/p5r-red\/adapter\/live\.ts$/,
    plan: '03',
    issues: ['B08', 'B11'],
    detail: 'R02：补丁把红色全局 D 数据从固定 mock 扩成 live 快照，覆盖同伴、预算、流水 ID、近 9 日支出和岁时记录，并订阅 budgets；字段映射本身已可追溯。固定分类/牌阵常量不等于 live 全字段完成，真实缺失字段回退与同步等价仍由计划03/05/09核。',
    boundary: '静态核对 live 映射与订阅；未做真实组织/预算/流水写入、失败注入或逐字段空值穷举。',
  },
  {
    match: /^src\/p5r-red\/screens\/pages\/DashboardP5\.p5r\.tsx$/,
    plan: '04',
    issues: ['B07', 'B09'],
    detail: 'R02：`check()` 先乐观增加本地计数，完成后等待650ms读取 store 的 level/achievement/skill 三种通知，串行清除并交给局部 `playQueue`；拒绝时仅 return，catch 为空。来源与局部消费者已确认，但只覆盖当前页完成链，BIG DEAL、愿望、组织、宣告卡等跨页通知没有红色全局宿主，失败后的本地回滚也未闭合。',
    boundary: '静态确证局部生产/消费顺序；未动态验证真实升级、跨页通知、拒绝或写入失败。',
  },
  {
    match: /^src\/p5r-red\/screens\/pages\/Activities\.p5r\.tsx$/,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：行动增删改调用真实 store，但页面先修改本地数组/节点再 `void` 写库，记录与任务的部分 catch 为空。差异是真实接线，不是演示数据残留；失败恢复、重入和刷新一致性尚未闭合。',
    boundary: '静态确证 store 调用与乐观更新；未做拒绝、断网或刷新恢复。',
  },
  {
    match: /^src\/p5r-red\/screens\/pages\/Account\.p5r\.tsx$/,
    plan: '06',
    issues: ['B01', 'B08'],
    detail: 'R02：身份、UserID、最近同步和活跃天数改读真实 cloud/user/activity 数据；账号操作由 AccountBlocks 承接，配图备份的固定 MB/张数文案仍存在。真实身份显示与假成功操作风险是两条链，不能据页面真实 ID 判退出/删号/备份完成。',
    boundary: '静态确证真实身份读取；未执行真实退出、删云或备份。',
  },
  {
    match: /^src\/p5r-red\/screens\/overlays\/NavigatorWindow\.p5r\.tsx$/,
    plan: '10',
    issues: ['B10', 'B09'],
    detail: 'R02：记账/任务草稿已能转换为可执行动作，消息和设置仍以本地会话状态为主；自由回复、会话持久化、取消/超时/离线闭环不能由可执行草稿证明。',
    boundary: '静态确证草稿执行入口；未发模型请求，未做对话恢复或取消测试。',
  },
  {
    match: /^src\/p5r-red\/screens\/pkg4\/todos4\.ts$/,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：任务、愿望和宣告卡的增删改/归档已调用真实 store，但仍普遍先改本地 DOM/数组再 `void` 写库，多个 `.catch(() => {})` 吞失败。差异已解释为乐观写回接入，失败恢复和完成/拒绝/刷新闭环未成立。',
    boundary: '静态确证调用点与空 catch；未注入失败或检查刷新后一致。',
  },
  {
    match: /^src\/p5r-red\/screens\/pkg4\/ledger4\.ts$/,
    plan: '05',
    issues: ['B03', 'B09'],
    detail: 'R02：流水合计、预算、余额、对账和近 9 日支出已接真实 ledger store；CAT_TYPE 仍是固定 UI 映射，预算月份口径和写入失败恢复未在本轮闭合。',
    boundary: '静态确证读写接线；未使用真实账本，未做月份错位、删除失败或重入。',
  },
  {
    match: /^src\/p5r-red\/screens\/pkg4\/d4\.ts$/,
    plan: '09',
    issues: ['B08', 'B09'],
    detail: 'R02：愿望、委托、命运签和周目标已从真实 store 派生，`WISHES.splice` 等路径替换了固定愿望；`LR_CARDS` 牌阵、CAT 分类和空库演示文字仍保留。真实接入与剩余常量混在同一文件，后续必须按功能拆开核，不能整文件判完成。',
    boundary: '静态确证真实数据替换范围；未验证空库、AI解读、牌阵映射和写失败。',
  },
  {
    match: /^src\/p5r-red\/screens\/pkg3\/oc\.ts$/,
    plan: '07',
    issues: ['B05', 'B14'],
    detail: 'R02：同伴详情、时间线、星移参考改读真实 id/confidantEvents，等级改共用阈值，搜索邀请与在线资料接真实服务；解除/删除确认里的演示 opener 是否仍可从正式页面到达、以及升级/星移演出是否重复消费尚未验证。',
    boundary: '静态确证真实同伴读取与部分回调；未执行真实邀请、解约、删除或升级互动。',
  },
  {
    match: /^src\/p5r-red\/shell\/shell\.css$/,
    plan: '11',
    issues: ['B13'],
    detail: 'R02：差异为中间键增加 `touch-action:none`、文本选择等触摸/可访问性控制。它是可感知交互与视觉差异，不是普通样式整理；历史授权和真机手感未在本轮核定。',
    boundary: '静态属性差异确证；未在触屏设备验证滑动、选择或误触。',
  },
  {
    match: /^src\/p5r-red\/shell\/RadialWheelP5\.p5r\.tsx$/,
    plan: '11',
    issues: ['B13'],
    detail: 'R02：轮盘缩放系数、半径/死区和随机高亮相对原包有差异，其中缩小轮盘有历史用户要求记录。代码差异已解释为历史可见调整，但不能据此声称当前视觉已验收。',
    boundary: '静态与STATE历史记录交叉；未做同机同视口像素或手感验收。',
  },
  {
    match: /^src\/p5r-red\/legacy\/css\/a\.css$/,
    plan: '11',
    issues: ['B13'],
    detail: 'R02：轮盘选中文字由 `mix-blend-mode:multiply` 改为 `isolation:isolate`，属于明确可见效果差异，现保留原改法。当前授权和最终观感未核，不能在修复前擅自回退。',
    boundary: '静态CSS差异确证；未做浏览器同环境视觉对照。',
  },
  {
    match: /\/setup\/AI|AISection\./,
    plan: '10',
    issues: ['B10'],
    detail: 'R02：AI Key 与模型字段通过 settingsStore 写回真实 settings；连接测试、逐档测试和模型列表刷新明确显示“未启用/未执行”，不再伪造成功或模型数。真实连接能力仍是缺口。',
    boundary: '静态确证保存映射和诚实失败文案；未发收费模型请求。',
  },
  {
    match: /\/pkg6\/settingsStore\.ts$/,
    plan: '09',
    issues: ['B10'],
    detail: 'R02：设置 store 用 `TO_REAL` 把声音、背景、属性/阈值、记账、AI 模型、通知槽等字段写回真实 settings；天气 Key/城市、BGM 曲目映射、`splashSpeed`、通知权限和部分 Persona 展示状态仍只在本主题状态中存在，没有一一对应的安全落库口径。',
    boundary: '静态确证字段映射与未映射字段；未验证重启持久化、权限或敏感 Key 存储。',
  },
  {
    match: /\/screens\/pkg4\/DailyDraw\.tsx$/,
    plan: '10',
    issues: ['B10'],
    detail: 'R02：抽牌使用真实牌库并写 `dailyDivinations`，但当前选牌/翻牌路径均调用 `finish(true)`，`aiConfigured` 只控制提示，静态上没有进入真实流式解读的分支。这是“离线可用、AI未接”，不是文件缺失。',
    boundary: '静态确证所有可达选牌路径先走离线；未发模型请求。',
  },
  {
    match: /\/screens\/pkg4\/LongReading\.tsx$/,
    plan: '10',
    issues: ['B10'],
    detail: 'R02：档案和详情读真实 longReadings，生成入口显示 AI 等待/待确认，未用占位文案伪造解读。能力未接，视觉与档案读取仍保留。',
    boundary: '静态确证真实档案读取与等待分支；未发模型请求或验证生成完成。',
  },
  {
    match: /\/screens\/overlays\/WishProposalDialog\./,
    plan: '09',
    issues: ['B09'],
    detail: 'R02：正式宿主把真实愿望标题和进度区间传给弹窗，确认回调会 `setWishProgress`；但调用未 await 就立即清空 proposal，失败也会先关闭。预览无回调时的关闭路径与正式写回需分开验收。',
    boundary: '静态确证回调接线与未等待写入；未做失败注入或真实愿望推进。',
  },
  {
    match: /\/screens\/pages\/CallingCard/,
    plan: '04',
    issues: ['B05', 'B09'],
    detail: 'R02：宣告卡列表/操作已接真实 store；部分页面先改本地状态或关闭弹层再写库，归档结算还有黄色双宿主风险。读取接线明确，重复演出与失败恢复未闭合。',
    boundary: '静态确证真实数据和调用；未做归档失败、并发或重复挂载验证。',
  },
  {
    match: /\/screens\/pages\/Achievements\./,
    plan: '09',
    issues: ['B05'],
    detail: 'R02：成就/技能列表和手动解锁调用真实 ops，页面自身 cut-in 与全局通知都订阅同一解锁结果。双击或多宿主是否重复播放仍需专项验证，不能据能解锁判演出正确。',
    boundary: '静态确认两个可能消费面；未实测重复触发。',
  },
  {
    match: /\/screens\/pages\/Activities\./,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：记录与增删改接真实 store，但部分先改本地 UI 再 `void` 写入，拒绝或异常恢复不完整。真实接入意图可追溯，闭环失败分支待04。',
    boundary: '静态确证 store 调用与乐观更新；未注入失败或刷新。',
  },
  {
    match: /\/screens\/pages\/Astrology\./,
    plan: '09',
    issues: ['B10'],
    detail: 'R02：日占卜、档案和保存接真实 astrology 数据；自由 AI 解读仍由 DailyDraw/LongReading 的离线或等待分支承接，预览参数不证明真实 AI。',
    boundary: '静态确证真实读写；未发模型请求或检查断网恢复。',
  },
  {
    match: /\/screens\/pages\/Cooperation\./,
    plan: '07',
    issues: ['B05'],
    detail: 'R02：同伴、好友、COOP、影战和本主题升级链接真实 adapter；蓝粉全局旧 rankup/邀请队列与页面本地队列并存，黄色则使用 P4CinemaChain 局部链。差异不是“演出丢失”，而是生产者/消费者去重和次数口径待专项核。',
    boundary: '静态确证本地与全局宿主并存；未做真实互动双播测试。',
  },
  {
    match: /\/screens\/pages\/Dashboard\./,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：首页 `useHomeData/homeOps` 接真实任务、属性、愿望和组织摘要；R01 已在三轮12秒窗口确认此前空快照最终稳定挂载。完成写入失败时蓝粉有回滚分支，黄色只清 blocker 未回滚本地计数，仍需04失败注入。',
    boundary: 'R01确认目标页最终挂载；未执行业务完成、拒绝或断网写入。',
  },
  {
    match: /\/screens\/pages\/Hideout\./,
    plan: '08',
    issues: [],
    detail: 'R02：页面通过 `useOrgView` 和登录/无组织空态读取真实组织快照，演示组织仅作无账号回退；成员权限、完整刷新、公告/会议写回和多组织切换未在此页闭合。',
    boundary: '静态确证真实读取与空态；未做真实组织写操作。',
  },
  {
    match: /\/screens\/pages\/Ledger\./,
    plan: '05',
    issues: ['B03', 'B09'],
    detail: 'R02：流水、周期、余额和真实 OCR 入口接 ledger 数据，不再用演示小票伪造识别结果；新增/删除/对账的取消、失败恢复和预算月份口径待05。',
    boundary: '静态确证数据入口；未使用真实账本或相册。',
  },
  {
    match: /\/screens\/pages\/Statistics\./,
    plan: '05',
    issues: ['B03', 'B08'],
    detail: 'R02：统计聚合改读真实 activities/attributes；空库等级、预算月份和部分展示等级文案仍有口径风险，真实聚合代码不等于统计业务验收。',
    boundary: '静态确证真实 sources；未做跨月、空库或重启后的数值对照。',
  },
  {
    match: /\/screens\/pages\/Todos\./,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：任务增改完成接真实 actions/store，但页面存在乐观更新、`void` 写回或不完整回滚。差异类型是真实接入中的错误闭环缺口，不是演示数据。',
    boundary: '静态确证 store 调用；未做拒绝、重复完成或刷新。',
  },
  {
    match: /\/screens\/pkg2\/GoalDeck\.tsx$/,
    plan: '04',
    issues: ['B09'],
    detail: 'R02：周目标从真实 weeklyGoals 初始化并保留原有目标卡交互；局部初始化与 store 二次更新是否能同步、领取失败是否回滚未核。',
    boundary: '静态确证真实读取；未完成周目标或领取奖励。',
  },
  {
    match: /\/screens\/pkg3\/(?:rankup|cinema)\.tsx$/,
    plan: '07',
    issues: ['B05'],
    detail: 'R02：蓝粉 RankUpChain/黄色 P4CinemaChain 获星移使用真实 `useStarShiftFlow`；演出的 gained/charges 固定值、页面回调和全局队列可能重复消费，真实奖励返回值仍需逐事件对照。',
    boundary: '静态确证 hook 接入与固定展示参数；未做真实升级/星移。',
  },
  {
    match: /\/screens\/pkg4\/org\/Board\.tsx$/,
    plan: '08',
    issues: ['B09'],
    detail: 'R02：公告、反应、团战信息由真实 posts/reactions/raids 派生；写操作权限、多组织归属和失败恢复未核。',
    boundary: '静态确证读取来源；未真实发帖/反应或操作团战。',
  },
  {
    match: /\/screens\/pkg4\/org\/OpsMeeting\.tsx$/,
    plan: '08',
    issues: ['B09'],
    detail: 'R02：作战历史、分工与会议读取真实数据并调用 saveMeeting；失败、多组织和非队长权限尚未闭环。',
    boundary: '静态确证真实读写入口；未提交真实会议。',
  },
  {
    match: /\/screens\/overlays\/ConfidantDetailModal\./,
    plan: '07',
    issues: ['B14', 'B09'],
    detail: 'R02：详情改读真实同伴、linkedProfile、confidantEvents，并保留羁绊之影/归档/邀请动作；存在局部 `patch` 或定时器式回调和空失败分支，正式权限与写回待07/08。',
    boundary: '静态确证真实读取和回调位置；未执行归档、解约、删除或邀请。',
  },
  {
    match: /\/screens\/overlays\/ConflictDialog\./,
    plan: '06',
    issues: ['B11'],
    detail: 'R02：差异让冲突列表读取 `computeSyncDiff` 的真实结果；弹窗覆盖按钮本身未执行合并，只提示去账号页。蓝粉仍有旧同步宿主，黄色宿主不同，需按正式挂载核等价性。',
    boundary: '静态确证 diff 读取与未执行覆盖；未做同步冲突注入。',
  },
  {
    match: /\/screens\/overlays\/CounselChatModal\./,
    plan: '07',
    issues: ['B09', 'B10'],
    detail: 'R02：会话开始/追加/归档接 `cooperationOps` 与真实 store，冷却、取消和错误 UI 保留；归档 void 后立即反馈、离线/失败恢复仍待动态核。',
    boundary: '静态确证真实会话 ops；未发模型请求或执行归档。',
  },
  {
    match: /\/screens\/overlays\/NavigatorWindow\./,
    plan: '10',
    issues: ['B10', 'B09'],
    detail: 'R02：消息持久化与可执行草稿替换了固定演示种子，执行动作接真实 store；自由回答仍依赖后续 AI 能力，取消/失败/离线闭环待10。',
    boundary: '静态确证消息与草稿路径；未发模型请求。',
  },
  {
    match: /\/screens\/overlays\/RaidSheet\./,
    plan: '08',
    issues: ['B09'],
    detail: 'R02：面板数据改由 `buildRaidPanelData`、真实技能/strike 服务构造；权限校验与失败写回仍属于据点专项。',
    boundary: '静态确证数据构造；未真实出战或结算。',
  },
  {
    match: /\/screens\/overlays\/SummaryModal\./,
    plan: '10',
    issues: ['B10'],
    detail: 'R02：历史总结读真实 summaries，生成动作明确进入等待确认；档案删除/查看仍要核真实写回。自由 AI 未接，不能把等待页当真实摘要。',
    boundary: '静态确证档案读取与等待分支；未请求模型或删除真实总结。',
  },
];

let touched = 0;
for (const item of pending) {
  const group = groups.find((candidate) => candidate.match.test(item.path));
  if (!group) throw new Error(`No R02 explanation for ${item.id} ${item.path}`);
  item.explanation = group.detail;
  item.reviewBoundary = group.boundary;
  item.reviewStatus = 'R02 branch explained; runtime closure deferred';
  item.followupPlan = group.plan;
  item.issueRefs = [...new Set([...(item.issueRefs ?? []), ...group.issues])];
  touched++;
}
if (touched !== 87) throw new Error(`Expected to explain 87 items, touched ${touched}`);

audit.r02Review = {
  reviewedAt: '2026-10-24',
  reviewedPending: touched,
  status: 'all branch explanations completed',
  categoryMeaning: '待确认 now denotes deferred runtime/business acceptance, not an unexplained file difference.',
  evidence: [
    'E:/MASKARIA/outputs/theme-plan02-20261024/diffs/D001.patch through D212.patch',
    'current source paths recorded in each difference',
    'E:/MASKARIA/outputs/theme-plan02-r01-20261024-v3/r01.json',
  ],
  knownDefectReferences: [...new Set(pending.flatMap((item) => item.issueRefs ?? []))].sort(),
};

writeFileSync(path, `${JSON.stringify(audit, null, 2)}\n`);
console.log(`Updated ${touched} unresolved differences in ${path}`);
