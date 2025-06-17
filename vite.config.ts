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
    },
    server: {
      // Enable CORS for development
      cors: true,
      // Configure for local API development  
      host: true,
      port: 5173
    },
    // Enable Node.js modules compatibility
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['@types/node']
    }
  };
});