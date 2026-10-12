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
      // 与 vite.config.ts 的 '@' → src 保持一致：vitest 只读本文件，
      // 不配的话任何 import '@/xxx' 的模块在测试里都解析失败
      '@': path.resolve(__dirname, './src'),
      // 非 ASCII 项目路径下 vite 5 相对 id 解析失败——用别名 + 显式 .ts 后缀绕过
      '~velvet-api': path.resolve(__dirname, 'src/services/velvetApi.ts'),
    },
  },
});
