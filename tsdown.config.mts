import { defineConfig } from 'tsdown';

const shared = {
  entry: ['src/index.ts', 'src/run.ts'],
  target: 'node22',
  dts: true,
  sourcemap: true,
  clean: true,
};

export default defineConfig([
  { ...shared, format: 'cjs', outDir: 'dist/cjs' },
  { ...shared, format: 'esm', outDir: 'dist/esm', shims: true },
]);
