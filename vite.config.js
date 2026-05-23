import { defineConfig } from 'vite';

/** S3 static website hosting serves from the bucket root. */
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
