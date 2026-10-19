/** UMBRA 的正式命名；只负责显示，不参与路由、存档或玩法。 */
export const UMBRA_IDENTITY = Object.freeze({ en: 'UMBRA', zh: '幽影协议', full: 'UMBRA（幽影协议）' });
const TARTARUS = Object.freeze({ en: 'TARTARUS', zh: '塔尔塔罗斯', full: 'TARTARUS（塔尔塔罗斯）' });
const MEMENTOS = Object.freeze({ en: 'Mementos', zh: '印象空间', full: 'Mementos（印象空间）' });
const MAYONAKA = Object.freeze({ en: 'Mayonaka TV', zh: '电视世界', full: 'Mayonaka TV（电视世界）' });

export function umbraIdentityForTheme(theme?: string | null) {
  switch (theme) {
    case 'blue': case 'pink': case 'p3': case 'hamuko': return TARTARUS;
    case 'red': case 'p5': return MEMENTOS;
    case 'yellow': case 'p4': return MAYONAKA;
    default: return UMBRA_IDENTITY;
  }
}
