import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfidantCelebrateScreen } from '@/components/cooperation/ConfidantCelebrateScreen';
import type { Confidant } from '@/types';

/**
 * 恭喜整页 · 频道分流 + 信息一致性。
 *
 * 本项目 vitest 只收 `src/**\/*.test.ts`（不含 .tsx），所以这里用 createElement 而非 JSX。
 *
 * 两条断言：
 *   ① 分流：p5 渲染红版（.cl5-root）、p4 渲染 P4 版（shadow root 内 .page2.on）——
 *      而不是只测 confidantLiveryFor 那个纯函数（纯函数单测在 confidantLivery.test.ts）。
 *   ② 信息一字不减：把两版渲染出来的文本各自归一化后比对 —— 这是「换皮不丢信息」的
 *      程序化证据。⚠ 只覆盖静态文本；外观/动画未在此验证（需人工目视）。
 */

// jsdom 没有 matchMedia，kit.tsx 的 useBoldness 会读它
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }) as unknown as typeof window.matchMedia;
  }
});

const makeConfidant = (over: Partial<Confidant> = {}): Confidant => ({
  id: 'c1', userId: 'u1', source: 'offline', name: '阿岚',
  arcanaId: 'sun', orientation: 'upright',
  description: '', aiInterpretation: '', aiAdvice: '',
  intimacy: 5, intimacyPoints: 0, decayEnabled: false,
  starShiftCharges: 1,
  buffs: [{
    id: 'b1', kind: 'attribute', attribute: 'charm', value: 1, unlockAtLevel: 5,
    title: '太阳的指引', description: '每天首次为「灵巧」加点时额外 +1',
  }],
  createdAt: new Date(0),
  ...over,
} as unknown as Confidant);

let host: HTMLDivElement;
let root: Root | null = null;

const renderIn = (channel: string, confidant: Confidant) => {
  document.documentElement.setAttribute('data-ui-channel', channel);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(createElement(ConfidantCelebrateScreen, {
      confidant, onClose: () => {}, onUseStarShift: () => {},
    }));
  });
  const p4Host = document.querySelector('#p4-cinema-host') as HTMLDivElement | null;
  return `${document.body.textContent ?? ''} ${p4Host?.shadowRoot?.textContent ?? ''}`;
};

const teardown = () => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  document.body.innerHTML = '';
};

/** 去掉空白差异，只留可见文字序列（用于两版比对） */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

afterEach(teardown);

describe('恭喜整页 · 频道分流', () => {
  it('红频道（p5）渲染红黑剪报版', () => {
    renderIn('p5', makeConfidant());
    expect(document.querySelector('.cl5-root')).toBeTruthy();
    expect(document.querySelector('.cl-root')).toBeFalsy();
  });

  it('p3 渲染原 P3R 版（未把蓝版带跑偏）', () => {
    renderIn('p3', makeConfidant());
    expect(document.querySelector('.cl-root')).toBeTruthy();
    expect(document.querySelector('.cl5-root')).toBeFalsy();
  });

  it('p4 渲染 P4 电视节目版；neutral 仍渲染原版', () => {
    renderIn('p4', makeConfidant());
    const p4Host = document.querySelector('#p4-cinema-host') as HTMLDivElement | null;
    expect(p4Host?.shadowRoot?.querySelector('.page2.on')).toBeTruthy();
    expect(document.querySelector('.cl-root')).toBeFalsy();
    teardown();

    renderIn('neutral', makeConfidant());
    expect(document.querySelector('.cl-root')).toBeTruthy();
  });
});

describe('恭喜整页 · P4 关键信息', () => {
  it('P4 版保留等级 / 称谓 / 解锁能力 / 星移机会 / 两个按钮', () => {
    const text = norm(renderIn('p4', makeConfidant()));
    for (const t of [
      'CALL SHEET',
      '亲密度升级',
      '《太阳》· 挚友',
      '亲密度到达 RANK 5 · 本期节目通关',
      '太阳的指引',
      '获得一次星移机会（余 1）',
      '稍后再说',
      '✦ 使用星移',
    ]) {
      expect(text, `P4 版缺: ${t}`).toContain(t);
    }
  });
});

describe('恭喜整页 · 两版信息一字不减', () => {
  it('八块信息的关键文本两版一致', () => {
    const p5Text = norm(renderIn('p5', makeConfidant()));
    teardown();
    const p3Text = norm(renderIn('p3', makeConfidant()));

    const mustHave = [
      'RANK 5',
      '《太阳》· 挚友',
      '亲密度到达 RANK 5',
      '新解锁的能力',
      '太阳的指引',
      '每天首次为「灵巧」加点时额外 +1',
      '✧ 获得一次星移机会（余 1）',
      '稍后再说',
      '✧ 使用星移',
    ];
    for (const t of mustHave) {
      expect(p5Text, `红版缺: ${t}`).toContain(t);
      expect(p3Text, `原版缺: ${t}`).toContain(t);
    }
    // 最强证据：两版可见文本**逐字相等**（换皮不该增删任何一个字）
    expect(p5Text).toBe(p3Text);
  });

  it('没有星移次数时，两版都只给单键「欣然接受」', () => {
    const noCharge = makeConfidant({ starShiftCharges: 0 });
    const p5Text = norm(renderIn('p5', noCharge));
    teardown();
    const p3Text = norm(renderIn('p3', noCharge));

    for (const t of ['欣然接受', '亲密度到达 RANK 5', '余 0']) {
      expect(p5Text, `红版缺: ${t}`).toContain(t);
      expect(p3Text, `原版缺: ${t}`).toContain(t);
    }
    expect(p5Text).not.toContain('使用星移');
    expect(p3Text).not.toContain('使用星移');
  });

  it('没有新解锁能力时，两版都不渲染「新解锁的能力」块', () => {
    const noBuff = makeConfidant({ buffs: [] });
    const p5Text = norm(renderIn('p5', noBuff));
    teardown();
    const p3Text = norm(renderIn('p3', noBuff));
    expect(p5Text).not.toContain('新解锁的能力');
    expect(p3Text).not.toContain('新解锁的能力');
    // 但核心信息仍在
    for (const t of ['RANK 5', '亲密度到达 RANK 5']) {
      expect(p5Text).toContain(t);
      expect(p3Text).toContain(t);
    }
  });
});
