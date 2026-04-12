import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    }
  },
  build: {
    cssCodeSplit: false, // Bundle all CSS into one file
    rollupOptions: {
      input: resolve(__dirname, 'src/sdk/shadow/index.ts'),
      output: {
        entryFileNames: 'sdk/shadow.js',
        assetFileNames: (assetInfo) => {
          // Ensure CSS is extracted to a predictable location
          if (assetInfo.name?.endsWith('.css')) {
            return 'sdk/shadow.css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
        format: 'iife',
        name: 'SportsbookSDK'
      }
    }
  }
});

