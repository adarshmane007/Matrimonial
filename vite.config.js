import { defineConfig } from 'vite';

/** CloudFront/S3 deploy serves from /latest/ (see deploy.yml). */
export default defineConfig({
  base: '/latest/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
