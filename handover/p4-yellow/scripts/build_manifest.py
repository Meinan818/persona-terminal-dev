import json
S='/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/wt/p4-yellow/src/umbra/skins/p4-yellow/'
R=json.load(open('/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/p4y/assets_report.json'))['report']
FC=json.load(open('/workspace/projects/86a5b727-7f71-46d0-bb30-e183f98dd9ca/work/p4y/fontchars.json'))
W='Megami Tensei Wiki 官方渲染（umbra-demo/assets/p4/ASSETS.md 有逐张来源页）'
def A(id,file,src,first,note,atlas=None,w=None,h=None):
    r=R[file]; return {'id':id,'file':'assets/'+file,'w':w or r['w'],'h':h or r['h'],**({'atlas':atlas} if atlas else {}),'firstPack':first,'source':src,'note':note}
assets=[
 A('bg.battle','bg-battle.webp','generated',True,'P4G 电视世界摄影棚黄雾战斗背景；generate_image（参照项目内 p4g-gen/tv-world-src.png）生成后放大到 2240 宽，含左右+上下出血'),
 A('cutin.hero','cutin-hero.webp','official',True,'主角眼部 cut-in：官方 P4_Protagonist 渲染裁眼部（'+W+'）；黄底速度条/网点为程序绘制'),
 A('allout.finish.default','allout-finish.webp','official',True,'总攻定格画：黄/白底黑集中线漫画四格；人物为官方渲染（Yutransparent=P4U 鸣上悠、Yosuke_Hanamura、Chie_Satonaka、Yukiko_Amagi，'+W+'），格框/网点/集中线程序绘制；无文字'),
 A('atlas.portraits','atlas-portraits.webp','official',True,'我方 4 人立绘图集（帧表 assets/atlas-portraits.json，Pixi spritesheet 格式）；官方渲染 P4_Protagonist/Yosuke_Hanamura/Chie_Satonaka/Yukiko_Amagi，高 640，拆 body+head 两层'),
 A('atlas.hud','atlas-hud.webp','generated',True,'HUD/粒子/转场小件图集（帧表 assets/atlas-hud.json）；全部由 work/p4y/build_assets.py 程序绘制（非 AI、非官方）'),
 A('bg.map','bg-map.webp','generated',False,'电视世界迷宫走廊（雪子城风）地图背景；generate_image 生成，2240 宽，延迟包'),
 A('bg.hub','bg-hub.webp','generated',False,'稻羽商店街据点背景；generate_image（参照 p4g-gen/town-day-wide-src.png）生成，2240 宽，延迟包'),
 A('highlight.hero','highlight-hero.webp','official',False,'主角必杀定格画：官方 IzanagiP4Full + Yutransparent 渲染（'+W+'）合成，黄底集中线程序绘制；延迟包'),
 A('enemy.calm-pesce','enemy-calm-pesce.webp','official',False,'敌人 Calm Pesce 官方模型图（'+W+'，File:Calm_Pesce.png）；延迟包'),
]
for atlas,fn,src in (('atlas.portraits','atlas-portraits','official'),('atlas.hud','atlas-hud','generated')):
    fr=json.load(open(S+'assets/'+fn+'.json'))['frames']
    for k,v in fr.items():
        assets.append({'id':k,'file':'assets/'+fn+'.webp','w':v['frame']['w'],'h':v['frame']['h'],'atlas':atlas,'firstPack':True,'source':src})
m={'assets':assets,'filters':[],
   'fonts':[{'family':'P4YDisplay','file':'assets/fonts/p4y-display.woff2','chars':FC['display'],'role':'display','pack':'first'},
            {'family':'P4YNumber','file':'assets/fonts/p4y-number.woff2','chars':FC['number'],'role':'number','pack':'first'}]}
json.dump(m,open(S+'manifest.json','w'),ensure_ascii=False,indent=1)
print(len(assets))
