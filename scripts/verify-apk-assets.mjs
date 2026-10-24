// Compare APK assets/public against a local dist directory by SHA-256.
// Usage: node scripts/verify-apk-assets.mjs <apk> <distDir>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

const apk = process.argv[2];
const dist = process.argv[3];
if (!apk || !dist) throw new Error('usage: node scripts/verify-apk-assets.mjs <apk> <distDir>');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

// Read the whole APK once so a multi-MB entry is never split by a stream boundary.
const apkHashes = new Map();
{
  const buf = readFileSync(apk);
  const eocd = buf.lastIndexOf(Buffer.from('PK\x05\x06'));
  if (eocd < 0) throw new Error('not a zip/apk file');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < total && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (!name.startsWith('assets/public/')) continue;
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? raw : inflateRawSync(raw);
    apkHashes.set(name, sha256(data));
  }
}
if (apkHashes.size === 0) throw new Error('no assets/public entries parsed; aborting rather than reporting a false pass');

const localFiles = walk(dist);
let missing = 0;
let differing = 0;
let checked = 0;
for (const file of localFiles) {
  const key = `assets/public/${relative(dist, file).replace(/\\/g, '/')}`;
  if (!apkHashes.has(key)) { missing++; if (missing <= 5) console.error(`missing: ${key}`); continue; }
  checked++;
  if (sha256(readFileSync(file)) !== apkHashes.get(key)) { differing++; if (differing <= 5) console.error(`differs: ${key}`); }
}
const localKeys = new Set(localFiles.map((file) => `assets/public/${relative(dist, file).replace(/\\/g, '/')}`));
const extra = [...apkHashes.keys()].filter((key) => !localKeys.has(key));
console.log(JSON.stringify({ apkEntries: apkHashes.size, localFiles: localFiles.length, checked, missing, differing, extra: extra.length, extraSample: extra.slice(0, 5) }, null, 2));
if (missing || differing) process.exitCode = 1;
