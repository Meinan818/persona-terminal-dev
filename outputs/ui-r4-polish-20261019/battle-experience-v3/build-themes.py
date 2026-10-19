# 生成 theme-*.css：把 src-*.css 里的前缀 "T " 换成 html[data-theme=..] 作用域
import re,glob
fonts='''@font-face{font-family:ShCond;font-style:italic;font-weight:800;src:url('/fonts/barlow/bc-i800.woff2') format('woff2'),url('../../public/fonts/barlow/bc-i800.woff2') format('woff2');font-display:swap}
@font-face{font-family:ShCond;font-style:italic;font-weight:600;src:url('/fonts/barlow/bc-i600.woff2') format('woff2'),url('../../public/fonts/barlow/bc-i600.woff2') format('woff2');font-display:swap}
@font-face{font-family:ShCond;font-style:normal;font-weight:600;src:url('/fonts/barlow/bc-600.woff2') format('woff2'),url('../../public/fonts/barlow/bc-600.woff2') format('woff2');font-display:swap}
@font-face{font-family:ShCond;font-style:normal;font-weight:800;src:url('/fonts/barlow/bc-800.woff2') format('woff2'),url('../../public/fonts/barlow/bc-800.woff2') format('woff2');font-display:swap}
@font-face{font-family:P4Tv;src:url('/fonts/p4/bebas.woff2') format('woff2'),url('../../public/fonts/p4/bebas.woff2') format('woff2');font-display:swap}
@font-face{font-family:P4Hand;font-weight:700;src:url('/fonts/p4/caveat-700.woff2') format('woff2'),url('../../public/fonts/p4/caveat-700.woff2') format('woff2');font-display:swap}
@font-face{font-family:VelvetSerif;src:url('/fonts/velvet-serif-sc-ext.v1.woff2') format('woff2'),url('../../public/fonts/velvet-serif-sc-ext.v1.woff2') format('woff2');font-display:swap}
:root{--p4-tv:P4Tv,Oswald,Impact,sans-serif;--p4-hand:P4Hand,'Segoe Script',cursive;--p4-serif:VelvetSerif,'Noto Serif SC','Source Han Serif SC','Songti SC',serif;--sh-cd:ShCond,'Arial Narrow',sans-serif;--sh-sans:Velvet,'Microsoft YaHei','PingFang SC','Noto Sans CJK SC','WenQuanYi Micro Hei',sans-serif}
'''
for theme in ['p3','p4','p5']:
    parts=sorted(glob.glob(f'src-{theme}-*.css'))
    if not parts: continue
    out=''
    for p in parts:
        css=open(p, encoding='utf-8').read()
        css=re.sub(r'(^|[\n,{}])\s*T ',lambda m:m.group(1)+f'html[data-theme={theme}] ',css)
        out+=f'/* ---- {p} ---- */\n'+css+'\n'
    open(f'theme-{theme}.css','w', encoding='utf-8', newline='\n').write(out)
    print(theme,len(out))

open('theme-base.css','w', encoding='utf-8', newline='\n').write(fonts)
