/**
 * 新建 / 编辑人格面板（真实 NavigatorSettings.tsx gen 面板）。?variant=new|edit
 * 名字、头像剪影 + 上传（→ 调整人格头像裁切）、称呼、语气关键词（多选）、陪伴型/督促型、自由描述、
 * AI 生成人格设定 / 换一版（生成中…）、人格设定（可改）、喜好 喜欢/讨厌/小习惯、保存 / 取消、关闭。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@yellow/registry/types';
import type { NavigatorPreset } from '@real/types';
import { v4 as uuidv4 } from 'uuid';
import { P6Sheet } from '@yellow/screens/pkg6/sheet';
import { CfgInput, CfgTextarea, CfgMsg } from '@yellow/screens/pkg6/cfg';
import { GLYPH_PATHS, TONE_WORDS } from '@yellow/mock/pkg6';
import { useNavigatorStore } from '@/store/navigator';
import { generatePersonaPrompt } from '@/utils/navigatorIntent';
import { CropDialog } from './ImageCropDialog.p4g';
import { P4Button, useToast } from '@yellow/kit';
import { cx } from '@yellow/lib/cx';

export function Glyph({ id, size = 24, className }: { id?: string; size?: number; className?: string }) {
  if (id?.startsWith('data:') || id?.startsWith('blob:')) return <img src={id} alt="" width={size} height={size} className={cx('rounded-[3px] object-cover', className)} />;
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden><path d={GLYPH_PATHS[id ?? 'cat'] ?? GLYPH_PATHS.cat} fill="currentColor" /></svg>;
}

interface Gen { name: string; avatar: string; callMe: string; tones: string[]; coach: 'accompany' | 'push'; free: string; personaPrompt: string; likes: string; dislikes: string; habits: string; generating: boolean; error: string }
const blank: Gen = { name: '', avatar: 'cat', callMe: '', tones: [], coach: 'accompany', free: '', personaPrompt: '', likes: '', dislikes: '', habits: '', generating: false, error: '' };
const splitTraits = (value: string) => value.split(/[，,、；;\n]+/).map((item) => item.trim()).filter(Boolean);

export function PersonaEditor({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: NavigatorPreset | null }) {
  const toast = useToast();
  const [g, setG] = useState<Gen>(blank);
  const [crop, setCrop] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setG(editing ? {
      ...blank,
      name: editing.name,
      avatar: editing.avatar ?? 'cat',
      personaPrompt: editing.personaPrompt,
      likes: editing.traits?.likes.join('、') ?? '',
      dislikes: editing.traits?.dislikes.join('、') ?? '',
      habits: editing.traits?.habits.join('、') ?? '',
    } : blank);
  }, [open, editing]);
  const chip = (on: boolean) => cx('p4g-press rounded-[3px] border-2 px-3 py-1.5 font-display text-meta font-bold', on ? 'border-p4g-black bg-p4g-black text-p4g-yellow night:border-p4g-yellow night:bg-p4g-yellow night:text-p4g-black' : 'border-p4g-line/50 bg-p4g-surface');
  const generate = async () => {
    if (!g.name.trim()) { setG((s) => ({ ...s, error: '先给它起个名字' })); return; }
    setG((s) => ({ ...s, generating: true, error: '' }));
    try {
      const personaPrompt = await generatePersonaPrompt({
        name: g.name.trim(),
        callUser: g.callMe.trim(),
        toneWords: g.tones,
        coach: g.coach,
        freeText: g.free.trim(),
      });
      setG((s) => ({ ...s, generating: false, personaPrompt }));
    } catch (e) {
      setG((s) => ({ ...s, generating: false, error: e instanceof Error ? e.message : '人格生成失败' }));
    }
  };
  const save = async () => {
    if (!g.name.trim() || !g.personaPrompt.trim()) { setG((s) => ({ ...s, error: '名字和人格设定都不能为空' })); return; }
    const traits = { likes: splitTraits(g.likes), dislikes: splitTraits(g.dislikes), habits: splitTraits(g.habits) };
    const hasTraits = traits.likes.length + traits.dislikes.length + traits.habits.length > 0;
    await useNavigatorStore.getState().savePreset({
      id: editing?.id ?? uuidv4(),
      name: g.name.trim(),
      avatar: g.avatar,
      personaPrompt: g.personaPrompt.trim(),
      isBuiltin: false,
      createdAt: editing?.createdAt ?? new Date(),
      handoffLine: editing?.handoffLine,
      examples: editing?.examples,
      traits: hasTraits ? traits : undefined,
    });
    toast.success(editing ? '人格已更新' : '新人格已加入');
    onClose();
  };
  return (
    <>
      <P6Sheet open={open} onClose={onClose} title={editing ? '编辑人格' : '新建人格'} en="PERSONA" size="tall"
        footer={<div className="flex gap-3"><P4Button variant="secondary" block onClick={onClose}>取消</P4Button><P4Button block onClick={() => void save()}>保存</P4Button></div>}>
        <div className="space-y-4 pt-1">
          <CfgInput aria-label="名字" placeholder="名字（如：白手套 / 老班长…）" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <div>
            <div className="mb-1.5 font-display text-meta font-bold">头像</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.keys(GLYPH_PATHS).map((k) => (
                <button key={k} type="button" aria-label={`剪影 ${k}`} aria-pressed={g.avatar === k} onClick={() => setG({ ...g, avatar: k })}
                  className={cx('p4g-press flex h-12 w-12 items-center justify-center rounded-[4px] border-3', g.avatar === k ? 'border-p4g-black bg-p4g-yellow text-p4g-black shadow-hard-sm night:border-p4g-yellow' : 'border-p4g-line/30 bg-p4g-surface text-p4g-ink')}><Glyph id={k} size={28} /></button>
              ))}
              {g.avatar.startsWith('data:') && <span className="flex h-12 w-12 items-center justify-center rounded-[4px] border-3 border-p4g-black bg-p4g-yellow shadow-hard-sm"><Glyph id={g.avatar} size={40} /></span>}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="上传头像图片" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(URL.createObjectURL(f)); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-[4px] border-3 border-dashed border-p4g-line/50 px-3 font-display text-meta font-bold">上传</button>
            </div>
            <p className="mt-1 text-2xs text-p4g-muted">上传头像只存本机，永不上云。</p>
          </div>
          <CfgInput aria-label="称呼" placeholder="它怎么称呼你？（可空，如：老板 / 小朋友）" value={g.callMe} onChange={(e) => setG({ ...g, callMe: e.target.value })} />
          <div>
            <div className="mb-1.5 font-display text-meta font-bold">语气关键词（多选）</div>
            <div className="flex flex-wrap gap-1.5">
              {TONE_WORDS.map((t) => <button key={t} type="button" aria-pressed={g.tones.includes(t)} className={chip(g.tones.includes(t))} onClick={() => setG({ ...g, tones: g.tones.includes(t) ? g.tones.filter((x) => x !== t) : [...g.tones, t] })}>{t}</button>)}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button type="button" className={chip(g.coach === 'accompany')} onClick={() => setG({ ...g, coach: 'accompany' })}>陪伴型</button>
              <button type="button" className={chip(g.coach === 'push')} onClick={() => setG({ ...g, coach: 'push' })}>督促型</button>
            </div>
          </div>
          <CfgTextarea rows={2} aria-label="自由描述" placeholder="自由描述（可空）：口头禅、背景设定、想避免的说话方式…" value={g.free} onChange={(e) => setG({ ...g, free: e.target.value })} />
          <P4Button block variant="black" busy={g.generating} disabled={g.generating} onClick={() => void generate()}>{g.generating ? '生成中…' : g.personaPrompt ? '换一版' : 'AI 生成人格设定'}</P4Button>
          {g.error && <CfgMsg>{g.error}</CfgMsg>}
          {(g.personaPrompt || editing) && (
            <>
              <div>
                <div className="mb-1.5 font-display text-meta font-bold">人格设定（保存前可随意修改）</div>
                <CfgTextarea rows={5} aria-label="人格设定" value={g.personaPrompt} onChange={(e) => setG({ ...g, personaPrompt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <div className="text-meta font-bold leading-snug">喜好（它每天的小状态会用到；用「、」隔开，留空的话第一次用到时按人格设定自动写）</div>
                {([['likes', '喜欢', '晒太阳、热可可'], ['dislikes', '讨厌', '下雨、闹钟'], ['habits', '小习惯', '下雨天话变少']] as const).map(([k, label, ph]) => (
                  <label key={k} className="flex min-w-0 items-center gap-2"><span className="w-[3.5em] shrink-0 font-display text-meta font-bold">{label}</span>
                    <CfgInput aria-label={`${label}（用「、」隔开）`} placeholder={ph} value={g[k]} onChange={(e) => setG({ ...g, [k]: e.target.value })} /></label>
                ))}
              </div>
            </>
          )}
        </div>
      </P6Sheet>
      <CropDialog open={!!crop} src={crop ?? undefined} title="调整人格头像" onClose={() => setCrop(null)} onDone={(url) => { setG((s) => ({ ...s, avatar: url })); setCrop(null); }} />
    </>
  );
}

export default function NavigatorPersonaEditor({ open, onClose, params }: OverlayProps) {
  const edit = params?.get('variant') === 'edit' ? useNavigatorStore.getState().presets[0] ?? null : null;
  return <PersonaEditor open={open} onClose={onClose} editing={edit} />;
}
