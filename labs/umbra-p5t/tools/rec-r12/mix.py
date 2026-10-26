#!/usr/bin/env python3
"""r9：支持从非 0 帧开始（自动按首帧号平移音轨）。r8 录像混音：rec.mjs 记下的 SE 事件（sfx-*.json：名字 / 相对第 0 帧毫秒 / 增益）→ 用游戏里同一份 public/p5t-sfx/*.ogg 按时间叠成一条音轨，
再与逐帧画面合成 mp4。用法: python3 tools/rec-r8/mix.py FRAMES_DIR OUT.mp4 [fps=30] [vol=0.8]"""
import json, glob, os, subprocess, sys
frames, out = sys.argv[1], sys.argv[2]
fps = float(sys.argv[3]) if len(sys.argv) > 3 else 30
vol = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8  # = 游戏默认音量 umbra.sfxVol 0.8
here = os.path.dirname(os.path.abspath(__file__))
sfxdir = os.path.join(here, '..', '..', 'public', 'p5t-sfx')
ev = []
for f in sorted(glob.glob(os.path.join(frames, 'sfx-*.json'))): ev += json.load(open(f))
fr = sorted(int(os.path.basename(f)[1:6]) for f in glob.glob(os.path.join(frames, 'f*.jpg')))
start = fr[0]; off = start * 1000 / fps
ev = sorted({(round(e['ms'] - off), e['name'], e['gain']) for e in ev if e['ms'] - off >= 0})
n = len(fr)
dur = n / fps
print('frames', n, 'dur', round(dur, 2), 'sfx', len(ev))
args = ['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-start_number', str(start), '-i', os.path.join(frames, 'f%05d.jpg')]
filt = []
for i, (ms, name, g) in enumerate(ev):
    args += ['-i', os.path.join(sfxdir, name + '.ogg')]
    filt.append(f'[{i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g * vol:.3f},adelay={ms}|{ms}[a{i}]')
if ev:
    filt.append(''.join(f'[a{i}]' for i in range(len(ev))) + f'amix=inputs={len(ev)}:normalize=0:duration=longest,atrim=0:{dur:.3f},apad=whole_dur={dur:.3f}[aout]')
    args += ['-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '160k']
args += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'veryfast', '-r', str(fps), '-t', f'{dur:.3f}', out]
subprocess.run(args, check=True)
print('wrote', out, os.path.getsize(out))
