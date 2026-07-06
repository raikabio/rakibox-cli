import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  bundle: true,
  outDir: 'dist',
  platform: 'node',
  target: 'node20',
  external: ['commander', 'firebase', 'firebase/app', 'firebase/firestore', '@aws-sdk/client-s3', 'mime-types', 'picocolors'],
});