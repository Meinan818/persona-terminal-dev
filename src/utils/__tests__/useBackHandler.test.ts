import { afterEach, describe, expect, it, vi } from 'vitest';
import { backInAppHistory, hasInAppHistory } from '../useBackHandler';

describe('application history back', () => {
  afterEach(() => {
    window.history.replaceState(null, '');
    vi.restoreAllMocks();
  });

  it('does not leave the app when the current route is the launch root', () => {
    window.history.replaceState({ idx: 0 }, '');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    expect(hasInAppHistory()).toBe(false);
    expect(backInAppHistory()).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it('goes back one real in-app route before hierarchical fallback', () => {
    window.history.replaceState({ idx: 2 }, '');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    expect(hasInAppHistory()).toBe(true);
    expect(backInAppHistory()).toBe(true);
    expect(back).toHaveBeenCalledOnce();
  });
});
