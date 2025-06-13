import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ command }) => {
  const isGitHubPages = process.argv.includes('--base=/comfywebv2/');
  
  return {
    base: isGitHubPages ? '/comfywebv2/' : '/',
    plugins: [svelte(), viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});