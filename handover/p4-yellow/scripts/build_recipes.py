#!/usr/bin/env python3
"""生成 p4-yellow recipes/*.json（声明式，§2 schema）。可重跑。"""
import json, os
OUT = '/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/wt/p4-yellow/src/umbra/skins/p4-yellow/recipes/'
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.json'): os.remove(OUT + f)

TGT = {"x": "$target", "y": "$target", "dy": -230}
Y, K, W, O = "@color.primary", "@color.ink", "#ffffff", "@color.accent"


def T(at, prim, args=None, dur=None, **kw):
    t = {"at": at}
    if dur is not None: t["dur"] = dur
    t["prim"] = prim
    for k in ("layer", "ease"):
        if k in kw: t[k] = kw.pop(k)
    t["args"] = args or {}
    t.update(kw)
    return t


def hit_block(at, kind_tag="WEAK", big=False, px=14, sfx="hit.light", sparks=120, life=500, push=18):
    """命中套件（全部在 at 起）。"""
    return [
        T(at, "hitStop", {"ms": 70 if big else 60}),
        T(at, "shake", {"px": px}, dur=300 if big else 240),
        T(at, "flashSprite", {"target": "$target", "ms": 50}),
        T(at, "squashHit", {"target": "$target", "squash": 0.2 if big else 0.14, "push": push, "recoverMs": 280 if big else 220}),
        T(at, "particles", {"count": sparks, "at": TGT, "speed": 1100 if big else 800, "spread": 6.28, "dir": 0, "life": life,
                            "size": [10, 26], "gravity": 900, "frames": ["fx.star", "fx.spark", "fx.square"], "colors": [Y, W, K]},
          minimal={"args": {"count": sparks // 2, "at": TGT, "speed": 800, "spread": 6.28, "dir": 0, "life": 300, "size": [10, 22], "gravity": 900, "frames": ["fx.star", "fx.spark"], "colors": [Y, W]}}),
        T(at, "damageNumber", {"font": "@font.number", "big": big}, dur=560 if not big else 700),
        T(at, "tag", {"kind": kind_tag, "pos": {"x": "$target", "y": "$target", "dy": -330}}, dur=520),
        T(at, "sfx", {"id": sfx}),
    ]


def R(id, event, duration, tracks, assets, hitMarks=None, match=None, create=None, merges=None):
    r = {"id": id, "event": event}
    if match: r["match"] = match
    if merges: r["merges"] = merges
    r["duration"] = duration
    if hitMarks is not None: r["hitMarks"] = hitMarks
    if create: r["create"] = create
    r["assets"] = assets
    r["tracks"] = sorted(tracks, key=lambda t: t["at"])
    json.dump(r, open(OUT + id + '.json', 'w'), ensure_ascii=False, indent=1)


# 1 开战转场：电视雪花 → 黄块推屏（P4G 遇敌电视关机/开机感）0.88s
R("transition.battleStart", "battle:start", 880, [
    T(0, "tvStatic", {"intensity": 0.85, "scanlines": True, "rollPx": 24, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=380, layer="trans", minimal={"dur": 150}),
    T(0, "sfx", {"id": "tv.static"}),
    T(0, "vibrate", {"ms": 30}),
    T(120, "flashScreen", {"color": "#FFE200", "alpha": 0.5}, dur=90, layer="trans"),
    T(300, "blockPush", {"cols": 8, "rows": 5, "order": "diagonal", "art": "fx.block", "color": Y}, dur=560, layer="trans", ease="inOutCubic", minimal={"dur": 200}),
    T(300, "sfx", {"id": "block.push"}),
], ["fx.tvstatic.0", "fx.tvstatic.1", "fx.block"])

# 2 遇敌+开战合流版（§2.3 风格，≤1.2s）
R("transition.encounterBattle", "map:encounter", 1150, [
    T(0, "dim", {"color": "#1A1400", "alpha": 0.4}, dur=300, layer="trans"),
    T(0, "tvStatic", {"intensity": 0.8, "scanlines": True, "rollPx": 24, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=450, layer="trans", minimal={"dur": 200}),
    T(0, "sfx", {"id": "tv.static"}),
    T(0, "vibrate", {"ms": 30}),
    T(350, "blockPush", {"cols": 8, "rows": 5, "order": "diagonal", "art": "fx.block", "color": Y}, dur=780, layer="trans", ease="inOutCubic", minimal={"dur": 300}),
    T(350, "sfx", {"id": "block.push"}),
], ["fx.tvstatic.0", "fx.tvstatic.1", "fx.block"], merges=["battle:start"])

# 3 通用攻击 ≤1.0s
R("action.default", "action", 960, [
    T(0, "afterimage", {"actor": "$actor", "to": {"x": "$target", "y": "$target", "dx": -150}, "n": 2, "tints": [W, Y]}, dur=260, ease="inCubic", layer="ally"),
    T(0, "sfx", {"id": "dash"}),
    T(300, "slashLine", {"pos": TGT, "rot": -0.6, "len": 520, "width": 16}, dur=140, layer="fx"),
    *hit_block(380, "WEAK", False, 12, "hit.light", 90, 420),
    T(520, "tween", {"target": "$actor", "to": {"x": "home", "y": "home"}}, dur=320, ease="outCubic", layer="ally"),
], ["fx.star", "fx.spark", "fx.square"], hitMarks=[380], match={})

# 4 主角招牌 1：Ziodyne（伊邪那岐雷击）1.6s，含 cut-in
R("action.ziodyne", "action", 1600, [
    T(0, "dim", {"color": "#000", "alpha": 0.45}, dur=200),
    T(0, "cutin", {"bandAngle": -0.08, "speedLines": {"layers": 2, "count": 46},
                   "panels": [{"shape": [-1300, -150, 1300, -110, 1300, 150, -1300, 110], "art": "cutin.hero", "enterFrom": "right", "delay": 0}],
                   "nameplate": {"text": "skill.ziodyne.name", "font": "@font.display"}}, dur=560, ease="outCubic", layer="cutin", minimal={"dur": 250}),
    T(0, "sfx", {"id": "cutin"}),
    T(0, "particles", {"count": 40, "life": 480, "at": {"x": "$screen", "y": 360}, "dir": 3.14, "spread": 0.4, "speed": 1400, "size": [6, 14], "frames": ["fx.streak"], "colors": [W, Y]}, minimal="skip"),
    T(600, "tvStatic", {"intensity": 0.35, "scanlines": True, "rollPx": 12, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=140, layer="fx", minimal="skip"),
    T(620, "show", {"target": "#bolt"}),
    T(620, "tween", {"target": "#bolt", "from": {"x": "$target", "y": -360, "alpha": 1, "scale": 1.2}, "to": {"x": "$target", "y": "$target", "scale": 1.0}}, dur=160, ease="inCubic", layer="fx"),
    T(780, "flashScreen", {"color": "#FFF6B0", "alpha": 0.7}, dur=120),
    T(780, "rgbSplit", {"offset": 8}, dur=90),
    *hit_block(780, "WEAK", True, 20, "hit.elec", 260, 640, 22),
    T(930, "shockwave", {"center": TGT, "amp": 44, "wavelength": 160, "speed": 900, "radius": 520}, dur=460),
    T(800, "tween", {"target": "#bolt", "to": {"alpha": 0, "scale": 1.1}}, dur=260, ease="outCubic", layer="fx"),
    T(1060, "hide", {"target": "#bolt"}),
], ["cutin.hero", "fx.bolt", "fx.streak", "fx.star", "fx.spark", "fx.square", "fx.tvstatic.0", "fx.tvstatic.1"],
  hitMarks=[780], match={"skillId": "ziodyne", "actorId": "hero"}, create=[{"name": "bolt", "asset": "fx.bolt", "layer": "fx", "anchor": [0.5, 1.0]}])

# 5 主角招牌 2：Brave Blade（物理斩）1.5s，含 cut-in
R("action.brave-blade", "action", 1500, [
    T(0, "dim", {"color": "#000", "alpha": 0.45}, dur=200),
    T(0, "cutin", {"bandAngle": 0.08, "speedLines": {"layers": 2, "count": 46},
                   "panels": [{"shape": [-1300, -110, 1300, -150, 1300, 110, -1300, 150], "art": "cutin.hero", "enterFrom": "left", "delay": 0}],
                   "nameplate": {"text": "skill.brave-blade.name", "font": "@font.display"}}, dur=540, ease="outCubic", layer="cutin", minimal={"dur": 250}),
    T(0, "sfx", {"id": "cutin"}),
    T(500, "afterimage", {"actor": "$actor", "to": {"x": "$target", "y": "$target", "dx": -170}, "n": 3, "tints": [W, Y, W]}, dur=240, ease="inCubic", layer="ally"),
    T(500, "sfx", {"id": "dash"}),
    T(700, "show", {"target": "#arc"}),
    T(700, "tween", {"target": "#arc", "from": {"x": "$target", "y": "$target", "alpha": 1, "rotation": -1.2, "scale": 0.8}, "to": {"rotation": 0.6, "scale": 1.25}}, dur=180, ease="outQuart", layer="fx"),
    T(760, "slashLine", {"pos": TGT, "rot": -0.5, "len": 900, "width": 22}, dur=180, layer="fx"),
    T(780, "rgbSplit", {"offset": 10}, dur=90),
    *hit_block(780, "CRIT", True, 22, "hit.heavy", 240, 620, 28),
    T(930, "shockwave", {"center": TGT, "amp": 50, "wavelength": 180, "speed": 1000, "radius": 560}, dur=440),
    T(880, "tween", {"target": "#arc", "to": {"alpha": 0}}, dur=160, layer="fx"),
    T(1040, "hide", {"target": "#arc"}),
    T(900, "tween", {"target": "$actor", "to": {"x": "home", "y": "home"}}, dur=360, ease="outCubic", layer="ally"),
], ["cutin.hero", "fx.slashArc", "fx.star", "fx.spark", "fx.square"],
  hitMarks=[780], match={"skillId": "brave-blade", "actorId": "hero"}, create=[{"name": "arc", "asset": "fx.slashArc", "layer": "fx", "anchor": [0.5, 0.5]}])

# 6 1 MORE ≤0.45s：黄色电视横带 + 角色头像
R("onemore", "onemore", 430, [
    T(0, "banner", {"text": "label.onemore", "shape": [-1300, -78, 1300, -60, 1300, 78, -1300, 60], "enterFrom": "right", "artId": "$actor", "fill": Y, "ink": K, "font": "@font.display"}, dur=400, ease="outBack", layer="cutin", minimal={"dur": 250}),
    T(0, "sfx", {"id": "onemore"}),
    T(40, "particles", {"count": 24, "at": {"x": 900, "y": 300}, "speed": 700, "spread": 1.2, "dir": 3.14, "life": 340, "size": [14, 28], "frames": ["fx.star", "fx.star.white"], "colors": [W]}, minimal="skip"),
], ["fx.star", "fx.star.white"])

# 7 全员包围（Hold Up）≤1.0s：漫画集中线 + 尘团 + 星
R("holdup", "holdup", 940, [
    T(0, "dim", {"color": "#1A1400", "alpha": 0.4}, dur=900),
    T(0, "radialBurst", {"rays": 18, "colors": [Y, K], "spin": 0.3}, dur=880, layer="fx", minimal={"args": {"rays": 18, "colors": [Y, K], "spin": 0}}),
    T(0, "sfx", {"id": "holdup"}),
    T(80, "title", {"text": "label.holdup", "font": "@font.display", "size": 104, "pos": {"x": 640, "y": 170}, "rot": -0.06}, dur=700, ease="outBack", layer="cutin", minimal={"dur": 300}),
    T(120, "particles", {"count": 36, "at": {"x": "$targets", "y": "$targets", "dy": -120}, "speed": 520, "spread": 6.28, "life": 600, "size": [40, 90], "gravity": -120, "frames": ["fx.dust"], "colors": [W]}),
    T(200, "particles", {"count": 30, "at": {"x": "$targets", "y": "$targets", "dy": -260}, "speed": 900, "spread": 6.28, "life": 560, "size": [16, 30], "frames": ["fx.star", "fx.star.white"], "colors": [W]}, minimal="skip"),
    T(200, "vibrate", {"ms": 25}),
], ["fx.dust", "fx.star", "fx.star.white"])

# 8 总攻击 3.4s：卡通尘团群殴 + 黄底漫画四格定格
hm = [400 + 210 * i for i in range(8)] + [2120]
R("allout.default", "allout", 3400, [
    T(0, "dim", {"color": "#000", "alpha": 0.5}, dur=200),
    T(0, "radialBurst", {"rays": 24, "colors": [Y, K], "spin": 0.9}, dur=2100, layer="fx"),
    T(0, "title", {"text": "label.allout", "font": "@font.display", "size": 128, "pos": {"x": 640, "y": 150}, "rot": -0.08}, dur=640, ease="outBack", layer="allout"),
    T(0, "sfx", {"id": "allout.start"}),
    T(300, "silhouetteDash", {"units": "$party", "count": 8, "interval": 210, "path": "L2R"}, dur=1760, layer="allout", minimal={"args": {"units": "$party", "count": 3, "interval": 210, "path": "L2R"}}),
    T(400, "particles", {"count": 28, "life": 560, "at": {"x": "$target", "y": "$target", "dy": -180}, "speed": 420, "spread": 6.28, "size": [60, 130], "gravity": -80, "frames": ["fx.dust"], "colors": [W]}, repeatEvery=210, times=8),
    T(400, "particles", {"count": 32, "life": 520, "at": {"x": "$target", "y": "$target", "dy": -260}, "speed": 1000, "spread": 6.28, "size": [14, 30], "gravity": 600, "frames": ["fx.star", "fx.star.white", "fx.spark"], "colors": [W]}, repeatEvery=210, times=8, minimal="skip"),
    T(400, "slashLine", {"pos": TGT, "rot": -0.5, "len": 760, "width": 14}, dur=150, layer="fx", repeatEvery=210, times=8),
    T(400, "sfx", {"id": "allout.hit"}, repeatEvery=420, times=4),
    T(2120, "flashScreen", {"color": "#FFE200", "alpha": 0.85}, dur=150),
    T(2120, "shockwave", {"center": TGT, "amp": 56, "wavelength": 200, "speed": 1100, "radius": 640}, dur=500),
    T(2120, "shake", {"px": 18}, dur=300),
    T(2120, "damageNumber", {"font": "@font.number", "big": True}, dur=700),
    T(2120, "sfx", {"id": "allout.finish"}),
    T(2120, "finishCard", {"artId": "allout.finish.default", "shape": [-700, -380, 760, -340, 700, 380, -760, 340], "enterFrom": "right", "zoom": 1.03}, dur=980, ease="outCubic", layer="allout", minimal={"dur": 500}),
    T(2320, "freezeFrame", {"ms": 760, "keepRendering": True}, dur=760, minimal={"dur": 300, "args": {"ms": 300, "keepRendering": True}}),
    T(2320, "totalDamage", {"label": "label.totalDamage", "plate": [-230, -46, 250, -56, 230, 46, -250, 56], "font": "@font.number", "pos": {"x": 980, "y": 610}}, dur=760, ease="outBack", layer="allout"),
    T(3150, "tween", {"target": "#layer.allout", "to": {"alpha": 0}}, dur=200, layer="allout"),
], ["allout.finish.default", "fx.dust", "fx.star", "fx.star.white", "fx.spark", "atlas.portraits"], hitMarks=hm)

# 9 必杀（主角）3.3s：Myriad Truths（伊邪那岐大神）
R("highlight.hero", "highlight", 3300, [
    T(0, "dim", {"color": "#000", "alpha": 0.6}, dur=600),
    T(0, "tvStatic", {"intensity": 0.6, "scanlines": True, "rollPx": 18, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=260, layer="cutin", minimal="skip"),
    T(0, "sfx", {"id": "highlight.start"}),
    T(200, "cutin", {"bandAngle": -0.1, "speedLines": {"layers": 2, "count": 46},
                     "panels": [{"shape": [-1300, -160, 1300, -120, 1300, 160, -1300, 120], "art": "cutin.hero", "enterFrom": "right", "delay": 0}],
                     "nameplate": {"text": "label.highlight", "font": "@font.display"}}, dur=560, ease="outCubic", layer="cutin", minimal={"dur": 250}),
    T(800, "maskWipe", {"shape": "fx.tvMask", "from": {"scale": 0.05, "x": 640, "y": 360}, "to": {"scale": 6.5, "x": 640, "y": 360}}, dur=520, ease="inCubic", layer="trans"),
    T(800, "radialBurst", {"rays": 24, "colors": [Y, W], "spin": 1.2}, dur=1300, layer="fx"),
    T(900, "title", {"text": "skill.myriad-truths.name", "font": "@font.display", "size": 96, "pos": {"x": 640, "y": 140}, "rot": -0.05}, dur=760, ease="outBack", layer="cutin", minimal={"dur": 300}),
    T(1000, "speedLines", {"count": 40, "dir": 1.57, "colors": [Y, W], "scrollSpeed": 2400}, dur=900, layer="fx"),
    T(1300, "particles", {"count": 160, "at": {"x": "$targets", "y": -40}, "dir": 1.57, "spread": 0.3, "speed": 1800, "life": 520, "size": [8, 20], "frames": ["fx.streak", "fx.spark"], "colors": [W, Y]}, minimal={"args": {"count": 60, "at": {"x": "$targets", "y": -40}, "dir": 1.57, "spread": 0.3, "speed": 1800, "life": 320, "frames": ["fx.streak"], "colors": [W]}}),
    T(1900, "flashScreen", {"color": "#FFFFFF", "alpha": 0.85}, dur=160),
    T(1900, "rgbSplit", {"offset": 10}, dur=100),
    *hit_block(1900, "WEAK", True, 24, "hit.heavy", 300, 700, 30),
    T(2050, "shockwave", {"center": TGT, "amp": 60, "wavelength": 220, "speed": 1200, "radius": 680}, dur=520),
    T(2200, "finishCard", {"artId": "highlight.hero", "shape": [-760, -330, 700, -400, 760, 330, -700, 400], "enterFrom": "left", "zoom": 1.04}, dur=900, ease="outCubic", layer="allout", minimal={"dur": 300}),
    T(2400, "freezeFrame", {"ms": 600, "keepRendering": True}, dur=600, minimal={"dur": 300, "args": {"ms": 300, "keepRendering": True}}),
    T(3100, "tween", {"target": "#layer.allout", "to": {"alpha": 0}}, dur=180, layer="allout"),
], ["cutin.hero", "highlight.hero", "fx.tvMask", "fx.tvstatic.0", "fx.tvstatic.1", "fx.streak", "fx.spark", "fx.star", "fx.square"],
  hitMarks=[1900], match={"actorId": "hero"})

# 10 必杀简短版 ≤1.2s
R("highlight.hero.short", "highlight", 1180, [
    T(0, "dim", {"color": "#000", "alpha": 0.5}, dur=300),
    T(0, "cutin", {"bandAngle": -0.1, "speedLines": {"layers": 1, "count": 30},
                   "panels": [{"shape": [-1300, -150, 1300, -110, 1300, 150, -1300, 110], "art": "cutin.hero", "enterFrom": "right", "delay": 0}],
                   "nameplate": {"text": "label.highlight", "font": "@font.display"}}, dur=380, ease="outCubic", layer="cutin", minimal={"dur": 250}),
    T(0, "sfx", {"id": "highlight.start"}),
    T(420, "flashScreen", {"color": "#FFFFFF", "alpha": 0.8}, dur=120),
    T(420, "rgbSplit", {"offset": 8}, dur=90),
    *hit_block(420, "WEAK", True, 20, "hit.heavy", 200, 520, 26),
    T(580, "shockwave", {"center": TGT, "amp": 48, "wavelength": 180, "speed": 1100, "radius": 560}, dur=420),
    T(600, "finishCard", {"artId": "highlight.hero", "shape": [-760, -330, 700, -400, 760, 330, -700, 400], "enterFrom": "left", "zoom": 1.02}, dur=500, ease="outCubic", layer="allout", minimal={"dur": 300}),
    T(1040, "tween", {"target": "#layer.allout", "to": {"alpha": 0}}, dur=130, layer="allout"),
], ["cutin.hero", "highlight.hero", "fx.star", "fx.spark", "fx.square"], hitMarks=[420], match={"actorId": "hero"})

# 11 倒地（重叠层）≤0.5s：关键信息在 portraitDown/粒子，文字可被丢
R("unit.down", "unit:down", 480, [
    T(0, "portraitDown", {"unit": "$targets", "style": "fall"}, dur=440, ease="inCubic", minimal={"dur": 200}),
    T(0, "sfx", {"id": "down"}),
    T(120, "particles", {"count": 24, "at": {"x": "$targets", "y": "$targets", "dy": -40}, "speed": 360, "spread": 3.14, "dir": -1.57, "life": 340, "size": [40, 80], "gravity": -60, "frames": ["fx.dust"], "colors": [W]}, minimal="skip"),
    T(60, "tag", {"kind": "DOWN", "pos": {"x": "$targets", "y": "$targets", "dy": -300}}, dur=400),
], ["fx.dust"])

# 12 战斗结束 1.4s：黄黑方块收屏 + 胜利字（不放人脸）
R("battle.end", "battle:end", 1400, [
    T(0, "tvStatic", {"intensity": 0.5, "scanlines": True, "rollPx": 16, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=220, layer="trans", minimal="skip"),
    T(0, "sfx", {"id": "battle.win"}),
    T(150, "blockPush", {"cols": 8, "rows": 5, "order": "rowWave", "art": "fx.block.ink", "color": K}, dur=600, layer="trans", ease="outCubic", minimal={"dur": 300}),
    T(500, "title", {"text": "label.victory", "font": "@font.display", "size": 120, "pos": {"x": 640, "y": 330}, "rot": -0.04}, dur=700, ease="outBack", layer="trans", minimal={"dur": 300}),
    T(600, "particles", {"count": 60, "at": {"x": 640, "y": 330}, "speed": 900, "spread": 6.28, "life": 700, "size": [16, 40], "gravity": 500, "frames": ["fx.daisy.white", "fx.daisy.yellow", "fx.star"], "colors": [W]}, minimal="skip"),
], ["fx.tvstatic.0", "fx.tvstatic.1", "fx.block.ink", "fx.daisy.white", "fx.daisy.yellow", "fx.star"])

# 13 进入电视世界：日期牌（取 $env）+ 雪花
R("scene.enter.world", "scene:enter", 600, [
    T(0, "tvStatic", {"intensity": 0.9, "scanlines": True, "rollPx": 30, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=260, layer="trans", minimal={"dur": 120}),
    T(0, "sfx", {"id": "tv.enter"}),
    T(80, "dateFlip", {"from": "$env", "to": "$env", "pages": 1, "plate": "hud.datePlate", "weatherIcons": "hud.weather.", "font": "@font.number"}, dur=500, ease="outCubic", layer="trans", minimal={"dur": 250}),
    T(200, "title", {"text": "label.dive", "font": "@font.display", "size": 72, "pos": {"x": 640, "y": 360}, "rot": 0}, dur=380, layer="trans", minimal="skip"),
], ["fx.tvstatic.0", "fx.tvstatic.1", "hud.datePlate"])

# 14 离开电视世界
R("scene.leave.world", "scene:leave", 600, [
    T(0, "blockPush", {"cols": 8, "rows": 5, "order": "random", "seed": 4, "art": "fx.block", "color": Y}, dur=360, layer="trans", minimal={"dur": 200}),
    T(0, "sfx", {"id": "tv.leave"}),
    T(250, "dateFlip", {"from": "$env", "to": "$env", "pages": 1, "plate": "hud.datePlate", "weatherIcons": "hud.weather.", "font": "@font.number"}, dur=340, ease="outCubic", layer="trans", minimal={"dur": 250}),
], ["fx.block", "hud.datePlate"])

# 15 日期/天气变化：P4 日历翻页（$prev → $env）
R("env.date.flip", "env:change", 600, [
    T(0, "dim", {"color": "#000", "alpha": 0.3}, dur=600),
    T(0, "dateFlip", {"from": "$prev", "to": "$env", "pages": 2, "plate": "hud.datePlate", "weatherIcons": "hud.weather.", "font": "@font.number"}, dur=580, ease="inOutCubic", layer="hud", minimal={"dur": 250, "args": {"from": "$prev", "to": "$env", "pages": 1}}),
    T(0, "sfx", {"id": "date.flip"}),
], ["hud.datePlate"])

# 16 交涉开始：电视开机遮罩
R("talk.start", "talk:start", 760, [
    T(0, "tvStatic", {"intensity": 0.7, "scanlines": True, "rollPx": 20, "frames": ["fx.tvstatic.0", "fx.tvstatic.1"]}, dur=300, layer="trans", minimal={"dur": 150}),
    T(0, "sfx", {"id": "tv.on"}),
    T(150, "maskWipe", {"shape": "fx.tvMask", "from": {"scale": 0.05, "x": 640, "y": 360}, "to": {"scale": 6.0, "x": 640, "y": 360}}, dur=560, ease="outCubic", layer="trans", minimal={"dur": 250}),
], ["fx.tvstatic.0", "fx.tvstatic.1", "fx.tvMask"])

print(sorted(os.listdir(OUT)))
