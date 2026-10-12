/**
 * iconAssets —— 图标资产验证。
 *
 * 覆盖 Wave 1 的产物契约（真实解码 PNG，不 mock）：
 *   1. public/theme-icons/{color}.png 五个主题齐备
 *   2. 圆角方形「外部」透明
 *   3. 圆角方形「内部」不得被误清 —— 中心区零透明（这是本文件的核心断言）
 *   4. Android mipmap 主题变体齐备（5 密度 × 5 色 × 3 形态）
 *   5. 默认（蓝）图标同样满足外部透明 + 内部完好
 *
 * 为什么核心断言是「中心区零透明」：源素材里卡片内部的黑色设计元素
 * （城市剪影、电视机、泼墨三角）在部分图上**紧贴卡片边缘且与外部黑底同为纯黑**，
 * 只按「黑」做连通域清除会顺着接触点渗进卡片内部，把图内的黑也清掉。
 * 「外部是否透明」抓不住这个缺陷——必须正断言「内部仍有内容」。
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(__dirname, '../../..');
const COLORS = ['blue', 'yellow', 'red', 'pink', 'custom'] as const;
const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'] as const;

interface Decoded {
  width: number;
  height: number;
  channels: number;
  at: (x: number, y: number) => [number, number, number, number];
}

/** 最小 PNG 解码器：仅支持 8bit RGB/RGBA 非隔行（本仓图标均为此格式）。 */
function decodePng(file: string): Decoded {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`not png: ${file}`);
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (colorType !== 6 && colorType !== 2) throw new Error(`unsupported colorType ${colorType}: ${file}`);
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);
  let p = 0;
  const paeth = (a: number, b: number, c: number) => {
    const pp = a + b - c;
    const pa = Math.abs(pp - a);
    const pb = Math.abs(pp - b);
    const pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const ft = raw[p++];
    for (let x = 0; x < stride; x++) {
      const rv = raw[p++];
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
      let v: number;
      if (ft === 0) v = rv;
      else if (ft === 1) v = rv + a;
      else if (ft === 2) v = rv + b;
      else if (ft === 3) v = rv + ((a + b) >> 1);
      else v = rv + paeth(a, b, c);
      px[y * stride + x] = v & 0xff;
    }
  }
  return {
    width,
    height,
    channels,
    at: (x, y) => {
      const i = (y * width + x) * channels;
      return [px[i], px[i + 1], px[i + 2], channels === 4 ? px[i + 3] : 255];
    },
  };
}

function transparentRatio(img: Decoded): number {
  let transparent = 0;
  let total = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      total++;
      if (img.at(x, y)[3] < 16) transparent++;
    }
  }
  return transparent / total;
}

/** 中心区（默认取 30%~70% 内框）被清透的比例——必须为 0。 */
function innerLeakRatio(img: Decoded, marginPct = 0.3): number {
  const x0 = Math.round(img.width * marginPct);
  const x1 = Math.round(img.width * (1 - marginPct));
  const y0 = Math.round(img.height * marginPct);
  const y1 = Math.round(img.height * (1 - marginPct));
  let leak = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      total++;
      if (img.at(x, y)[3] < 128) leak++;
    }
  }
  return total ? leak / total : 0;
}

function assertExternalTransparentInternalIntact(label: string, file: string, minTransparent = 0.1) {
  expect(fs.existsSync(file), `缺少 ${label}`).toBe(true);
  const img = decodePng(file);
  expect(img.channels, `${label} 应为 RGBA`).toBe(4);
  // 四角必须完全透明（原始素材此处是不透明黑）
  for (const [cx, cy] of [
    [0, 0],
    [img.width - 1, 0],
    [0, img.height - 1],
    [img.width - 1, img.height - 1],
  ] as const) {
    expect(img.at(cx, cy)[3], `${label} 角(${cx},${cy}) 应透明`).toBe(0);
  }
  expect(transparentRatio(img), `${label} 外部透明区过小`).toBeGreaterThan(minTransparent);
  // 核心：中心区不得有任何透明像素（图内的黑必须保留）
  expect(innerLeakRatio(img), `${label} 中心区被误清透`).toBe(0);
}

describe('MASKARIA 图标资产', () => {
  it('五个主题图标：外部透明 + 内部完好', () => {
    for (const color of COLORS) {
      assertExternalTransparentInternalIntact(
        `theme-icons/${color}.png`,
        path.join(ROOT, 'public', 'theme-icons', `${color}.png`),
      );
    }
  });

  it('Android mipmap 主题变体齐备（5 密度 × 5 色 × 3 形态）', () => {
    for (const d of DENSITIES) {
      for (const color of COLORS) {
        for (const form of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
          const file = path.join(ROOT, 'android/app/src/main/res', `mipmap-${d}`, `${form}_${color}.png`);
          expect(fs.existsSync(file), `缺少 mipmap-${d}/${form}_${color}.png`).toBe(true);
          expect(decodePng(file).channels, `${form}_${color} 应为 RGBA`).toBe(4);
        }
      }
    }
  });

  it('默认（蓝）主题图标：外部透明 + 内部完好', () => {
    for (const f of ['icon.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png']) {
      assertExternalTransparentInternalIntact(`public/${f}`, path.join(ROOT, 'public', f));
    }
  });
});
