# M5：商店数据表（D-007 四类：武器防具 Untouchable / 医院 武见内科 / 道具 药妆店 / 天鹅绒）→ src/game/data/shop.json
# 商品名沿用 P5R 英文原名（本皮物品名=英文，同 item.medicine.name）；价格/数值是 UMBRA 样板值（未经 sim:balance 校准）。
import json, os
R = os.path.join(os.path.dirname(__file__), '..')
W = {}   # 装备
def eq(id, slot, who, price, **st): W[id] = {'slot': slot, 'who': who, 'price': price, **st}
# 近战（atk）· 每人类型不同：joker 刀 / skull 钝器 / mona 弯刀 / panther 鞭 / fox 刀 / queen 拳套 / noir 斧 / crow 光剑 / violet 细剑
for id, who, p, a in [('rebel-knife', 'joker', 0, 50), ('kris', 'joker', 3600, 68), ('kopis', 'joker', 7800, 86),
                      ('steel-pipe', 'skull', 0, 52), ('spiked-bat', 'skull', 4000, 72), ('scimitar', 'mona', 3400, 64),
                      ('wire-whip', 'panther', 3400, 62), ('iai-katana', 'fox', 4200, 74), ('brass-knuckles', 'queen', 3800, 70),
                      ('battle-axe', 'noir', 4400, 78), ('light-saber', 'crow', 4600, 76), ('rapier', 'violet', 4200, 72)]:
    eq(id, 'melee', [who], p, atk=a)
for who, a in [('mona', 48), ('panther', 46), ('fox', 50), ('queen', 50), ('noir', 54), ('crow', 52), ('violet', 50)]:
    W['start-melee-' + who] = {'slot': 'melee', 'who': [who], 'price': 0, 'atk': a, 'start': True}
W['rebel-knife']['start'] = True; W['steel-pipe']['start'] = True
# 远程（atk）
for id, who, p, a in [('tkachev', 'joker', 0, 40), ('model-gun-m1', 'joker', 4200, 58), ('blunderbuss', 'skull', 4600, 62),
                      ('wrist-rocket', 'mona', 3600, 52), ('mini-uzi', 'panther', 3800, 50), ('hunting-rifle', 'fox', 4400, 60)]:
    eq(id, 'gun', [who], p, atk=a)
W['tkachev']['start'] = True
for who in ['skull', 'mona', 'panther', 'fox', 'queen', 'noir', 'crow', 'violet']:
    W['start-gun-' + who] = {'slot': 'gun', 'who': [who], 'price': 0, 'atk': 38, 'start': True}
# 防具（def）· 男女款
M, F = ['joker', 'skull', 'fox', 'crow'], ['panther', 'queen', 'noir', 'violet']
W['school-uniform'] = {'slot': 'armor', 'who': M + F + ['mona'], 'price': 0, 'def': 20, 'start': True}
eq('unisex-vest', 'armor', M + F, 2600, **{'def': 34})
eq('tactical-vest', 'armor', M, 5200, **{'def': 48})
eq('fighting-dress', 'armor', F, 5200, **{'def': 48})
eq('cat-harness', 'armor', ['mona'], 3800, **{'def': 42})
# 饰品（hp/sp/mag 百分比）
eq('occult-mask', 'acc', M + F + ['mona'], 3000, mag=0.06)
eq('oil-pack', 'acc', M + F + ['mona'], 2000, hp=30)
eq('cooling-pack', 'acc', M + F + ['mona'], 2000, sp=12)
eq('portable-battery', 'acc', M + F + ['mona'], 2000, sp=8, hp=10)
eq('well-fed-cape', 'acc', M + F + ['mona'], 12000, hp=60)
eq('calming-cape', 'acc', M + F + ['mona'], 12000, mag=0.12)
# 消耗品（战斗内可用：hp / sp / revive / all = 全体）
C = {'medicine': {'price': 300, 'hp': 100}, 'snuff': {'price': 1200, 'sp': 10}, 'bead': {'price': 600, 'revive': 0.5},
     'recov-r-50': {'price': 400, 'hp': 50}, 'recov-r-100': {'price': 800, 'hp': 100}, 'takemedic': {'price': 1600, 'hp': 200},
     'takemedic-all': {'price': 950, 'hp': 50, 'all': True}, 'soul-drop': {'price': 500, 'sp': 25}, 'energy-drink': {'price': 1500, 'sp': 50},
     'revival-bead': {'price': 1000, 'revive': 0.5}}
# 宝物（只能卖）
T = {'thin-copper': 20, 'hole-copper': 50, 'jade': 12000, 'distorted-crown': 15000}
SHOPS = {
    'untouchable': {'kind': 'weapon', 'keeper': 'shop.iwai', 'theme': 'green', 'name': 'untouchable',
                    'menu': [{'id': 'melee', 'items': ['kris', 'kopis', 'spiked-bat', 'scimitar', 'wire-whip', 'iai-katana', 'brass-knuckles', 'battle-axe', 'light-saber', 'rapier']},
                             {'id': 'gun', 'items': ['model-gun-m1', 'blunderbuss', 'wrist-rocket', 'mini-uzi', 'hunting-rifle']},
                             {'id': 'armor', 'items': ['unisex-vest', 'tactical-vest', 'fighting-dress', 'cat-harness']},
                             {'id': 'acc', 'items': ['occult-mask', 'oil-pack', 'cooling-pack', 'portable-battery', 'well-fed-cape', 'calming-cape']},
                             {'id': 'sell'}]},
    'takemi': {'kind': 'hospital', 'keeper': 'shop.takemi', 'theme': 'blue', 'name': 'takemi',
               'menu': [{'id': 'medicine', 'items': ['recov-r-50', 'recov-r-100', 'takemedic', 'takemedic-all', 'soul-drop']}]},
    'drugstore': {'kind': 'item', 'keeper': 'shop.vendor', 'theme': 'mono', 'name': 'drugstore',
                  'menu': [{'id': 'item', 'items': ['medicine', 'snuff', 'bead', 'revival-bead', 'energy-drink']}, {'id': 'sell'}]},
}
out = {'_note': 'D-007 四类店（velvet 走合成画面）；价格/数值为 UMBRA 样板值；物品名沿用 P5R 英文原名。卖价 = 买价 ×sellRate（装备/消耗品），宝物按 treasure 表。',
       'sellRate': 0.5, 'maxStack': 99, 'battleCarry': 10, 'equip': W, 'consumable': C, 'treasure': T, 'shops': SHOPS,
       'eqScale': {'melee': [50, 300], 'gun': [40, 300], 'def': [20, 250]}}
json.dump(out, open(os.path.join(R, 'src/game/data/shop.json'), 'w'), ensure_ascii=False, indent=1)
print('equip', len(W), 'consumable', len(C))
