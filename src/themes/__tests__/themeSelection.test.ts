import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/db', () => ({ db: { users: { update: h.update } } }));
vi.mock('@/utils/widgetSnapshot', () => ({ pushWidgetSnapshot: vi.fn().mockResolvedValue(undefined) }));
import { useAppStore } from '@/store';
import { applyUiChannel } from '@/ui/channel';
import { getSelectedTheme, selectAppTheme, subscribeSelectedTheme } from '../themeSelection';

beforeEach(() => {
  vi.clearAllMocks(); h.update.mockResolvedValue(1);
  useAppStore.setState({ user: { id: 'theme-fixture', name: '主题验证', theme: 'blue', createdAt: new Date() } });
  applyUiChannel('blue');
});

describe('真实主题选择入口', () => {
  it('点击目标主题先更新原用户记录，再改变内存和显示频道', async () => {
    await selectAppTheme('yellow');
    expect(h.update).toHaveBeenCalledWith('theme-fixture', { theme: 'yellow' });
    expect(getSelectedTheme()).toBe('yellow');
    expect(document.documentElement.dataset.uiChannel).toBe('p4');
  });
  it('数据库写入失败时保留原主题并向入口返回错误', async () => {
    h.update.mockRejectedValueOnce(new Error('synthetic theme write failure'));
    await expect(selectAppTheme('red')).rejects.toThrow('synthetic theme write failure');
    expect(getSelectedTheme()).toBe('blue');
    expect(document.documentElement.dataset.uiChannel).toBe('p3');
  });
  it('选择已经生效的主题不重复写库', async () => {
    await selectAppTheme('blue');
    expect(h.update).not.toHaveBeenCalled();
  });
  it('未知主题和未加载档案不假报切换成功', async () => {
    await expect(selectAppTheme('unknown')).rejects.toThrow('无效的主题');
    useAppStore.setState({ user: null });
    await expect(selectAppTheme('pink')).rejects.toThrow('尚未载入用户档案');
    expect(h.update).not.toHaveBeenCalled();
  });
  it('自定义主题使用已有neutral频道，仍能从真实设置返回', async () => {
    await selectAppTheme('custom');
    expect(document.documentElement.dataset.uiChannel).toBeUndefined();
    await selectAppTheme('blue');
    expect(getSelectedTheme()).toBe('blue');
  });
  it('主题订阅忽略其它用户字段，卸载后不再通知', () => {
    const notify = vi.fn(), stop = subscribeSelectedTheme(notify);
    const user = useAppStore.getState().user!;
    useAppStore.setState({ user: { ...user, name: '更名' } });
    expect(notify).not.toHaveBeenCalled();
    useAppStore.setState({ user: { ...user, theme: 'pink' } });
    expect(notify).toHaveBeenCalledTimes(1);
    stop(); useAppStore.setState({ user });
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
