import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateReleaseUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
      || host === 'localhost' || host.endsWith('.localhost') || /^127\./.test(host)
      || ['0.0.0.0', '[::]', '[::1]'].includes(host)) {
    throw new Error('正式包必须使用手机可访问的后端地址，不能使用本机地址或带凭据的地址');
  }
  return url.href.replace(/\/+$/, '');
}

export function verifyReleaseAssets(scripts, apiUrl) {
  const expected = validateReleaseUrl(apiUrl);
  if (!scripts.some(source => source.includes(JSON.stringify(expected)))) {
    throw new Error('构建产物未包含预期的正式后端地址');
  }
  if (scripts.some(source => /https?:\/\/(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\])(?=[:/"'`\s])/i.test(source))) {
    throw new Error('构建产物仍含本机后端地址，禁止生成正式安装包');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [apiUrl, outputDir] = process.argv.slice(2);
  validateReleaseUrl(apiUrl);
  if (outputDir) {
    const assets = join(outputDir, 'assets');
    verifyReleaseAssets(readdirSync(assets).filter(name => name.endsWith('.js'))
      .map(name => readFileSync(join(assets, name), 'utf8')), apiUrl);
    console.log('正式产物后端地址校验通过');
  }
}
