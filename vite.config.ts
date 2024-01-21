import path from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/fp/**'],
      reporter: ['text', ['html', { subdir: 'html' }]],
      exclude: [
        'src/fp/index.ts', // no real logic here
        'src/fp/schema.ts', // no real logic here
        'src/fp/config.ts', // no real logic here
        'src/fp/**/*.fixture.ts', // test fixtures
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
