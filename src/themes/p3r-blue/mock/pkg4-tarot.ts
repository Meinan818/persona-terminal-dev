/* 工作包 4（粉）· 大阿卡纳 22 张牌义（由真实 src/constants/tarot.ts 的 MAJOR_ARCANA 抽取，文案原样）。 */
import type { AttributeId, Fortune, LongReadingPeriod, TarotOrientation } from '@/types';

export interface P4Meaning { keywords: string[]; meaning: string; reflection: string }
export interface P4TarotCard { id: string; number: number; roman?: string; name: string; nameEn: string; upright: P4Meaning; reversed: P4Meaning; advice?: { upright: string; reversed: string }; rel?: AttributeId }

export const MAJOR: P4TarotCard[] = [
{
"id": "fool",
"number": 0,
"roman": "0",
"name": "愚者",
"nameEn": "The Fool",
"upright": {
"keywords": [
"新的开始",
"自由",
"纯粹",
"冒险",
"可能性"
],
"meaning": "带着赤子之心迈向未知，一切尚未定义，正因如此充满可能。",
"reflection": "有个念头， 理由讲不清，却一直放不下。它没有地图，也许正因为无所适从，才应立刻出发。"
},
"reversed": {
"keywords": [
"鲁莽",
"犹豫",
"天真",
"错失时机"
],
"meaning": "过度谨慎或过度冲动，在原地打转。",
"reflection": "是不是在某件事的门口站了很久，一会儿嫌自己太慢，一会儿又怕太快？两种都不是答案，先看清脚下的路通往何方。"
},
"advice": {
"upright": "今日适合踏出舒适区，做一件完全陌生的事。",
"reversed": "先站住，别急着跳。心里没底的一步，可能不是信任，是鲁莽。"
},
"rel": "guts"
},
{
"id": "magician",
"number": 1,
"roman": "I",
"name": "魔术师",
"nameEn": "The Magician",
"upright": {
"keywords": [
"行动",
"创造",
"技艺",
"主动",
"意志"
],
"meaning": "你拥有此刻所需的全部工具，关键是抬手去用。",
"reflection": "手边攒的东西，是不是早就够用了，只差一个开始？今日不必苦于准备，先活用起来已拥有的。"
},
"reversed": {
"keywords": [
"操控",
"才华错置",
"自欺"
],
"meaning": "能力被用错方向，或陷入口惠而实不至。",
"reflection": "有没有一件事你做得很漂亮，却越做越不像自己想要的？看一眼你的锋芒正朝着谁的方向。"
},
"advice": {
"upright": "今天是动手做的日子，不是再研究一天的日子。",
"reversed": "你擅长的不等于该做的。多问一句动机，再出手。"
},
"rel": "dexterity"
},
{
"id": "high_priestess",
"number": 2,
"roman": "II",
"name": "女祭司",
"nameEn": "The High Priestess",
"upright": {
"keywords": [
"直觉",
"静默",
"内省",
"潜意识"
],
"meaning": "答案藏在表象之下，倾听那个不说话的声音。",
"reflection": "有些事你其实早就知道怎么办，只是某个声音不肯用讲道理的口气说话。把外面的声音关小一点，寻找一下心中的声音吧。"
},
"reversed": {
"keywords": [
"迷茫",
"自我隔绝",
"信号混乱"
],
"meaning": "内心的声音被杂念覆盖，需要先安静下来。",
"reflection": "你最近是不是什么都在听、什么都在看，唯独没留一段安静给自己？最要紧的某件事，往往就是这时候被盖住的。"
},
"advice": {
"upright": "少说几句，多写几行，让直觉浮上来。",
"reversed": "别信第一反应，今天的直觉可能只是情绪。"
},
"rel": "knowledge"
},
{
"id": "empress",
"number": 3,
"roman": "III",
"name": "皇后",
"nameEn": "The Empress",
"upright": {
"keywords": [
"丰盛",
"滋养",
"创造",
"温柔",
"生命力"
],
"meaning": "你所投入的温柔与耐心，会在这段时间开花。",
"reflection": "你给出去的耐心和照料，是不是还没见到回报？急不来的事，正在土下面慢慢发生。"
},
"reversed": {
"keywords": [
"过度付出",
"停滞",
"依赖"
],
"meaning": "把心血倾倒在不回报的土壤里，是时候收回一点。",
"reflection": "是不是有段付出让你累了却停不下来？那里也许不缺养分，缺的是让它自己长一会儿的余地。"
},
"advice": {
"upright": "好好吃饭、好好睡觉、给身边人一点好东西。",
"reversed": "照顾别人之前，先问自己今天吃饱了没。"
},
"rel": "kindness"
},
{
"id": "emperor",
"number": 4,
"roman": "IV",
"name": "皇帝",
"nameEn": "The Emperor",
"upright": {
"keywords": [
"秩序",
"权威",
"框架",
"掌控"
],
"meaning": "为混乱建立规则，才是真正的自由。",
"reflection": "最近是不是很想把一团乱麻理成几条清楚的线？你的手很稳，适合裁定边界。"
},
"reversed": {
"keywords": [
"僵化",
"控制欲",
"固执"
],
"meaning": "规则变成枷锁，执着反而让你失去主动权。",
"reflection": "有没有一条你自己定的规矩，如今已经在勒着你？放松点兴许也是不错的选择。"
},
"advice": {
"upright": "今天适合立 SOP，写清楚自己的一天。",
"reversed": "松手一次看看，世界不会因此塌掉。"
},
"rel": "guts"
},
{
"id": "hierophant",
"number": 5,
"roman": "V",
"name": "教皇",
"nameEn": "The Hierophant",
"upright": {
"keywords": [
"传承",
"指引",
"信念",
"师长"
],
"meaning": "站在前人的肩膀上，比自己摸索更远。",
"reflection": "你此刻的困惑，也许早有人走过。肯不肯低头看看那些旧脚印？"
},
"reversed": {
"keywords": [
"打破常规",
"个人信念",
"反叛"
],
"meaning": "不再照规矩走，凭自己的信念行事——自由了，也可能失了准绳。",
"reflection": "是不是不想再照别人的规矩走了？自己的路可以走，只是先想清楚，准绳换成了什么。"
},
"advice": {
"upright": "去读一本公认的经典，别老看最新的。",
"reversed": "不必为了叛逆而叛逆，也不必为了顺从而顺从。"
},
"rel": "knowledge"
},
{
"id": "lovers",
"number": 6,
"roman": "VI",
"name": "恋人",
"nameEn": "The Lovers",
"upright": {
"keywords": [
"抉择",
"连接",
"价值",
"合一"
],
"meaning": "一段真正的关系，始于你先认识自己选择了什么。",
"reflection": "眼前有两条路，而真正难的不是选哪条，是承认自己更想要哪条。"
},
"reversed": {
"keywords": [
"犹豫",
"价值冲突",
"错位"
],
"meaning": "想要的和该要的在拉扯，别急着下结论。",
"reflection": "想要的和该要的在拉扯，你最近是不是有点心口不一？不必急着判谁赢，先承认这场拉扯存在。"
},
"advice": {
"upright": "今天做的选择，和\"你是谁\"有关，慎重。",
"reversed": "先承认冲突，再去调和。压抑不会让它消失。"
},
"rel": "charm"
},
{
"id": "chariot",
"number": 7,
"roman": "VII",
"name": "战车",
"nameEn": "The Chariot",
"upright": {
"keywords": [
"决心",
"前进",
"掌控",
"胜利"
],
"meaning": "两股相反的力量被你驾驭到同一方向——这是胜利。",
"reflection": "你身上有两股劲，平时互相扯；这次它们难得朝同一个方向。不要浪费了。"
},
"reversed": {
"keywords": [
"失控",
"分心",
"内耗"
],
"meaning": "车在原地打转，是你还没决定去哪。",
"reflection": "是不是很忙、很用力，回头一看却没挪多远？也许不是力气的问题，是方向还没定。"
},
"advice": {
"upright": "选一件事，只做它，全力冲。",
"reversed": "列清单，把相互矛盾的事挑出一个砍掉。"
},
"rel": "guts"
},
{
"id": "strength",
"number": 8,
"roman": "VIII",
"name": "力量",
"nameEn": "Strength",
"upright": {
"keywords": [
"温柔的力量",
"耐心",
"内在",
"驯服"
],
"meaning": "真正的强大不是压制，是温柔地引导野性。",
"reflection": "某件事你正用耐心去推进，而不是用蛮力去压。这条路是对的，继续就好。"
},
"reversed": {
"keywords": [
"自我怀疑",
"情绪失控",
"软弱"
],
"meaning": "力气没有用错，只是今天暂时找不到它。",
"reflection": "也许你并不弱，只是撑得太久了。允许自己在这一天松一松，明天力气自己会回来。"
},
"advice": {
"upright": "面对让你想发火的事，先深呼吸三次。",
"reversed": "你不是不够强，你只是太累了。允许自己休息。"
},
"rel": "guts"
},
{
"id": "hermit",
"number": 9,
"roman": "IX",
"name": "隐士",
"nameEn": "The Hermit",
"upright": {
"keywords": [
"独处",
"内省",
"真知",
"灯塔"
],
"meaning": "你需要一个人待一会，灯才能亮。",
"reflection": "是不是很久没有真正独处了？外面的声音可以关小一点，有些路只有一个人时才看得见。"
},
"reversed": {
"keywords": [
"孤立",
"回避",
"过度自我封闭"
],
"meaning": "独处成了逃避，回来的时候到了。",
"reflection": "独处和回避有时只差一个念头，你最近是哪一种？如果有人在门外，不妨开一条缝。"
},
"advice": {
"upright": "今天少开会，多一个人走路。",
"reversed": "给信任的人发条消息，让世界进来一点。"
},
"rel": "knowledge"
},
{
"id": "wheel_of_fortune",
"number": 10,
"roman": "X",
"name": "命运之轮",
"nameEn": "Wheel of Fortune",
"upright": {
"keywords": [
"转机",
"循环",
"机缘",
"变化"
],
"meaning": "轮子在转，你能做的是站稳重心。",
"reflection": "有些变化不是你推动的，但它会经过你。抓不住的让它过去，能站的地方站好。"
},
"reversed": {
"keywords": [
"停滞",
"厄运循环",
"抗拒变化"
],
"meaning": "同样的坑掉第三次了，是该换条路。",
"reflection": "你是不是总在类似的地方跌一跤？路没变，变的只能是走路的人。"
},
"advice": {
"upright": "今天留意一个看似不相关的小事，它可能是转折。",
"reversed": "复盘一下最近的不顺，找出重复的那一环。"
},
"rel": "knowledge"
},
{
"id": "justice",
"number": 11,
"roman": "XI",
"name": "正义",
"nameEn": "Justice",
"upright": {
"keywords": [
"公平",
"责任",
"因果",
"清醒"
],
"meaning": "你得到的，正是你一直在选择的总和。",
"reflection": "眼下你拿到的，多半是一路选择的总和。适合把账看清，不为算谁的错。"
},
"reversed": {
"keywords": [
"不公",
"逃避责任",
"偏见"
],
"meaning": "把结果归于别人，等于把自己的主动权也丢了。",
"reflection": "有件事你最近觉得很不公平，也许它确实不公平；但里面有没有一小段是你能改写的？"
},
"advice": {
"upright": "今日适合处理拖了很久的账、合同、文件。",
"reversed": "别急着找替罪羊，先问自己\"我做过什么导致了这个\"。"
},
"rel": "kindness"
},
{
"id": "hanged_man",
"number": 12,
"roman": "XII",
"name": "倒吊人",
"nameEn": "The Hanged Man",
"upright": {
"keywords": [
"视角转换",
"暂停",
"臣服",
"牺牲"
],
"meaning": "倒过来看，世界完全不同了。",
"reflection": "因为某件事有点不耐烦？需要面对的功课也许就是等待本身，换个角度看它。"
},
"reversed": {
"keywords": [
"僵住",
"无意义的等待",
"自我牺牲"
],
"meaning": "你不是在沉淀，你是在拖。",
"reflection": "沉淀和拖延从外面看一模一样，只有你自己知道是哪一个。诚实一点。"
},
"advice": {
"upright": "今天允许自己什么都不做，观察就好。",
"reversed": "你已经等够了，起身。"
},
"rel": "knowledge"
},
{
"id": "death",
"number": 13,
"roman": "XIII",
"name": "死神",
"nameEn": "Death",
"upright": {
"keywords": [
"结束",
"蜕变",
"放下",
"新生"
],
"meaning": "不是毁灭，是完成。允许它结束，下一个才会来。",
"reflection": "有一段关系、一个习惯、一个身份，可能正走到它该合上的地方。允许它合上，终结带来新生。"
},
"reversed": {
"keywords": [
"抗拒改变",
"停滞",
"未愈合"
],
"meaning": "旧的死不透，新的活不起来。",
"reflection": "对某些事视若无睹？不必立刻做决断，但请先承认万物有始有终。"
},
"advice": {
"upright": "清理一件旧物、一段关系、一条过时的习惯。",
"reversed": "承认某件事已经结束了，不必假装它还在。"
},
"rel": "guts"
},
{
"id": "temperance",
"number": 14,
"roman": "XIV",
"name": "节制",
"nameEn": "Temperance",
"upright": {
"keywords": [
"平衡",
"调和",
"耐心",
"融合"
],
"meaning": "两种看似矛盾的东西，可以不断注入彼此。",
"reflection": "最近可能在努力让两个看似冲突的东西共存，它们靠得近了一点，慢慢来。"
},
"reversed": {
"keywords": [
"失衡",
"极端",
"急躁"
],
"meaning": "你正在用过度证明自己。慢一点。",
"reflection": "是不是总想用「再多一点」证明什么？功课也许恰恰是少一点。"
},
"advice": {
"upright": "今天做任何事都少一点，能量要留给后半程。",
"reversed": "停止\"再努力一点就好了\"的自我催眠，先休息。"
},
"rel": "kindness"
},
{
"id": "devil",
"number": 15,
"roman": "XV",
"name": "恶魔",
"nameEn": "The Devil",
"upright": {
"keywords": [
"束缚",
"沉迷",
"欲望",
"阴影"
],
"meaning": "锁链是自己挂上的，也可以自己取下。",
"reflection": "有件让你舒服又困住你的东西，你比谁都清楚它是什么。不必急于挣脱，但需要看见它。"
},
"reversed": {
"keywords": [
"觉醒",
"挣脱",
"释放"
],
"meaning": "你已经看清楚了那个困住你的东西，接下来是行动。",
"reflection": "某件你不敢做，却心知肚明该去做的事最近离你很近，别再视若无睹。"
},
"advice": {
"upright": "今天小心冲动消费/暴食/拖延——那不是放松，是吞噬。",
"reversed": "做一件你之前不敢做、却知道该做的事。"
},
"rel": "charm"
},
{
"id": "tower",
"number": 16,
"roman": "XVI",
"name": "塔",
"nameEn": "The Tower",
"upright": {
"keywords": [
"突变",
"崩解",
"顿悟",
"解放"
],
"meaning": "建立在沙上的塔倒了，这是好事，虽然当下很痛。",
"reflection": "若有什么突然变了，别急着修补，先看看它掀开了什么。倒下的往往早有预兆。"
},
"reversed": {
"keywords": [
"延迟的崩溃",
"警告",
"避免"
],
"meaning": "你正在撑一个早该放下的东西，能撑多久？",
"reflection": "你正在撑一面早该倒的墙，撑得很辛苦。是主动拆一块，还是等它自己砸下来？"
},
"advice": {
"upright": "今天若有意外，别反抗，看看它露出来的是什么真相。",
"reversed": "主动拆一次墙，比被动被砸要好受得多。"
},
"rel": "guts"
},
{
"id": "star",
"number": 17,
"roman": "XVII",
"name": "星星",
"nameEn": "The Star",
"upright": {
"keywords": [
"希望",
"疗愈",
"指引",
"灵感"
],
"meaning": "经历了塔之后，星光是温柔的承诺。",
"reflection": "刚经历过动荡的你也许正在收到一点温柔的回音。不必求结果，请为自己而活。"
},
"reversed": {
"keywords": [
"失望",
"信念丢失",
"焦虑"
],
"meaning": "短暂地找不到北，但星星并没有消失。",
"reflection": "最近的失望是真的，但它遮住的东西也是真的。不必找方向，请抬起头。"
},
"advice": {
"upright": "今天做一件不求结果的事，只为悦己。",
"reversed": "写下三件今年让你感到希望的小事。"
},
"rel": "charm"
},
{
"id": "moon",
"number": 18,
"roman": "XVIII",
"name": "月亮",
"nameEn": "The Moon",
"upright": {
"keywords": [
"幻象",
"潜意识",
"不安",
"梦"
],
"meaning": "看到的未必是真相，但感受是真的。",
"reflection": "心里若有一层雾，不要急着穿过去。带着情绪做的决定，可以先放到明天。"
},
"reversed": {
"keywords": [
"真相浮现",
"迷雾散",
"释然"
],
"meaning": "一直担心的事没那么糟，或者你终于敢看它了。",
"reflection": "一直回避的某件事，也许终于敢正眼看它一眼。它没有想象中那么夸张。"
},
"advice": {
"upright": "今天做的决定可能带有情绪，先睡一觉再定。",
"reversed": "把一直回避的问题写出来，它不会消失只会变大。"
},
"rel": "kindness"
},
{
"id": "sun",
"number": 19,
"roman": "XIX",
"name": "太阳",
"nameEn": "The Sun",
"upright": {
"keywords": [
"喜悦",
"成功",
"清晰",
"生命力"
],
"meaning": "没有阴影的一天。享受它，不必心虚。",
"reflection": "若有什么顺得不像话，那就享受它，它是你应得的。今日不必心虚。"
},
"reversed": {
"keywords": [
"短暂失意",
"过度乐观",
"自欺的快乐"
],
"meaning": "一时的低落，或者把\"看起来都好\"当成了\"真的都好\"。",
"reflection": "要么有点提不起劲，要么高兴过了头。哪一种都别在这时候做承诺。"
},
"advice": {
"upright": "去晒太阳，真的。",
"reversed": "开心归开心，别在情绪高峰上签字/承诺。"
},
"rel": "charm"
},
{
"id": "judgement",
"number": 20,
"roman": "XX",
"name": "审判",
"nameEn": "Judgement",
"upright": {
"keywords": [
"觉醒",
"召唤",
"更生",
"和解"
],
"meaning": "你听见了那个一直在呼唤你的声音，起身吧。",
"reflection": "有件「总有一天要做」的事，那一天也许比你想的近。你是否听见它的呼唤？"
},
"reversed": {
"keywords": [
"自责",
"犹豫",
"错失召唤"
],
"meaning": "过度审判自己，让该迈出的那步卡住了。",
"reflection": "最近有没有在为过去的某个自己惭愧？只有原谅TA，今后才不会固步自封。"
},
"advice": {
"upright": "今天回应一件你\"总有一天要做\"的事。",
"reversed": "原谅过去的一个版本的自己，然后前进。"
},
"rel": "kindness"
},
{
"id": "world",
"number": 21,
"roman": "XXI",
"name": "世界",
"nameEn": "The World",
"upright": {
"keywords": [
"完成",
"整合",
"圆满",
"成就"
],
"meaning": "一个长周期正在收尾。合上这一章，值得庆祝。",
"reflection": "有段长长的旅程走到了结尾，值得停下来看一眼，再一往无前。"
},
"reversed": {
"keywords": [
"未竟",
"缺口",
"停滞于终局"
],
"meaning": "差一点就好，但那一点正是关键。",
"reflection": "某件事做到了九成，但仍未圆满，查漏补缺那一成未竟之事。"
},
"advice": {
"upright": "今天适合回顾并做一次总结，让完成的真正完成。",
"reversed": "别跳过结尾去开新的，把那最后一步走完。"
},
"rel": "dexterity"
}
];

export const TAROT_BY_ID: Record<string, P4TarotCard> = Object.fromEntries(MAJOR.map((c) => [c.id, c]));
/** 蓝套 public/tarot/p3/ 78 张全图：大阿卡纳由 kit TarotFace 按罗马数自动取图 */
export const ORI_LABEL: Record<TarotOrientation, string> = { upright: '正位', reversed: '逆位' };

export const FORTUNE_LABEL: Record<Fortune, { label: string; icon: string; en: string }> = {
  great: { label: '大吉', icon: '★', en: 'GREAT' },
  good: { label: '中吉', icon: '✿', en: 'GOOD' },
  small: { label: '小吉', icon: '☆', en: 'FAIR' },
  bad: { label: '凶', icon: '!', en: 'BAD' },
};

export const SPREAD_POSITIONS: Record<LongReadingPeriod, [string, string, string]> = {
  recent: ['昨日', '今日', '明日'],
  midterm: ['现状', '阻碍', '方向'],
  longterm: ['根基', '进程', '结果'],
};
export const BASE_POSITION = '底色';
export const periodHasBase = (p: LongReadingPeriod) => p === 'longterm';
export function spreadPositionsFor(period: LongReadingPeriod, count: number): string[] {
  const base = SPREAD_POSITIONS[period] as readonly string[];
  return count === base.length + 1 ? [BASE_POSITION, ...base] : [...base];
}
export const PERIOD_LABELS: Record<LongReadingPeriod, { label: string; hint: string; days: string }> = {
  recent: { label: '最近', hint: '这几天的走向', days: '未来 2–3 天' },
  midterm: { label: '一段时间', hint: '几周内的脉络', days: '2–4 周' },
  longterm: { label: '长远打算', hint: '月或更久的长期', days: '数月以上' },
};

export const ATTR_IDS: AttributeId[] = ['knowledge', 'guts', 'dexterity', 'kindness', 'charm'];
export const ATTR_NAMES: Record<AttributeId, string> = { knowledge: '知识', guts: '胆量', dexterity: '灵巧', kindness: '温柔', charm: '魅力' };
/** 五维配色（蓝白：只用 --p3r 变量，无蓝青） */
export const ATTR_COLOR: Record<AttributeId, string> = {
  knowledge: 'var(--p3r-cyan)', guts: 'var(--p3r-magenta)', dexterity: 'var(--p3r-mint)', kindness: 'var(--p3r-gold)', charm: 'var(--p3r-blue)',
};

export function drawRandom(n: number, exclude: string[] = []): string[] {
  const pool = MAJOR.map((c) => c.id).filter((id) => !exclude.includes(id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}
export const randomOri = (): TarotOrientation => (Math.random() < 0.7 ? 'upright' : 'reversed');
