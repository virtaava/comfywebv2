// src/lib/manager-api.ts
// ComfyUI Manager HTTP API Integration for Enhanced Missing Nodes System

export interface ExtensionInfo {
  id: string;
  title: string;
  description: string;
  author: string;
  stars: number;
  versions: string[];
  repository: string;
  dependencies: string[];
  conflicts: string[];
  installSize: string;
  trusted: boolean;
  lastUpdated?: string;
  category?: string;
}

export interface ExtensionSelection {
  extensionId: string;
  version: string;
  nodeType: string;
  gitUrl: string;
  title?: string;
  author?: string;
}

export interface QueueStatus {
  total_count: number;
  done_count: number;
  in_progress_count: number;
  is_processing: boolean;
}

export interface ConflictWarning {
  type: 'dependency' | 'version' | 'exclusion';
  message: string;
  affectedExtensions: string[];
  resolutions: ConflictResolution[];
}

export interface ConflictResolution {
  action: 'replace' | 'skip' | 'install-alongside';
  description: string;
  impact: string;
}

export interface InstallationResult {
  status: 'success' | 'error' | 'partial';
  installedExtensions: string[];
  failedExtensions: string[];
  needsRestart: boolean;
  message?: string;
}

// Enhanced API Functions with Real ComfyUI Manager Integration
export async function getExtensionAlternatives(serverHost: string): Promise<Record<string, ExtensionInfo[]>> {
  try {
    console.log('[Manager API] Fetching extension alternatives from ComfyUI Manager...');
    const response = await fetch(`http://${serverHost}/customnode/alternatives?mode=comfy`);
    if (!response.ok) {
      throw new Error(`ComfyUI Manager API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Manager API] Raw alternatives data:', data);
    
    // Handle different response formats from ComfyUI Manager
    const alternatives: Record<string, ExtensionInfo[]> = {};
    
    if (data && typeof data === 'object') {
      for (const [nodeType, extensions] of Object.entries(data)) {
        if (Array.isArray(extensions)) {
          alternatives[nodeType] = extensions.map((ext: any) => ({
            id: ext.id || ext.name || ext.key || 'unknown',
            title: ext.title || ext.name || ext.description?.split('\n')[0] || 'Unknown Extension',
            description: ext.description || ext.comment || '',
            author: ext.author || ext.owner || 'Unknown',
            stars: parseInt(ext.stars) || 0,
            versions: ext.versions || ['latest'],
            repository: ext.repository || ext.reference || ext.files?.[0] || '',
            dependencies: ext.dependencies || [],
            conflicts: ext.conflicts || [],
            installSize: ext.install_size || ext.size || 'Unknown',
            trusted: ext.trusted || ext.stars > 100 || false,
            lastUpdated: ext.last_update || ext.updated,
            category: ext.category || 'custom-nodes'
          }));
        }
      }
    }
    
    console.log('[Manager API] Processed alternatives:', Object.keys(alternatives).length, 'node types');
    return alternatives;
  } catch (error) {
    console.error('[Manager API] Failed to get extension alternatives:', error);
    // Fallback: try to get data from node mappings + available extensions
    return await getFallbackAlternatives(serverHost);
  }
}

export async function getNodeMappings(serverHost: string): Promise<Record<string, string[]>> {
  try {
    console.log('[Manager API] Fetching node mappings from ComfyUI Manager...');
    const response = await fetch(`http://${serverHost}/customnode/getmappings?mode=comfy`);
    if (!response.ok) {
      throw new Error(`ComfyUI Manager API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Manager API] Node mappings loaded:', Object.keys(data).length, 'node types mapped');
    return data;
  } catch (error) {
    console.error('[Manager API] Failed to get node mappings:', error);
    throw error;
  }
}

export async function getAvailableExtensions(serverHost: string): Promise<Record<string, ExtensionInfo>> {
  try {
    console.log('[Manager API] Fetching installed extensions from ComfyUI Manager...');
    const response = await fetch(`http://${serverHost}/customnode/getlist?mode=comfy`);
    if (!response.ok) {
      throw new Error(`ComfyUI Manager API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Manager API] Raw extensions data keys:', Object.keys(data));
    
    // Handle different response formats from ComfyUI Manager
    const extensions: Record<string, ExtensionInfo> = {};
    
    // Try different possible data structures
    let nodePacks = data.node_packs || data.custom_nodes || data;
    
    if (Array.isArray(nodePacks)) {
      // Handle array format
      nodePacks.forEach((pack: any, index: number) => {
        const id = pack.id || pack.name || pack.key || `extension_${index}`;
        extensions[id] = transformToExtensionInfo(pack, id);
      });
    } else if (typeof nodePacks === 'object') {
      // Handle object format
      for (const [id, pack] of Object.entries(nodePacks)) {
        extensions[id] = transformToExtensionInfo(pack as any, id);
      }
    }
    
    console.log('[Manager API] Processed extensions:', Object.keys(extensions).length, 'extensions');
    return extensions;
  } catch (error) {
    console.error('[Manager API] Failed to get available extensions:', error);
    throw error;
  }
}

// Helper function to transform ComfyUI Manager data to our format
function transformToExtensionInfo(pack: any, id: string): ExtensionInfo {
  return {
    id,
    title: pack.title || pack.name || pack.description?.split('\n')[0] || id,
    description: pack.description || pack.comment || '',
    author: pack.author || pack.owner || 'Unknown',
    stars: parseInt(pack.stars) || 0,
    versions: pack.versions || ['latest'],
    repository: pack.repository || pack.reference || pack.files?.[0] || '',
    dependencies: pack.dependencies || [],
    conflicts: pack.conflicts || [],
    installSize: pack.install_size || pack.size || 'Unknown',
    trusted: pack.trusted || (pack.stars && parseInt(pack.stars) > 50) || false,
    lastUpdated: pack.last_update || pack.updated,
    category: pack.category || 'custom-nodes'
  };
}

export async function getInstalledExtensions(serverHost: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`http://${serverHost}/customnode/installed?mode=default`);
    if (!response.ok) {
      throw new Error(`Failed to fetch installed extensions: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Manager API] Failed to get installed extensions:', error);
    throw error;
  }
}

// NEW: Get installation options from registry (for missing nodes)
export async function getInstallableExtensions(serverHost: string): Promise<Record<string, ExtensionInfo>> {
  try {
    console.log('[Manager API] Fetching installable extensions from registry...');
    const response = await fetch(`http://${serverHost}/customnode/getlist?mode=remote`);
    if (!response.ok) {
      throw new Error(`ComfyUI Manager API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Manager API] Raw installable extensions data keys:', Object.keys(data));
    
    const extensions: Record<string, ExtensionInfo> = {};
    let nodePacks = data.node_packs || data.custom_nodes || data;
    
    if (Array.isArray(nodePacks)) {
      nodePacks.forEach((pack: any, index: number) => {
        const id = pack.id || pack.name || pack.key || `extension_${index}`;
        extensions[id] = transformToExtensionInfo(pack, id);
      });
    } else if (typeof nodePacks === 'object') {
      for (const [id, pack] of Object.entries(nodePacks)) {
        extensions[id] = transformToExtensionInfo(pack as any, id);
      }
    }
    
    console.log('[Manager API] Processed installable extensions:', Object.keys(extensions).length, 'extensions');
    return extensions;
  } catch (error) {
    console.error('[Manager API] Failed to get installable extensions:', error);
    throw error;
  }
}

// NEW: Get installation alternatives from registry (for missing nodes)
export async function getInstallationAlternatives(serverHost: string): Promise<Record<string, ExtensionInfo[]>> {
  try {
    console.log('[Manager API] Fetching installation alternatives from registry...');
    const response = await fetch(`http://${serverHost}/customnode/alternatives?mode=remote`);
    if (!response.ok) {
      throw new Error(`ComfyUI Manager API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[Manager API] Raw installation alternatives data:', data);
    
    const alternatives: Record<string, ExtensionInfo[]> = {};
    
    if (data && typeof data === 'object') {
      for (const [nodeType, extensions] of Object.entries(data)) {
        if (Array.isArray(extensions)) {
          alternatives[nodeType] = extensions.map((ext: any) => ({
            id: ext.id || ext.name || ext.key || 'unknown',
            title: ext.title || ext.name || ext.description?.split('\n')[0] || 'Unknown Extension',
            description: ext.description || ext.comment || '',
            author: ext.author || ext.owner || 'Unknown',
            stars: parseInt(ext.stars) || 0,
            versions: ext.versions || ['latest'],
            repository: ext.repository || ext.reference || ext.files?.[0] || '',
            dependencies: ext.dependencies || [],
            conflicts: ext.conflicts || [],
            installSize: ext.install_size || ext.size || 'Unknown',
            trusted: ext.trusted || ext.stars > 100 || false,
            lastUpdated: ext.last_update || ext.updated,
            category: ext.category || 'custom-nodes'
          }));
        }
      }
    }
    
    console.log('[Manager API] Processed installation alternatives:', Object.keys(alternatives).length, 'node types');
    return alternatives;
  } catch (error) {
    console.error('[Manager API] Failed to get installation alternatives:', error);
    return {};
  }
}

// Installation Queue Functions
export async function queueExtensionInstallation(
  extension: ExtensionSelection,
  serverHost: string
): Promise<void> {
  try {
    // Get the complete extension metadata from registry
    const allExtensions = await getAvailableExtensions(serverHost);
    const extensionData = allExtensions[extension.extensionId];
    
    if (!extensionData) {
      throw new Error(`Extension ${extension.extensionId} not found in registry`);
    }

    // Create payload matching exactly what ComfyUI Manager sends
    const payload = {
      author: extensionData.author || "Unknown",
      title: extensionData.title || extension.extensionId,
      id: extension.extensionId,
      reference: extension.gitUrl,
      nodename_pattern: "", // Will be filled by Manager
      files: [extension.gitUrl],
      install_type: "git-clone",
      description: extensionData.description || "",
      cnr_latest: extension.version || "latest",
      health: "-",
      repository: extension.gitUrl,
      state: "not-installed",
      version: extension.version || "latest",
      "update-state": "false",
      stars: extensionData.stars || 0,
      last_update: extensionData.lastUpdated || new Date().toISOString().split('T')[0] + " 00:00:00",
      trust: extensionData.trusted || false,
      selected_version: extension.version || "latest",
      channel: "default",
      mode: "cache",
      ui_id: `comfyweb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      skip_post_install: false,
    };

    console.log(`[Manager API] Queueing installation for ${extension.extensionId}:`, payload);

    const response = await fetch(`http://${serverHost}/api/manager/queue/install`, {
      method: "POST",
      headers: { 
        "Content-Type": "text/plain;charset=UTF-8",
        "Accept": "*/*"
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI Manager installation queue error: ${response.status} ${errorText}`);
    }
    
    console.log(`[Manager API] Successfully queued installation: ${extension.extensionId}`);
  } catch (error) {
    console.error(`[Manager API] Failed to queue installation for ${extension.extensionId}:`, error);
    throw error;
  }
}

export async function startInstallationQueue(serverHost: string): Promise<void> {
  try {
    const response = await fetch(`http://${serverHost}/manager/queue/start`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to start installation queue: ${response.statusText}`);
    }
    console.log('[Manager API] Installation queue started');
  } catch (error) {
    console.error('[Manager API] Failed to start installation queue:', error);
    throw error;
  }
}

export async function getQueueStatus(serverHost: string): Promise<QueueStatus> {
  try {
    const response = await fetch(`http://${serverHost}/manager/queue/status`);
    if (!response.ok) {
      throw new Error(`Failed to get queue status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[Manager API] Failed to get queue status:', error);
    throw error;
  }
}

export async function resetQueue(serverHost: string): Promise<void> {
  try {
    const response = await fetch(`http://${serverHost}/manager/queue/reset`, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Failed to reset queue: ${response.statusText}`);
    }
    console.log('[Manager API] Installation queue reset');
  } catch (error) {
    console.error('[Manager API] Failed to reset queue:', error);
    throw error;
  }
}

/**
 * Restart ComfyUI server via Manager API
 * Note: This will cause connection to drop immediately
 */
export async function restartComfyUI(serverHost: string): Promise<void> {
  try {
    console.log('[Manager API] Initiating ComfyUI restart...');
    
    const response = await fetch(`http://${serverHost}/api/manager/reboot`, {
      method: "GET",
      headers: {
        "Comfy-User": "",  // Match ComfyUI Manager headers
      },
    });
    
    // Note: Response may not complete due to immediate restart
    // Don't throw on network errors during restart
    console.log('[Manager API] ComfyUI restart initiated (connection may drop)');
  } catch (error) {
    // Expected: network error as ComfyUI restarts
    console.log('[Manager API] ComfyUI restart initiated (connection dropped as expected)');
  }
}

/**
 * Wait for ComfyUI to come back online after restart
 * Monitors the /api/queue endpoint to detect when server is ready
 */
export async function waitForComfyUIRestart(serverHost: string, maxWaitTimeMs: number = 60000): Promise<void> {
  const startTime = Date.now();
  const checkIntervalMs = 2000; // Check every 2 seconds
  let attempt = 0;
  
  console.log('[Manager API] Waiting for ComfyUI to come back online...');
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    attempt++;
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${serverHost}/api/queue`, {
        method: "GET",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`[Manager API] ComfyUI back online after ${elapsedSeconds} seconds (attempt ${attempt})`);
        return; // Success!
      }
    } catch (error) {
      // Still restarting or timeout, continue waiting
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Manager API] Attempt ${attempt} (${elapsedSeconds}s): ComfyUI still restarting...`);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  throw new Error(`ComfyUI did not come back online within ${maxWaitTimeMs / 1000} seconds`);
}

// Enhanced API Functions for Conflict Resolution
export async function getExtensionVersions(extensionId: string, serverHost: string): Promise<string[]> {
  try {
    const response = await fetch(`http://${serverHost}/customnode/versions/${extensionId}`);
    if (!response.ok) {
      // If specific versions not available, return default
      return ['latest', 'nightly'];
    }
    const versions = await response.json();
    return versions.map((v: any) => v.version || v);
  } catch (error) {
    console.warn(`[Manager API] Could not get versions for ${extensionId}, using defaults:`, error);
    return ['latest', 'nightly'];
  }
}

export async function validateExtensionConflicts(
  selections: ExtensionSelection[], 
  serverHost: string
): Promise<ConflictWarning[]> {
  // This would ideally call a ComfyUI Manager endpoint, but we'll implement client-side analysis
  const conflicts: ConflictWarning[] = [];
  
  try {
    // Get all available extensions to check for conflicts
    const allExtensions = await getAvailableExtensions(serverHost);
    const installedExtensions = await getInstalledExtensions(serverHost);
    
    // Analyze conflicts between selected extensions
    for (let i = 0; i < selections.length; i++) {
      for (let j = i + 1; j < selections.length; j++) {
        const ext1 = selections[i];
        const ext2 = selections[j];
        
        // Check if extensions provide the same nodes (potential conflict)
        if (ext1.nodeType === ext2.nodeType) {
          conflicts.push({
            type: 'exclusion',
            message: `Both ${ext1.extensionId} and ${ext2.extensionId} provide ${ext1.nodeType}`,
            affectedExtensions: [ext1.extensionId, ext2.extensionId],
            resolutions: [
              {
                action: 'replace',
                description: `Use only ${ext1.extensionId}`,
                impact: `${ext2.extensionId} will not be installed`
              },
              {
                action: 'replace',
                description: `Use only ${ext2.extensionId}`,
                impact: `${ext1.extensionId} will not be installed`
              }
            ]
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('[Manager API] Error validating conflicts:', error);
    return [];
  }
}

export async function estimateInstallationTime(extensions: ExtensionSelection[]): Promise<number> {
  // Simple estimation: 30 seconds per extension + 60 seconds restart
  const baseTime = extensions.length * 30 + 60;
  return Math.max(baseTime, 120); // Minimum 2 minutes
}

// Fallback function when alternatives endpoint fails
async function getFallbackAlternatives(serverHost: string): Promise<Record<string, ExtensionInfo[]>> {
  try {
    console.log('[Manager API] Using fallback: combining mappings + installable extensions...');
    const [mappings, installableExtensions] = await Promise.all([
      getNodeMappings(serverHost),
      getInstallableExtensions(serverHost)
    ]);
    
    const alternatives: Record<string, ExtensionInfo[]> = {};
    
    // For each node type, find extensions that provide it
    for (const [nodeType, extensionIds] of Object.entries(mappings)) {
      alternatives[nodeType] = extensionIds
        .map(id => installableExtensions[id])
        .filter(ext => ext !== undefined);
    }
    
    console.log('[Manager API] Fallback alternatives created:', Object.keys(alternatives).length, 'node types');
    return alternatives;
  } catch (error) {
    console.error('[Manager API] Fallback also failed:', error);
    return {};
  }
}

// Enhanced helper function for API availability
export async function isManagerAPIAvailable(serverHost: string): Promise<boolean> {
  try {
    console.log('[Manager API] Checking ComfyUI Manager availability...');
    const response = await fetch(`http://${serverHost}/manager/version`, { method: 'GET' });
    const available = response.ok;
    console.log('[Manager API] Manager availability:', available);
    return available;
  } catch (error) {
    console.log('[Manager API] Manager not available:', error.message);
    return false;
  }
}

// Enhanced queue status with better error handling
export async function getDetailedQueueStatus(serverHost: string): Promise<QueueStatus & { error?: string }> {
  try {
    const response = await fetch(`http://${serverHost}/manager/queue/status`);
    if (!response.ok) {
      throw new Error(`Queue status error: ${response.status} ${response.statusText}`);
    }
    const status = await response.json();
    console.log('[Manager API] Queue status:', status);
    return status;
  } catch (error) {
    console.error('[Manager API] Failed to get detailed queue status:', error);
    return {
      total_count: 0,
      done_count: 0,
      in_progress_count: 0,
      is_processing: false,
      error: error.message
    };
  }
}
