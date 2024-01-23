import path from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', ['html', { subdir: 'html' }]],
      exclude: [
        'src/index.ts', // no real logic here
        'src/schema.ts', // no real logic here
        'src/config.ts', // no real logic here
        'src/**/*.fixture.ts', // test fixtures
        'src/test/testUtils.ts', // test fixtures
      ],
    },
  },
  build: {
    minify: false,
    sourcemap: true,
    copyPublicDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'passlock',
      formats: ['es', 'cjs', 'umd', 'iife'],
      fileName: format => `index.${format}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
})
