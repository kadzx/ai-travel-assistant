import { defineConfig } from "vite";
import uniPlugin from "@dcloudio/vite-plugin-uni";
// @ts-ignore
const uni = uniPlugin.default || uniPlugin;

import UnoCSS from 'unocss/vite';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
