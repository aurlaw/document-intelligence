import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    cloudflare({ configPath: "../worker/wrangler.jsonc" }),
    vue(),
  ],
});
