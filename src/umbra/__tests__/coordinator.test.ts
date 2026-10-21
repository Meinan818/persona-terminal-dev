import { describe, expect, it } from 'vitest';
import { UmbraCoordinator } from '@/umbra/coordinator';

describe('UMBRA coordinator', () => {
  it('倍速会缩放演出时长', () => {
    const coordinator = new UmbraCoordinator({ speed: 2 });
    coordinator.startMain({ id: 'onemore', name: 'onemore', durationMs: 450, track: 'main' }, 0);
    expect(coordinator.director.mainEvent?.durationMs).toBe(225);
  });

  it('主线结束后释放输入缓冲并接 env:change', () => {
    const coordinator = new UmbraCoordinator();
    coordinator.pushInput('a', { target: 'a' });
    coordinator.startMain({ id: 'action', name: 'action', durationMs: 100, track: 'main' }, 0);
    coordinator.queueEnv({ id: 'env', name: 'env:change', durationMs: 60, track: 'main' });
    const tick = coordinator.tick(120);
    expect(tick.clearedMain).toBe(true);
    expect(tick.startedEnv).toBe(true);
    expect(coordinator.director.mainEvent?.id).toBe('env');
  });

  it('画质采样会推进自动降档状态', () => {
    const coordinator = new UmbraCoordinator({ initialQuality: 'high' });
    coordinator.sampleQuality([{ frameMs: 21 }, { frameMs: 22 }]);
    coordinator.sampleQuality([{ frameMs: 21 }, { frameMs: 22 }]);
    expect(coordinator.quality.tier).toBe('mid');
  });
});
