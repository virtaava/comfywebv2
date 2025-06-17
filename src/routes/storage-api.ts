import { appDataStorage } from '../lib/appdata-storage.js';

/**
 * Storage API Routes for ComfyWeb v2
 * 
 * Provides HTTP endpoints for AppData storage operations without Express dependency.
 * Uses native Node.js HTTP with simple routing for Vite integration.
 */

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Parse JSON body from request
 */
async function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: any, statusCode: number, data: any): void {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Extract URL path and method for routing
 */
function parseRequest(req: any): { path: string, method: string, id?: string } {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/storage/', '').split('/');
  
  return {
    path: pathParts[0],
    method: req.method.toUpperCase(),
    id: pathParts[1]
  };
}

// ========================================
// MAIN REQUEST HANDLER
// ========================================

/**
 * Main storage API handler
 * Routes requests to appropriate handlers
 */
export async function handleStorageRequest(req: any, res: any): Promise<void> {
  try {
    const { path, method, id } = parseRequest(req);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    // Route to appropriate handler
    switch (path) {
      case 'workflows':
        await handleWorkflowRequests(req, res, method, id);
        break;
      case 'gallery':
        await handleGalleryRequests(req, res, method);
        break;
      case 'settings':
        await handleSettingsRequests(req, res, method);
        break;
      case 'status':
        await handleStatusRequests(req, res, method);
        break;
      case 'backup':
        await handleBackupRequests(req, res, method);
        break;
      case 'migrate':
        await handleMigrationRequests(req, res, method);
        break;
      default:
        sendJson(res, 404, {
          success: false,
          error: 'Storage API endpoint not found',
          available_endpoints: [
            'GET /api/storage/workflows',
            'POST /api/storage/workflows',
            'DELETE /api/storage/workflows/:id',
            'GET /api/storage/gallery',
            'POST /api/storage/gallery',
            'GET /api/storage/settings',
            'POST /api/storage/settings',
            'GET /api/storage/status',
            'POST /api/storage/backup',
            'POST /api/storage/migrate'
          ]
        });
    }
  } catch (error) {
    console.error('Storage API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Internal server error in storage API',
      details: error.message,
      fallback: 'browser_storage'
    });
  }
}

// ========================================
// WORKFLOW HANDLERS
// ========================================

async function handleWorkflowRequests(req: any, res: any, method: string, id?: string): Promise<void> {
  try {
    switch (method) {
      case 'GET':
        const workflows = await appDataStorage.loadWorkflows();
        // Convert array to object format expected by frontend
        const workflowsObject = {};
        workflows.forEach(workflow => {
          if (workflow.id) {
            workflowsObject[workflow.id] = workflow;
          }
        });
        
        sendJson(res, 200, workflowsObject);
        break;

      case 'POST':
        const workflow = await parseBody(req);
        if (!workflow || typeof workflow !== 'object') {
          sendJson(res, 400, {
            success: false,
            error: 'Invalid workflow data provided'
          });
          return;
        }
        
        const workflowId = await appDataStorage.saveWorkflow(workflow);
        sendJson(res, 200, {
          success: true,
          id: workflowId,
          message: 'Workflow saved successfully'
        });
        break;

      case 'DELETE':
        if (!id) {
          sendJson(res, 400, {
            success: false,
            error: 'Workflow ID is required'
          });
          return;
        }
        
        await appDataStorage.deleteWorkflow(id);
        sendJson(res, 200, {
          success: true,
          data: {
            id: id,
            message: 'Workflow deleted successfully'
          },
          timestamp: new Date().toISOString()
        });
        break;

      default:
        sendJson(res, 405, {
          success: false,
          error: 'Method not allowed for workflows endpoint'
        });
    }
  } catch (error) {
    console.error('Workflow API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Failed to process workflow request',
      details: error.message,
      fallback: 'browser_storage'
    });
  }
}

// ========================================
// GALLERY HANDLERS
// ========================================

async function handleGalleryRequests(req: any, res: any, method: string): Promise<void> {
  try {
    switch (method) {
      case 'GET':
        const galleryData = await appDataStorage.loadGalleryIndex();
        sendJson(res, 200, {
          success: true,
          data: galleryData,
          timestamp: new Date().toISOString()
        });
        break;

      case 'POST':
        const gallery = await parseBody(req);
        if (!gallery || typeof gallery !== 'object') {
          sendJson(res, 400, {
            success: false,
            error: 'Invalid gallery data provided'
          });
          return;
        }
        
        await appDataStorage.saveGalleryIndex(gallery);
        sendJson(res, 200, {
          success: true,
          data: {
            message: 'Gallery index saved successfully',
            images_count: gallery.images?.length || 0
          },
          timestamp: new Date().toISOString()
        });
        break;

      default:
        sendJson(res, 405, {
          success: false,
          error: 'Method not allowed for gallery endpoint'
        });
    }
  } catch (error) {
    console.error('Gallery API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Failed to process gallery request',
      details: error.message,
      fallback: 'browser_storage'
    });
  }
}

// ========================================
// SETTINGS HANDLERS
// ========================================

async function handleSettingsRequests(req: any, res: any, method: string): Promise<void> {
  try {
    switch (method) {
      case 'GET':
        const settings = await appDataStorage.loadSettings();
        sendJson(res, 200, {
          success: true,
          data: settings,
          timestamp: new Date().toISOString()
        });
        break;

      case 'POST':
        const newSettings = await parseBody(req);
        if (!newSettings || typeof newSettings !== 'object') {
          sendJson(res, 400, {
            success: false,
            error: 'Invalid settings data provided'
          });
          return;
        }
        
        await appDataStorage.saveSettings(newSettings);
        sendJson(res, 200, {
          success: true,
          data: {
            message: 'Settings saved successfully'
          },
          timestamp: new Date().toISOString()
        });
        break;

      default:
        sendJson(res, 405, {
          success: false,
          error: 'Method not allowed for settings endpoint'
        });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Failed to process settings request',
      details: error.message,
      fallback: 'browser_storage'
    });
  }
}

// ========================================
// STATUS HANDLERS
// ========================================

async function handleStatusRequests(req: any, res: any, method: string): Promise<void> {
  try {
    if (method !== 'GET') {
      sendJson(res, 405, {
        success: false,
        error: 'Method not allowed for status endpoint'
      });
      return;
    }

    const isAvailable = await appDataStorage.isAvailable();
    const storageInfo = appDataStorage.getStorageInfo();
    const stats = await appDataStorage.getStorageStats();
    
    sendJson(res, 200, {
      success: true,
      data: {
        available: isAvailable,
        storage_info: storageInfo,
        statistics: stats,
        status: isAvailable ? 'ready' : 'unavailable'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Failed to get storage status',
      details: error.message,
      data: {
        available: false,
        status: 'error'
      }
    });
  }
}

// ========================================
// BACKUP HANDLERS
// ========================================

async function handleBackupRequests(req: any, res: any, method: string): Promise<void> {
  try {
    if (method !== 'POST') {
      sendJson(res, 405, {
        success: false,
        error: 'Method not allowed for backup endpoint'
      });
      return;
    }

    const { type = 'all' } = await parseBody(req);
    
    if (!['workflows', 'gallery', 'settings', 'all'].includes(type)) {
      sendJson(res, 400, {
        success: false,
        error: 'Invalid backup type. Use: workflows, gallery, settings, or all'
      });
      return;
    }
    
    await appDataStorage.createBackup(type);
    
    sendJson(res, 200, {
      success: true,
      data: {
        message: `Backup created successfully for: ${type}`,
        type: type
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Failed to create backup',
      details: error.message
    });
  }
}

// ========================================
// MIGRATION HANDLERS
// ========================================

async function handleMigrationRequests(req: any, res: any, method: string): Promise<void> {
  try {
    if (method !== 'POST') {
      sendJson(res, 405, {
        success: false,
        error: 'Method not allowed for migration endpoint'
      });
      return;
    }

    const { workflows, gallery, settings } = await parseBody(req);
    const results = {
      workflows: 0,
      gallery: 0,
      settings: 0,
      errors: []
    };
    
    // Create backup before migration
    await appDataStorage.createBackup('all');
    
    // Migrate workflows
    if (workflows && Array.isArray(workflows)) {
      for (const workflow of workflows) {
        try {
          await appDataStorage.saveWorkflow(workflow);
          results.workflows++;
        } catch (error) {
          results.errors.push(`Workflow migration failed: ${error.message}`);
        }
      }
    }
    
    // Migrate gallery
    if (gallery && typeof gallery === 'object') {
      try {
        await appDataStorage.saveGalleryIndex(gallery);
        results.gallery = gallery.images?.length || 0;
      } catch (error) {
        results.errors.push(`Gallery migration failed: ${error.message}`);
      }
    }
    
    // Migrate settings
    if (settings && typeof settings === 'object') {
      try {
        await appDataStorage.saveSettings(settings);
        results.settings = 1;
      } catch (error) {
        results.errors.push(`Settings migration failed: ${error.message}`);
      }
    }
    
    const success = results.errors.length === 0;
    
    sendJson(res, 200, {
      success: success,
      data: {
        message: success ? 'Migration completed successfully' : 'Migration completed with errors',
        results: results,
        migrated: {
          workflows: results.workflows,
          gallery_images: results.gallery,
          settings: results.settings > 0
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Migration API error:', error);
    sendJson(res, 500, {
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
}
