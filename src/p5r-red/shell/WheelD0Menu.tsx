/**
 * 轮盘 · 低动效降级（真实 RadialQuickNav.tsx D0 分支）：七瓣改成纵向列表 .oa-wheel-list（样式 legacy/css/a.css）。
 * 低动效（DevCapsule / ?__motion=low / prefers-reduced-motion）时 RadialWheelP5 自动改用它；点选即跳转。
 */
export function WheelD0Menu({ items, left, bottom }: { items: [string, string, string][]; left: number; bottom: number }) {
  return (
    <div className="oa-wheel-list" role="menu" style={{ left, bottom }}>
      {items.map(([id, l, en]) => <button key={id} role="menuitem" data-id={id} className="oa-wl-i"><b>{l}</b><small>{en}</small></button>)}
    </div>
  );
}
