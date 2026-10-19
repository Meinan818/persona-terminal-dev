/** UMBRA 正式命名的静态 Demo 适配；映射与主 App 由测试核对。 */
export const UMBRA_IDENTITY = Object.freeze({ en: 'UMBRA', zh: '幽影协议', full: 'UMBRA（幽影协议）' });
const TARTARUS = Object.freeze({ en: 'TARTARUS', zh: '塔尔塔罗斯', full: 'TARTARUS（塔尔塔罗斯）' });
const MEMENTOS = Object.freeze({ en: 'Mementos', zh: '印象空间', full: 'Mementos（印象空间）' });
const MAYONAKA = Object.freeze({ en: 'Mayonaka TV', zh: '电视世界', full: 'Mayonaka TV（电视世界）' });

export function umbraIdentityForTheme(theme) {
  switch (theme) {
    case 'blue': case 'pink': case 'p3': case 'hamuko': return TARTARUS;
    case 'red': case 'p5': return MEMENTOS;
    case 'yellow': case 'p4': return MAYONAKA;
    default: return UMBRA_IDENTITY;
  }
}

export function currentUmbraIdentity(root = document.documentElement) {
  return umbraIdentityForTheme(root.dataset.skin === 'hamuko' ? 'hamuko' : root.dataset.theme);
}

export function syncUmbraTitle(doc = document) {
  doc.title = 'MASKARIA · ' + currentUmbraIdentity(doc.documentElement).full;
}
