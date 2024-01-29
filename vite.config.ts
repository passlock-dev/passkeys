import { defineConfig } from 'vitest/config'

export default defineConfig({
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
  server: {
    port: 5174
  }
})
