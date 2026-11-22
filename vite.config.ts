import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the static build works on GitHub Pages / any sub-path.
  base: './',
  // Phaser alone is ~1.2 MB minified; that's expected for a game bundle.
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
