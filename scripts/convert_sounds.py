# -*- coding: utf-8 -*-
"""P5 原版 UI 音效 → 项目所需 26 个 mp3。

来源：D:/下载/P5 下两个包（Battle_UI_Quotes Sounds / Persona Skill Sounds）。
策略：按时长语义分配——超短(0.09-0.15s)=光标/点击；短(0.15-0.3s)=确认/切换；
中(0.3-0.5s)=成功/升级；战斗音从 Skill 包取更长、更有冲击力的。
"""
import os, glob, struct, subprocess, shutil

FFMPEG = r"C:\Users\Lqx24\.workbuddy\binaries\python\versions\3.13.12\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
SRC = r"D:/下载/P5"
UI_DIR = os.path.join(SRC, "PlayStation 3 - Persona 5 - Sound Effects - Battle_UI_Quotes Sounds")
SKILL_DIR = os.path.join(SRC, "PlayStation 3 - Persona 5 - Sound Effects - Persona Skill Sounds")
OUT = r"E:/MASKARIA/public"

def parse_wav(path):
    with open(path, 'rb') as f:
        d = f.read(200)
    if d[:4] != b'RIFF':
        return None
    fmt_off = d.find(b'fmt ')
    if fmt_off < 0:
        return None
    byterate = struct.unpack('<I', d[fmt_off+16:fmt_off+20])[0]
    data_off = d.find(b'data')
    data_sz = struct.unpack('<I', d[data_off+4:data_off+8])[0]
    return data_sz / byterate if byterate else 0

# 建立 UI 包 与 Skill 包的 文件名→(时长,完整路径) 映射
ui_map = {}
skill_map = {}
for d, m in [(UI_DIR, ui_map), (SKILL_DIR, skill_map)]:
    for p in glob.glob(os.path.join(d, '**', '*.wav'), recursive=True):
        if '_streaming' in p:
            continue
        dur = parse_wav(p)
        if dur is not None:
            m[os.path.basename(p)] = (dur, p)

def get(m, name):
    return m.get(name + '.wav')

def conv(src_path, out_name, volume=1.0):
    """wav → mp3，可调音量（volume 为倍数）"""
    out_path = os.path.join(OUT, out_name)
    af = f'volume={volume}' if volume != 1.0 else None
    cmd = [FFMPEG, '-y', '-i', src_path]
    if af:
        cmd += ['-af', af]
    cmd += ['-acodec', 'libmp3lame', '-b:a', '128k', out_path]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print('  失败:', out_name, r.stderr.decode('utf-8', 'ignore')[:200])

# ── 分配表：项目文件名 → (源文件, 音量) ──────────────────────────────
# 说明：red=P5 用最原汁原味的；yellow/blue 用不同编号做区分（后续可再调）
ASSIGN = [
    # A. 红/P5 主题音（themec-* + ok + dd）
    ('themec-switch.mp3', ('00100', 'ui', 1.0)),   # 切换：干脆短音
    ('themec-level.mp3',  ('00103', 'ui', 1.0)),   # 升级
    ('ok.mp3',            ('00042', 'ui', 1.0)),   # 确认
    ('dd.mp3',            ('00086', 'ui', 1.0)),   # 光标/导航
    # B. 蓝/P3 主题音（themea-*，用不同编号）
    ('themea-switch.mp3', ('00101', 'ui', 0.95)),
    ('themea-nav.mp3',    ('00087', 'ui', 0.95)),
    ('themea-success.mp3',('00088', 'ui', 0.95)),
    ('themea-level.mp3',  ('00089', 'ui', 0.95)),
    # C. 黄/P4 主题音（themeb-*，再用不同编号）
    ('themeb-switch.mp3', ('00105', 'ui', 1.05)),
    ('themeb-nav.mp3',    ('00119', 'ui', 1.05)),
    ('themeb-success.mp3',('00120', 'ui', 1.05)),
    ('themeb-level.mp3',  ('00121', 'ui', 1.05)),
    # D. 战斗音（8 个，从 UI 包更长音 + Skill 包）
    ('battle-start.mp3',    ('00090', 'ui', 1.0)),
    ('battle-awaken.mp3',   ('00041', 'ui', 1.0)),
    ('battle-summon.mp3',   ('00054', 'ui', 1.0)),
    ('battle-impact.mp3',   ('00072', 'ui', 1.0)),
    ('battle-critical.mp3', ('00094', 'ui', 1.0)),
    ('battle-fanfare.mp3',  ('00081', 'ui', 1.0)),
    ('battle-mask-swap.mp3',('00092', 'ui', 1.0)),
    ('battle-seal.mp3',     ('00107', 'ui', 1.0)),
    # E. 其他（6 个）
    ('ui-menu.mp3',       ('00108', 'ui', 1.0)),
    ('tarots.mp3',        ('00111', 'ui', 1.0)),
    ('pray.mp3',          ('00114', 'ui', 1.0)),
    ('pi.mp3',            ('00116', 'ui', 1.0)),
    ('penalty.mp3',       ('00117', 'ui', 1.0)),
    ('shadowattack.mp3',  ('00127', 'ui', 1.0)),
]

ok = 0
fail = []
for out_name, (src_name, kind, vol) in ASSIGN:
    m = ui_map if kind == 'ui' else skill_map
    entry = m.get(src_name + '.wav')
    if entry is None:
        fail.append((out_name, src_name))
        print('  [缺失源]', out_name, '<-', src_name)
        continue
    dur, src_path = entry
    conv(src_path, out_name, vol)
    ok += 1
    print('  OK  %-22s <- %s (%.3fs)' % (out_name, src_name, dur))

print()
print('成功转换:', ok, '个；缺失源:', len(fail))
