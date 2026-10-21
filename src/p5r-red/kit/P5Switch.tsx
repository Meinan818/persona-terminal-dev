/** 开关（迁移自 overlays/b.css .ob-sw：灰斜槽 → 红槽，墨块 → 白块 translateX 23px，--over 回弹）。 */
export function P5Switch({ on, onChange, locked, label }: { on: boolean; onChange?: (v: boolean) => void; locked?: boolean; label?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`ob-sw${on ? ' on' : ''}`} data-locked={locked ? '' : undefined} onClick={() => !locked && onChange?.(!on)}><i /></button>;
}
