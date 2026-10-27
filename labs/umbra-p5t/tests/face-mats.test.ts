// r19：面具眼洞眼白——虹膜网格 Obj_Eye*UV 的 _E00 材质一律不透明（Joker GLB 里被 FBX2glTF 误标 BLEND，眼白被丢弃）
import { describe, it, expect } from 'vitest';
import { irisOpaque, hiddenMesh } from '../src/view/p5tChar';
describe('p5t face materials', () => {
  it('iris on Eye*UV meshes is opaque (sclera from E000 RGB)', () => {
    expect(irisOpaque('Obj_Eye100UV', 'High_MI_PC0001_E00')).toBe(true);
    expect(irisOpaque('Obj_Eye12UV', 'High_MI_PC0004_E12')).toBe(true);
    expect(irisOpaque('Obj_Eye00UV', 'MI_PC0011_E00')).toBe(true);
  });
  it('eyelid / lash / atlas materials keep their own alpha mode', () => {
    expect(irisOpaque('Obj_Eyelid00', 'High_MI_PC0003_E50')).toBe(false);
    expect(irisOpaque('Obj_Eye100', 'High_MI_PC0001_E00_Fa')).toBe(false);
  });
  it('mask mesh (MeshBake M00) is not hidden; Kamen outline is', () => {
    expect(hiddenMesh('MeshBake_PC0001_151_Obj_mesh', 'High_MI_PC0001_M00')).toBe(false);
    expect(hiddenMesh('Obj_Kamen151', 'High_MI_PC0002_M00')).toBe(false);
    expect(hiddenMesh('Obj_Kamen_Outline', 'DefaultMaterial')).toBe(true);
  });
});
