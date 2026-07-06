import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Production build for the standalone iframe embed page (`iframe.html`). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const assetsUrl = env.VITE_SPORTSBOOK_ASSETS_URL?.replace(/\/$/, "");
  const base = assetsUrl ? `${assetsUrl}/` : "/";

  return {
    base,
    plugins: [preact()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        react: "preact/compat",
        "react-dom": "preact/compat",
        "react/jsx-runtime": "preact/jsx-runtime",
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: false,
      cssCodeSplit: false,
      rollupOptions: {
        input: resolve(__dirname, "iframe.html"),
        output: {
          entryFileNames: "iframe-[hash].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "iframe-[hash][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
  };
});
