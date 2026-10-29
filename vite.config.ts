import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content and background scripts are classic/service-worker entries, so they are
// emitted as self-contained files with stable names referenced by manifest.json.
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    base: './',
    plugins: [
      react(),
      {
        name: 'self-contained-content-scripts',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
          const isolated = new Set(['content', 'networkHook', 'networkBridge']);
          for (const chunk of Object.values(bundle)) {
            if (chunk.type !== 'chunk' || !isolated.has(chunk.name)) {
              continue;
            }
            const imports = [...chunk.imports, ...chunk.dynamicImports];
            if (imports.length > 0) {
              this.error(`${chunk.fileName} must stay self-contained, but imports ${imports.join(', ')}.`);
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: isDev,
      minify: !isDev,
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: fileURLToPath(new URL('./popup.html', import.meta.url)),
          dashboard: fileURLToPath(new URL('./dashboard.html', import.meta.url)),
          background: fileURLToPath(new URL('./src/background/index.ts', import.meta.url)),
          content: fileURLToPath(new URL('./src/content/index.ts', import.meta.url)),
          networkHook: fileURLToPath(new URL('./src/content/networkHook.ts', import.meta.url)),
          networkBridge: fileURLToPath(new URL('./src/content/networkBridge.ts', import.meta.url)),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/chunk-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
