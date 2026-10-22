import type { SkinId, SkinPack, SlotMap, Tokens } from './_contract';

const tokens: Tokens = {
  color: {
    primary: '#000', secondary: '#111', ink: '#000', paper: '#fff', accent: '#e60012',
    hp: '#e60012', sp: '#00a1e9', weak: '#ff5c00', crit: '#ffd000', resist: '#00b894', shadow: '#000', overlay: '#000',
  },
  font: { display: 'sans', body: 'sans', number: 'sans' },
  stroke: { thin: 1, bold: 2 },
  shape: { slant: 0, radius: 8, panelSkew: 0 },
  motion: { uiOpen: 280, uiClose: 280, press: 40 },
  ease: { enter: 'outCubic', exit: 'outCubic', pop: 'outBack' },
  hud: { commandShape: 'list', commandLayout: 'twoColumn', partyStyle: 'bar' },
};

const slots: SlotMap = {
  'hud.command': {
    rect: [0, 0, 0, 0],
    sets: {},
    list: { rect: [0, 0, 0, 0], title: [0, 0, 0, 0], rowH: 0, desc: [0, 0, 0, 0] },
  },
  'hud.party': { rect: [0, 0, 0, 0], card: { w: 0, h: 0, gap: 0, rot: 0 }, units: [] },
  'hud.order': { rect: [0, 0, 0, 0] },
  'hud.system': { rect: [0, 0, 0, 0], buttons: [] },
  'hud.topInfo': { rect: [0, 0, 0, 0] },
  'hud.enemyOver': { dy: 0 },
  'scene.battle.bg': { asset: '', w: 0, h: 0, cx: 0, cy: 0 },
};

export function makeTestSkinPack(id: SkinId, overrides: Partial<SkinPack> = {}): SkinPack {
  return {
    id,
    manifest: { assets: [], filters: [], fonts: [] },
    tokens,
    slots,
    recipes: [],
    labels: {},
    roster: {
      heroPersona: '',
      companions: [],
      companionPersonas: {},
      excludedPersonas: [],
      showtime: [],
    },
    enemyLayouts: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    compendiumArt: {},
    ...overrides,
  };
}
