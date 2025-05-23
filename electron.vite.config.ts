import { defineConfig } from 'electron-vite';
import { defineConfig as defineViteConfig } from 'vite';
import { resolve } from 'path';
import { checker } from 'vite-plugin-checker';
import viteCp from 'vite-plugin-cp';
import viteZipPack from 'unplugin-zip-pack/vite';
import PluginManifest from './manifest.json';

const SRC_DIR = resolve(__dirname, './src');
const OUTPUT_DIR = resolve(__dirname, './dist');

const BaseConfig = defineViteConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@': SRC_DIR,
    },
  },
});

const ConfigBuilder = (type: 'main' | 'preload') =>
  defineViteConfig({
    ...BaseConfig,

    plugins: [
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint --fix',
        },
      }),
    ],
    build: {
      minify: true,
      outDir: resolve(OUTPUT_DIR, `./${type}`),
      lib: {
        entry: resolve(SRC_DIR, `./${type}/index.ts`),
        formats: ['cjs'],
        fileName: () => 'index.js',
      },
    },
  });

export default defineConfig({
  main: ConfigBuilder('main'),
  preload: ConfigBuilder('preload'),
  renderer: defineViteConfig({
    ...BaseConfig,

    plugins: [
      checker({
        typescript: true,
        eslint: {
          lintCommand: 'eslint --fix',
        },
      }),
      viteCp({
        targets: [
          { src: './manifest.json', dest: 'dist' },
          { src: './src/public', dest: 'dist/public' },
          { src: './src/renderer/views', dest: 'dist/renderer/views' },
        ],
      }),
      viteZipPack({
        in: OUTPUT_DIR,
        out: resolve(__dirname, `./${PluginManifest.repository.release.file}`),
      }),
    ],
    build: {
      minify: 'esbuild',
      outDir: resolve(OUTPUT_DIR, './renderer'),
      lib: {
        entry: resolve(SRC_DIR, './renderer/index.ts'),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        input: resolve(SRC_DIR, './renderer/index.ts'),
      },
    },
  }),
});
