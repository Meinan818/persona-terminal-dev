# M5：商店/天鹅绒文案并入皮肤 labels.json（文案只在皮肤里；物品名沿用 P5R 英文原名）
import json, os
R = os.path.join(os.path.dirname(__file__), '..')
P = os.path.join(R, 'src/umbra/skins/p5r-red/labels.json')
L = json.load(open(P))
add = {
 'flow.menu.shop': '商店街', 'flow.menu.shop.en': 'SHOPS',
 'shop.street': '涩谷地下商店街', 'shop.street.sub': 'SHIBUYA · UNDERGROUND MALL',
 'shop.name.untouchable': 'Untouchable', 'shop.kind.untouchable': '武器 · 防具 · 饰品',
 'shop.name.takemi': '武见内科医院', 'shop.kind.takemi': '药品',
 'shop.name.drugstore': '药妆店', 'shop.kind.drugstore': '道具',
 'shop.title.untouchable': 'UNTOUCHABLE', 'shop.title.takemi': 'TAKEMI CLINIC', 'shop.title.drugstore': 'DRUGSTORE',
 'shop.sign.untouchable': '<b>AIRSOFT SHOP</b><i>UNTOUCHABLE</i><strong>MUNEHISA<br>IWAI</strong>',
 'shop.sign.takemi': '<b>TAKEMI</b><i>MEDICAL CLINIC</i><strong>TAE<br>TAKEMI</strong>',
 'shop.sign.drugstore': '<b>SHIBUYA</b><i>DRUGSTORE</i><strong>DRUG<br>STORE</strong>',
 'shop.back': '返回', 'shop.buy': '购买', 'shop.sell': '卖出', 'shop.prompt': '<i>○</i>返回 <i>×</i>确认',
 'shop.cat.melee': '近战武器', 'shop.cat.melee.en': 'BUY MELEE WEAPON',
 'shop.cat.gun': '远程武器', 'shop.cat.gun.en': 'BUY RANGED WEAPON',
 'shop.cat.armor': '防具', 'shop.cat.armor.en': 'BUY PROTECTOR',
 'shop.cat.acc': '饰品', 'shop.cat.acc.en': 'BUY ACCESSORY',
 'shop.cat.sell': '卖出', 'shop.cat.sell.en': 'SELL ITEMS',
 'shop.cat.medicine': '药品', 'shop.cat.medicine.en': 'BUY MEDICINE',
 'shop.cat.item': '道具', 'shop.cat.item.en': 'BUY ITEMS',
 'shop.info.effect': 'EFFECT INFO', 'shop.info.equip': 'EQUIP INFO', 'shop.equipped': 'EQUIPPED',
 'shop.untouchable.hello': '要点什么？', 'shop.untouchable.which': '要哪个？', 'shop.untouchable.sellq': '要卖什么？', 'shop.untouchable.thanks': '拿好。', 'shop.untouchable.bye': '路上小心。', 'shop.untouchable.bye.buy': '用的时候别出事。',
 'shop.takemi.hello': '今天要什么药？', 'shop.takemi.which': '要几份？', 'shop.takemi.sellq': '要卖什么？', 'shop.takemi.thanks': '按时用。', 'shop.takemi.bye': '下次再来。', 'shop.takemi.bye.buy': '别太勉强自己。',
 'shop.drugstore.hello': '欢迎光临！', 'shop.drugstore.which': '要哪一件？', 'shop.drugstore.sellq': '要卖什么？', 'shop.drugstore.thanks': '谢谢惠顾！', 'shop.drugstore.bye': '欢迎再来！', 'shop.drugstore.bye.buy': '谢谢惠顾！',
 'shop.fail.money': '持有金不足', 'shop.fail.stack': '已到持有上限', 'shop.fail.none': '没有可卖的东西',
 'shop.equip.ask': '要现在装备吗？', 'shop.equip.later': '以后再说',
 'shop.sellall': 'Sell All Treasure', 'shop.sell.empty': '没有可以卖的东西',
 'shop.arcana.joker': 'Ren · THE FOOL', 'shop.arcana.skull': 'Ryuji · THE CHARIOT', 'shop.arcana.mona': 'Morgana · THE MAGICIAN', 'shop.arcana.panther': 'Ann · THE LOVERS',
 'shop.arcana.fox': 'Yusuke · THE EMPEROR', 'shop.arcana.queen': 'Makoto · THE PRIESTESS', 'shop.arcana.noir': 'Haru · THE EMPRESS', 'shop.arcana.crow': 'Goro · JUSTICE', 'shop.arcana.violet': 'Kasumi · FAITH',
 'vel.title': 'VELVET ROOM', 'vel.igor': 'Igor', 'vel.desire': '……你想要什么？', 'vel.method': '选择合成的方式。',
 'vel.create': 'Create New Personas', 'vel.create.en': 'Executions', 'vel.train': 'Train Personas', 'vel.train.en': 'Lockdown', 'vel.comp': 'Register/Summon', 'vel.comp.en': 'Persona Compendium',
 'vel.locked': '尚未开放（需要天鹅绒羁绊）', 'vel.leave': '离开', 'vel.pick1': '选择第一张面具。', 'vel.pick2': '选择第二张面具。', 'vel.pick.hint': '先在左边选第一张面具',
 'vel.inherit': '继承技能', 'vel.inherit.none': '没有可以继承的技能', 'vel.confirm': '就用这两张面具处刑吗？', 'vel.toohigh': '你的力量还驾驭不了这张面具。', 'vel.fuse': '处刑合成',
 'vel.owned': '已持有', 'vel.owned.t': '同名的面具你已经持有了。', 'vel.done': '新的面具诞生了。', 'vel.ok': '好',
}
items = {
 'kris': ('Kris', '波刃短剑。'), 'kopis': ('Kopis', '前弯的单刃刀，适合劈砍。'), 'rebel-knife': ('Rebel Knife', '初始的短刀。'),
 'steel-pipe': ('Steel Pipe', '初始的铁管。'), 'spiked-bat': ('Spiked Bat', '钉满钉子的球棒。'), 'scimitar': ('Scimitar', '弯曲的猫用弯刀。'),
 'wire-whip': ('Wire Whip', '钢丝编成的鞭子。'), 'iai-katana': ('Iai Katana', '居合用的刀。'), 'brass-knuckles': ('Brass Knuckles', '黄铜指虎。'),
 'battle-axe': ('Battle Axe', '沉重的战斧。'), 'light-saber': ('Light Saber', '玩具光剑（认知里是真的）。'), 'rapier': ('Rapier', '细身刺剑。'),
 'tkachev': ('Tkachev', '初始的模型手枪。'), 'model-gun-m1': ('Model Gun M1', '仿军用手枪的模型枪。'), 'blunderbuss': ('Blunderbuss', '喇叭口霰弹枪。'),
 'wrist-rocket': ('Wrist Rocket', '护腕弹弓。'), 'mini-uzi': ('Mini Uzi', '小型冲锋枪模型。'), 'hunting-rifle': ('Hunting Rifle', '狩猎步枪模型。'),
 'school-uniform': ('School Uniform', '平时的制服。'), 'unisex-vest': ('Unisex Vest', '男女都能穿的防护背心。'), 'tactical-vest': ('Tactical Vest', '男用战术背心。'),
 'fighting-dress': ('Fighting Dress', '女用战斗服。'), 'cat-harness': ('Cat Harness', '猫用护具。'),
 'occult-mask': ('Occult Mask', '魔法伤害小幅提升。'), 'oil-pack': ('Oil Pack', 'HP 上限 +30。'), 'cooling-pack': ('Cooling Pack', 'SP 上限 +12。'),
 'portable-battery': ('Portable Battery', 'HP +10、SP +8。'), 'well-fed-cape': ('Well-Fed Cape', 'HP 上限 +60。'), 'calming-cape': ('Calming Cape', '魔法伤害提升。'),
 'recov-r-50': ('Recov-R: 50mg', '恢复我方一人 50 点 HP。'), 'recov-r-100': ('Recov-R: 100mg', '恢复我方一人 100 点 HP。'), 'takemedic': ('Takemedic', '恢复我方一人 200 点 HP。'),
 'takemedic-all': ('Takemedic-All', '恢复我方全体 50 点 HP。'), 'soul-drop': ('Soul Drop', '恢复我方一人 25 点 SP。'), 'energy-drink': ('Energy Drink', '恢复我方一人 50 点 SP。'),
 'revival-bead': ('Revival Bead+', '复活倒下的一名同伴（恢复 50% HP）。'),
 'thin-copper': ('Thin Copper', '宝物。只能卖钱。'), 'hole-copper': ('Hole Copper', '宝物。只能卖钱。'), 'jade': ('Jade', '宝物。能卖个好价钱。'), 'distorted-crown': ('Distorted Crown', '宝物。'),
}
for k, (n, d) in items.items(): add[f'item.{k}.name'] = n; add[f'item.{k}.desc'] = d
for w in ['mona', 'panther', 'fox', 'queen', 'noir', 'crow', 'violet']:
    add[f'item.start-melee-{w}.name'] = 'Starter Weapon'; add[f'item.start-melee-{w}.desc'] = '初始武器。'
for w in ['skull', 'mona', 'panther', 'fox', 'queen', 'noir', 'crow', 'violet']:
    add[f'item.start-gun-{w}.name'] = 'Starter Gun'; add[f'item.start-gun-{w}.desc'] = '初始枪械。'
L.update(add); json.dump(L, open(P, 'w'), ensure_ascii=False, indent=1)
print('labels', len(L))
