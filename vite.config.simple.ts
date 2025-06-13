import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "/comfywebv2/",
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});