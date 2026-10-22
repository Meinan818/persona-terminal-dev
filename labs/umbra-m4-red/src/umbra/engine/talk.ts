// 交涉 DOM 模板（§4.3）：白名单校验 + data-slot 填充（只用 textContent/属性赋值）+ 引擎绑定事件。校验不过用默认模板。
import type { TalkTemplate } from '../skins/_contract';

const TAGS = new Set(['SECTION', 'DIV', 'SPAN', 'P', 'UL', 'OL', 'LI', 'BUTTON', 'IMG', 'INPUT', 'TEXTAREA', 'HEADER', 'FOOTER', 'STRONG', 'EM', 'BR']);
export const DEFAULT_TALK: TalkTemplate = {
  html: '<section class="talk"><header class="talk-head"><span class="talk-name" data-slot="enemyName"></span><span class="talk-odds" data-slot="odds"></span></header><p class="talk-line" data-slot="line"></p><ul class="talk-choices" data-slot="choices"><li><button class="talk-choice" data-slot="choice"><span data-slot="choiceText"></span></button></li></ul><span class="talk-status" data-slot="status"></span></section>',
  params: { typingCps: 40 },
};
export function checkTemplate(t: TalkTemplate): string[] {
  const errs: string[] = [];
  const doc = new DOMParser().parseFromString(`<body>${t.html}</body>`, 'text/html');
  doc.body.querySelectorAll('*').forEach((el) => {
    if (!TAGS.has(el.tagName)) errs.push(`标签 <${el.tagName.toLowerCase()}> 不在白名单`);
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) errs.push(`内联事件 ${a.name}`);
      if (['src', 'href', 'srcset'].includes(a.name)) errs.push(`属性 ${a.name}`);
      if (a.name === 'style' && /url\(/i.test(a.value)) errs.push('style 内 url()');
    }
  });
  for (const s of ['line', 'choices', 'choice']) if (!doc.body.querySelector(`[data-slot="${s}"]`)) errs.push(`缺少 data-slot=${s}`);
  return errs;
}
export interface TalkView { root: HTMLElement; setLine(s: string): Promise<void>; setChoices(c: string[], on: (i: number) => void): void; setStatus(s: string): void; destroy(): void }
export function mountTalk(host: HTMLElement, skinId: string, tpl: TalkTemplate | undefined, data: { enemyName: string; odds: string; portrait?: string }): TalkView {
  const use = tpl && checkTemplate(tpl).length === 0 ? tpl : DEFAULT_TALK;
  const wrap = document.createElement('div'); wrap.className = `umbra-skin-${skinId}`;
  const doc = new DOMParser().parseFromString(`<body>${use.html}</body>`, 'text/html');
  wrap.append(...Array.from(doc.body.childNodes).map((n) => document.importNode(n, true)));
  host.appendChild(wrap);
  const $ = (s: string) => wrap.querySelector(`[data-slot="${s}"]`) as HTMLElement | null;
  $('enemyName') && ($('enemyName')!.textContent = data.enemyName);
  $('odds') && ($('odds')!.textContent = data.odds);
  const img = $('enemyPortrait') as HTMLImageElement | null; if (img && data.portrait) img.setAttribute('src', data.portrait);
  const choices = $('choices')!; const proto = choices.firstElementChild!.cloneNode(true) as HTMLElement; choices.innerHTML = '';
  const cps = use.params?.typingCps ?? 40;
  let timer = 0;
  return {
    root: wrap,
    setLine(s) { const el = $('line')!; el.textContent = ''; let i = 0; clearInterval(timer); return new Promise((r) => { timer = window.setInterval(() => { el.textContent = s.slice(0, ++i); if (i >= s.length) { clearInterval(timer); r(); } }, 1000 / cps); }); },
    setChoices(list, on) {
      choices.innerHTML = '';
      list.slice(0, 4).forEach((c, i) => {   // v1.2：选项上限 4
        const n = proto.cloneNode(true) as HTMLElement; const tx = n.querySelector('[data-slot="choiceText"]') ?? n.querySelector('[data-slot="choice"]');
        if (tx) tx.textContent = c;
        const btn = (n.matches('[data-slot="choice"]') ? n : n.querySelector('[data-slot="choice"]')) as HTMLElement;
        btn.addEventListener('click', () => on(i), { once: true });
        choices.appendChild(n);
      });
    },
    setStatus(s) { const el = $('status'); if (el) el.textContent = s; },
    destroy() { clearInterval(timer); wrap.remove(); },
  };
}
