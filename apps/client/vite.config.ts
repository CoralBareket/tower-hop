import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the static build works on GitHub Pages / any sub-path.
  base: './',
  // Phaser alone is ~1.2 MB minified; that's expected for a game bundle.
  build: { chunkSizeWarningLimit: 1500 },
  // In dev, the API runs separately on :3000; proxying keeps everything same-origin (cookies just work).
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
