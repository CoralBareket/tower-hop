import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the static build works on GitHub Pages / any sub-path.
  base: './',
  // Phaser alone is ~1.2 MB minified; that's expected for a game bundle.
  build: {
    chunkSizeWarningLimit: 1500,
    // Transpile down for older phones (iOS 14 Safari, ~2020 Android Chrome) instead of
    // shipping syntax they can't parse — which would otherwise show up as a black screen.
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
  // In dev, the API runs separately on :3000; proxying keeps everything same-origin (cookies just work).
  server: { proxy: { '/api': 'http://localhost:3000' } },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
