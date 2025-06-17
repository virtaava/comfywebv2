import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";
import { appDataStorage } from './src/lib/appdata-storage.js';

export default defineConfig(({ command }) => {
  const isGitHubPages = process.argv.includes('--base=/comfywebv2/');
  
  return {
    base: isGitHubPages ? '/comfywebv2/' : '/',
    plugins: [
      svelte(), 
      viteSingleFile({ removeViteModuleLoader: true }),
      // AppData Storage API Plugin
      {
        name: 'appdata-storage',
        configureServer(server) {
          // Initialize storage during server setup
          appDataStorage.initialize().then(() => {
            console.log('✅ AppData storage initialized in vite middleware');
          }).catch((err) => {
            console.error('❌ Failed to initialize AppData storage:', err);
          });

          server.middlewares.use('/api/storage', async (req, res, next) => {
            try {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const pathname = url.pathname;

              // Set CORS headers
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              console.log(`🔧 AppData API: ${req.method} ${pathname}`);

              // Workflow endpoints
              if (pathname === '/workflows') {
                if (req.method === 'GET') {
                  console.log('📖 Loading workflows from AppData...');
                  const workflowArray = await appDataStorage.loadWorkflows();
                  
                  // Convert array to Record<string, object> format expected by frontend
                  const workflows = {};
                  for (const workflow of workflowArray) {
                    if (workflow && workflow.id) {
                      workflows[workflow.id] = workflow;
                    }
                  }
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(workflows)); // Return direct Record format
                  console.log(`✅ Loaded ${Object.keys(workflows).length} workflows in Record format`);
                  return;
                } 
                else if (req.method === 'POST') {
                  let body = '';
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', async () => {
                    try {
                      console.log('💾 Saving workflow to AppData...');
                      const workflow = JSON.parse(body);
                      const workflowId = await appDataStorage.saveWorkflow(workflow);
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true, workflowId }));
                      console.log(`✅ Workflow saved with ID: ${workflowId}`);
                    } catch (error) {
                      console.error('❌ Workflow save failed:', error);
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: error.message }));
                    }
                  });
                  return;
                }
              }

              // If no endpoint matched, continue to next middleware
              next();

            } catch (error) {
              console.error('❌ AppData API error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        }
      }
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});
