import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfidantStarShiftModal } from '@/components/cooperation/ConfidantStarShiftModal';
import type { Confidant } from '@/types';

/**
 * 星移弹窗 · 频道分流 + 输入屏信息一致性。
 *
 * 本项目 vitest 只收 `src/**\/*.test.ts`（不含 .tsx），所以这里用 createElement 而非 JSX。
 *
 * 覆盖面说明（诚实标注）：
 *   ① 分流：p5 渲染红版（.sf5-sheet）、p3 渲染原版（.sf-sheet）、p4 走原版 —— 实测。
 *   ② 输入屏（默认屏）信息一字不减：两版可见文本逐字比对 —— 实测。
 *   ③ thinking / preview / done / error 四屏需要驱动 hook 状态（依赖 AI 调用与 mock），
 *      本测试**未覆盖**；那四屏的文案对齐靠人工比对源码（见交付报告）。
 */

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
  id: 'c1', userId: 'u1', source: 'offline', name: '阿萨',
  arcanaId: 'death', orientation: 'upright',
  description: '一起看过一次展', aiInterpretation: '缓慢而稳定', aiAdvice: '保持节奏',
  intimacy: 2, intimacyPoints: 0, decayEnabled: false,
  starShiftCharges: 1, buffs: [],
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
    root!.render(createElement(ConfidantStarShiftModal, {
      isOpen: true, confidant, onClose: () => {},
    }));
  });
  return document.body.textContent ?? '';
};

const teardown = () => {
  if (root) act(() => root!.unmount());
  root = null;
  host?.remove();
  document.body.innerHTML = '';
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

afterEach(teardown);

describe('星移弹窗 · 频道分流', () => {
  it('红频道（p5）渲染红黑剪报版', () => {
    renderIn('p5', makeConfidant());
    expect(document.querySelector('.sf5-sheet')).toBeTruthy();
    expect(document.querySelector('.sf-sheet')).toBeFalsy();
  });

  it('p3 渲染原 P3R 版（未把蓝版带跑偏）', () => {
    renderIn('p3', makeConfidant());
    expect(document.querySelector('.sf-sheet')).toBeTruthy();
    expect(document.querySelector('.sf5-sheet')).toBeFalsy();
  });

  it('p4 / neutral 也渲染原版，不是空白', () => {
    for (const ch of ['p4', 'neutral']) {
      teardown();
      renderIn(ch, makeConfidant());
      expect(document.querySelector('.sf-sheet'), `${ch} 应渲染原版`).toBeTruthy();
    }
  });
});

describe('星移弹窗 · 输入屏信息一字不减', () => {
  it('两版可见文本逐字相等（页头 / 标签 / 占位 / 计数 / 按钮）', () => {
    const p5Text = norm(renderIn('p5', makeConfidant()));
    teardown();
    const p3Text = norm(renderIn('p3', makeConfidant()));

    const mustHave = [
      '阿萨 · Lv.2',
      '《死神》 · 星移 · 余 1',
      '你觉得你们的关系发生了什么变化？（可不填）',
      '0 / 300',
      '✧ 重新落墨（消耗 1 次）',
    ];
    for (const t of mustHave) {
      expect(p5Text, `红版缺: ${t}`).toContain(t);
      expect(p3Text, `原版缺: ${t}`).toContain(t);
    }
    // 最强证据：两版可见文本逐字相等（换皮不该增删任何一个字）
    expect(p5Text).toBe(p3Text);
  });

  it('textarea 的占位文案与上限 300 两版一致（属性级断言）', () => {
    renderIn('p5', makeConfidant());
    const p5Area = document.querySelector('.sf5-input') as HTMLTextAreaElement | null;
    expect(p5Area).toBeTruthy();
    expect(p5Area!.maxLength).toBe(300);
    const p5Ph = p5Area!.getAttribute('placeholder') ?? '';
    teardown();

    renderIn('p3', makeConfidant());
    const p3Area = document.querySelector('.sf-input') as HTMLTextAreaElement | null;
    expect(p3Area).toBeTruthy();
    expect(p3Area!.maxLength).toBe(300);
    expect(p3Area!.getAttribute('placeholder')).toBe(p5Ph);
  });

  it('没有次数时两版的主按钮都禁用', () => {
    const noCharge = makeConfidant({ starShiftCharges: 0 });
    renderIn('p5', noCharge);
    const p5Btn = document.querySelector('.sf5-btn.main') as HTMLButtonElement | null;
    expect(p5Btn?.disabled).toBe(true);
    teardown();

    renderIn('p3', noCharge);
    const p3Btn = document.querySelector('.sf-btn.main') as HTMLButtonElement | null;
    expect(p3Btn?.disabled).toBe(true);
  });
});
