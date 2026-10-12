import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    env: { VITE_API_URL: 'http://localhost:8080' },
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // 非 ASCII 项目路径下 vite 5 相对 id 解析失败——用别名 + 显式 .ts 后缀绕过
      '~velvet-api': path.resolve(__dirname, 'src/services/velvetApi.ts'),
    },
  },
});
