#!/usr/bin/env python3
"""r13 录像混音：画面帧 + SE（sfx-*.json）+ 原版战斗 BGM（bgm-*.json = 游戏里的 window.__bgmLog）。
BGM：按 __bgmLog 的 play 事件（曲目、相对第 0 帧的毫秒、loopStart/loopEnd 秒、增益）用同一份 public/p5t-bgm/<track>.ogg 重建，
  曲目在第 0 帧之前就开始了 → 从 (第 0 帧 - 开始时刻) 处切入；超过 loopEnd 时按原版循环点回到 loopStart（与游戏 WebAudio loop 一致）；
  fade 事件 = 线性淡出 ms 毫秒（与 stopBgm 一致）。
SE 部分同 r12（名字 / 毫秒 / 增益 × vol）。
用法: python3 tools/rec-r13/mix.py FRAMES_DIR OUT.mp4 [fps=30] [vol=0.8]"""
import json, glob, os, subprocess, sys, tempfile
frames, out = sys.argv[1], sys.argv[2]
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 30
vol = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8  # = 游戏默认 SE 音量 umbra.sfxVol 0.8
here = os.path.dirname(os.path.abspath(__file__))
pub = os.path.join(here, '..', '..', 'public')
SR = 48000
ev = []
for f in sorted(glob.glob(os.path.join(frames, 'sfx-*.json'))): ev += json.load(open(f))
bev = []
for f in sorted(glob.glob(os.path.join(frames, 'bgm-*.json'))): bev += json.load(open(f))
fr = sorted(int(os.path.basename(f)[1:6]) for f in glob.glob(os.path.join(frames, 'f*.jpg')))
start = fr[0]; off = start * 1000 / fps
ev = sorted({(round(e['ms'] - off), e['name'], e['gain']) for e in ev if e['ms'] - off >= 0})
n = len(fr); dur = n / fps
tmp = tempfile.mkdtemp(prefix='r13mix-')


def build_bgm():
    """返回 BGM wav 路径（s16le 立体声 48k，长度 = dur）或 None"""
    seen = {}
    plays = [e for e in bev if e['ev'] == 'play']
    if not plays: return None
    bev_sorted = sorted(bev, key=lambda e: e['ms'])
    total = int(dur * SR)
    outb = bytearray(total * 4)
    segs = []  # (play 事件, 下一事件)
    for i, e in enumerate(bev_sorted):
        if e['ev'] != 'play': continue
        nxt = next((x for x in bev_sorted[i + 1:] if x['ms'] >= e['ms']), None)
        segs.append((e, nxt))
    for e, nxt in segs:
        tr = e['track']
        if tr not in seen:
            raw = os.path.join(tmp, tr + '.raw')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(pub, 'p5t-bgm', tr + '.ogg'), '-f', 's16le', '-ac', '2', '-ar', str(SR), raw], check=True)
            seen[tr] = open(raw, 'rb').read()
        pcm = seen[tr]; nsmp = len(pcm) // 4
        ls, le = int(round(e['loopStart'] * SR)), min(nsmp, int(round(e['loopEnd'] * SR)))
        rel0 = (e['ms'] - off) / 1000  # 曲目开始时刻相对视频 0 秒（负 = 视频开始前就在放）
        s_out = max(0, int(rel0 * SR))
        e_out = total
        if nxt: e_out = min(total, int(((nxt['ms'] - off) / 1000 + (nxt['fadeMs'] if nxt['ev'] == 'fade' else 0)) * SR))
        # 逐块拷贝（按循环点折返）
        p = s_out
        while p < e_out:
            tpos = p - int(rel0 * SR)  # 曲内采样位置（未折返）
            if tpos >= le: tpos = ls + (tpos - ls) % (le - ls)
            seg_end = le if tpos < le else nsmp
            take = min(e_out - p, seg_end - tpos)
            if take <= 0: break
            outb[p * 4:(p + take) * 4] = pcm[tpos * 4:(tpos + take) * 4]
            p += take
    raw = os.path.join(tmp, 'bgm_mix.raw'); open(raw, 'wb').write(outb)
    # 增益 + 淡出（fade 事件）
    g = plays[0]['gain']
    af = [f'volume={g:.3f}']
    for e in bev_sorted:
        if e['ev'] == 'fade':
            st = (e['ms'] - off) / 1000
            if st < dur: af.append(f"afade=t=out:st={max(0, st):.3f}:d={max(0.01, e['fadeMs']):.3f}")
    wav = os.path.join(tmp, 'bgm.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '2', '-ar', str(SR), '-i', raw, '-af', ','.join(af), wav], check=True)
    return wav


# __bgmLog 的 fade 事件把淡出时长记在 'ms'，rec.mjs 另存为 fadeMs（毫秒）后把 ms 改成相对第 0 帧的时刻 → 这里换算成秒；缺省 1.5s
for e in bev:
    if e['ev'] == 'fade': e['fadeMs'] = (e.get('fadeMs') or 1500) / 1000
bgm = build_bgm()
print('frames', n, 'dur', round(dur, 2), 'sfx', len(ev), 'bgm', [(e['ev'], e.get('track'), round(e['ms'] - off)) for e in bev])
args = ['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-start_number', str(start), '-i', os.path.join(frames, 'f%05d.jpg')]
filt = []; ins = []
k = 1
if bgm:
    args += ['-i', bgm]; ins.append(f'[{k}:a]aformat=channel_layouts=stereo,aresample=48000[bg]'); k += 1
for i, (ms, name, g) in enumerate(ev):
    args += ['-i', os.path.join(pub, 'p5t-sfx', name + '.ogg')]
    filt.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g * vol:.3f},adelay={ms}|{ms}[a{i}]'); k += 1
labels = (['[bg]'] if bgm else []) + [f'[a{i}]' for i in range(len(ev))]
if labels:
    filt = ins + filt
    filt.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{dur:.3f},apad=whole_dur={dur:.3f}[aout]')
    args += ['-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '160k']
args += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'veryfast', '-r', str(fps), '-t', f'{dur:.3f}', out]
subprocess.run(args, check=True)
print('wrote', out, os.path.getsize(out))
