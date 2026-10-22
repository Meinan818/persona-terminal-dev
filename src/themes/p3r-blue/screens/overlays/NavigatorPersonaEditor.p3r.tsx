/**
 * 新建 / 编辑人格面板（真实 NavigatorSettings.tsx gen 面板）。?variant=new|edit
 * 名字、头像剪影 + 上传（→ 调整人格头像裁切）、称呼、语气关键词（多选）、陪伴型/督促型、自由描述、
 * AI 生成人格设定 / 换一版（生成中…）、人格设定（可改）、喜好 喜欢/讨厌/小习惯、保存 / 取消、关闭。
 */
import { useEffect, useRef, useState } from 'react';
import type { OverlayProps } from '@blue/registry/types';
import type { NavigatorPreset } from '@real/types';
import { P6Sheet } from '@blue/screens/pkg6/sheet';
import { CfgInput, CfgTextarea, CfgMsg } from '@blue/screens/pkg6/cfg';
import { GLYPH_PATHS, TONE_WORDS } from '@blue/mock/pkg6';
import { updateSettings, getSettings } from '@blue/screens/pkg6/settingsStore';
import { CropDialog } from './ImageCropDialog.p3r';
import { P3Button, useToast } from '@blue/kit';
import { cx } from '@blue/lib/cx';

export function Glyph({ id, size = 24, className }: { id?: string; size?: number; className?: string }) {
  if (id?.startsWith('data:') || id?.startsWith('blob:')) return <img src={id} alt="" width={size} height={size} className={cx('rounded-none object-cover', className)} />;
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden><path d={GLYPH_PATHS[id ?? 'cat'] ?? GLYPH_PATHS.cat} fill="currentColor" /></svg>;
}

interface Gen { name: string; avatar: string; callMe: string; tones: string[]; coach: 'accompany' | 'push'; free: string; personaPrompt: string; likes: string; dislikes: string; habits: string; generating: boolean; error: string }
const blank: Gen = { name: '', avatar: 'cat', callMe: '', tones: [], coach: 'accompany', free: '', personaPrompt: '', likes: '', dislikes: '', habits: '', generating: false, error: '' };

export function PersonaEditor({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: NavigatorPreset | null }) {
  const toast = useToast();
  const [g, setG] = useState<Gen>(blank);
  const [crop, setCrop] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setG(editing ? { ...blank, name: editing.name, avatar: editing.avatar ?? 'cat', personaPrompt: editing.personaPrompt, likes: '晒太阳、热可可', dislikes: '下雨、闹钟', habits: '下雨天话变少' } : blank);
  }, [open, editing]);
  const chip = (on: boolean) => cx('p6-press rounded-none border-2 px-3 py-1.5 font-heavy text-meta font-bold', on ? 'border-p3r-lilac/50 bg-p3r-ink text-p3r-rose' : 'border-p3r-lilac/50 bg-p3r-panel');
  const generate = () => {
    if (!g.name.trim()) { setG((s) => ({ ...s, error: '先给它起个名字' })); return; }
    setG((s) => ({ ...s, generating: true, error: '' }));
    setTimeout(() => setG((s) => ({ ...s, generating: false, personaPrompt: `你是「${s.name}」——${s.tones.join('、') || '温柔'}的${s.coach === 'push' ? '督促型' : '陪伴型'}伙伴。${s.callMe ? `你称呼对方为「${s.callMe}」。` : ''}说话简短，偶尔吐槽，但每个约定都会记得。${s.free}` })), 1100);
  };
  const save = () => {
    if (!g.name.trim() || !g.personaPrompt.trim()) { setG((s) => ({ ...s, error: '名字和人格设定都不能为空' })); return; }
    const st = getSettings();
    if (editing) updateSettings({ personas: st.personas.map((p) => (p.id === editing.id ? { ...p, name: g.name, avatar: g.avatar, personaPrompt: g.personaPrompt } : p)) });
    else updateSettings({ personas: [...st.personas, { id: `c${Date.now()}`, name: g.name, avatar: g.avatar, personaPrompt: g.personaPrompt, isBuiltin: false, createdAt: new Date() }] });
    toast.success(editing ? '人格已更新' : '新人格已加入'); onClose();
  };
  return (
    <>
      <P6Sheet open={open} onClose={onClose} title={editing ? '编辑人格' : '新建人格'} en="PERSONA" size="tall"
        footer={<div className="flex gap-3"><P3Button tone="soft" block onClick={onClose}>取消</P3Button><P3Button block onClick={save}>保存</P3Button></div>}>
        <div className="space-y-4 pt-1">
          <CfgInput aria-label="名字" placeholder="名字（如：白手套 / 老班长…）" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <div>
            <div className="mb-1.5 font-heavy text-meta font-bold">头像</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.keys(GLYPH_PATHS).map((k) => (
                <button key={k} type="button" aria-label={`剪影 ${k}`} aria-pressed={g.avatar === k} onClick={() => setG({ ...g, avatar: k })}
                  className={cx('p6-press flex h-12 w-12 items-center justify-center rounded-none border-2', g.avatar === k ? 'border-p3r-lilac/50 bg-p3r-rose text-p3r-on-rose' : 'border-p3r-lilac/30 bg-p3r-panel text-p3r-ink')}><Glyph id={k} size={28} /></button>
              ))}
              {g.avatar.startsWith('data:') && <span className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-p3r-lilac/50 bg-p3r-rose"><Glyph id={g.avatar} size={40} /></span>}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="上传头像图片" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(URL.createObjectURL(f)); e.target.value = ''; }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="h-12 rounded-none border-2 border-dashed border-p3r-lilac/50 px-3 font-heavy text-meta font-bold">上传</button>
            </div>
            <p className="mt-1 text-2xs text-p3r-grey">上传头像只存本机，永不上云。</p>
          </div>
          <CfgInput aria-label="称呼" placeholder="它怎么称呼你？（可空，如：老板 / 小朋友）" value={g.callMe} onChange={(e) => setG({ ...g, callMe: e.target.value })} />
          <div>
            <div className="mb-1.5 font-heavy text-meta font-bold">语气关键词（多选）</div>
            <div className="flex flex-wrap gap-1.5">
              {TONE_WORDS.map((t) => <button key={t} type="button" aria-pressed={g.tones.includes(t)} className={chip(g.tones.includes(t))} onClick={() => setG({ ...g, tones: g.tones.includes(t) ? g.tones.filter((x) => x !== t) : [...g.tones, t] })}>{t}</button>)}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button type="button" className={chip(g.coach === 'accompany')} onClick={() => setG({ ...g, coach: 'accompany' })}>陪伴型</button>
              <button type="button" className={chip(g.coach === 'push')} onClick={() => setG({ ...g, coach: 'push' })}>督促型</button>
            </div>
          </div>
          <CfgTextarea rows={2} aria-label="自由描述" placeholder="自由描述（可空）：口头禅、背景设定、想避免的说话方式…" value={g.free} onChange={(e) => setG({ ...g, free: e.target.value })} />
          <P3Button block tone="ink" busy={g.generating} disabled={g.generating} onClick={generate}>{g.generating ? '生成中…' : g.personaPrompt ? '换一版' : 'AI 生成人格设定'}</P3Button>
          {g.error && <CfgMsg>{g.error}</CfgMsg>}
          {(g.personaPrompt || editing) && (
            <>
              <div>
                <div className="mb-1.5 font-heavy text-meta font-bold">人格设定（保存前可随意修改）</div>
                <CfgTextarea rows={5} aria-label="人格设定" value={g.personaPrompt} onChange={(e) => setG({ ...g, personaPrompt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <div className="text-meta font-bold leading-snug">喜好（它每天的小状态会用到；用「、」隔开，留空的话第一次用到时按人格设定自动写）</div>
                {([['likes', '喜欢', '晒太阳、热可可'], ['dislikes', '讨厌', '下雨、闹钟'], ['habits', '小习惯', '下雨天话变少']] as const).map(([k, label, ph]) => (
                  <label key={k} className="flex min-w-0 items-center gap-2"><span className="w-[3.5em] shrink-0 font-heavy text-meta font-bold">{label}</span>
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
  const edit = params?.get('variant') === 'edit' ? getSettings().personas[3] : null;
  return <PersonaEditor open={open} onClose={onClose} editing={edit} />;
}
