import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * AppData Storage Class for ComfyWeb v2
 * 
 * Provides persistent storage in OS-appropriate AppData directories:
 * - Windows: %APPDATA%/ComfyWebV2/
 * - Mac: ~/Library/Application Support/ComfyWebV2/
 * - Linux: ~/.config/ComfyWebV2/
 * 
 * Handles workflows, gallery metadata, and user settings with
 * automatic backup creation and cross-platform compatibility.
 */
export class AppDataStorage {
  private appDataPath: string;
  private workflowsPath: string;
  private galleryPath: string;
  private settingsPath: string;
  private backupsPath: string;

  constructor() {
    // Determine cross-platform AppData path
    const platform = os.platform();
    const homeDir = os.homedir();

    if (platform === 'win32') {
      // Windows: %APPDATA%/ComfyWebV2/
      this.appDataPath = path.join(homeDir, 'AppData', 'Roaming', 'ComfyWebV2');
    } else if (platform === 'darwin') {
      // Mac: ~/Library/Application Support/ComfyWebV2/
      this.appDataPath = path.join(homeDir, 'Library', 'Application Support', 'ComfyWebV2');
    } else {
      // Linux: ~/.config/ComfyWebV2/
      this.appDataPath = path.join(homeDir, '.config', 'ComfyWebV2');
    }

    // Set up subdirectory paths
    this.workflowsPath = path.join(this.appDataPath, 'workflows');
    this.galleryPath = path.join(this.appDataPath, 'gallery');
    this.settingsPath = path.join(this.appDataPath, 'settings');
    this.backupsPath = path.join(this.appDataPath, 'backups');
  }

  /**
   * Initialize storage directories
   * Creates all required directories if they don't exist
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.workflowsPath, { recursive: true });
      await fs.mkdir(this.galleryPath, { recursive: true });
      await fs.mkdir(this.settingsPath, { recursive: true });
      await fs.mkdir(this.backupsPath, { recursive: true });
      
      console.log('AppData storage initialized:', this.appDataPath);
    } catch (error) {
      console.error('Failed to initialize AppData storage:', error);
      throw new Error(`AppData storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Get storage information and status
   */
  getStorageInfo(): object {
    return {
      platform: os.platform(),
      appDataPath: this.appDataPath,
      directories: {
        workflows: this.workflowsPath,
        gallery: this.galleryPath,
        settings: this.settingsPath,
        backups: this.backupsPath
      }
    };
  }

  // ========================================
  // WORKFLOW STORAGE METHODS
  // ========================================

  /**
   * Save a workflow to AppData
   * @param workflow - Workflow object to save
   * @returns Promise<string> - Workflow ID
   */
  async saveWorkflow(workflow: any): Promise<string> {
    try {
      await this.initialize();

      // Generate unique workflow ID if not provided
      const workflowId = workflow.id || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${workflowId}.json`;
      const filePath = path.join(this.workflowsPath, fileName);

      // Add metadata
      const workflowWithMeta = {
        ...workflow,
        id: workflowId,
        saved_at: new Date().toISOString(),
        version: '2.0'
      };

      await fs.writeFile(filePath, JSON.stringify(workflowWithMeta, null, 2), 'utf8');
      
      // Update workflow index
      await this.updateWorkflowIndex();
      
      console.log('Workflow saved to AppData:', fileName);
      return workflowId;
    } catch (error) {
      console.error('Failed to save workflow to AppData:', error);
      throw new Error(`Workflow save failed: ${error.message}`);
    }
  }

  /**
   * Load all workflows from AppData
   * @returns Promise<any[]> - Array of workflow objects
   */
  async loadWorkflows(): Promise<any[]> {
    try {
      await this.initialize();

      const files = await fs.readdir(this.workflowsPath);
      const workflowFiles = files.filter(file => file.endsWith('.json') && file !== 'index.json');
      
      const workflows = [];
      
      for (const file of workflowFiles) {
        try {
          const filePath = path.join(this.workflowsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const workflow = JSON.parse(content);
          workflows.push(workflow);
        } catch (error) {
          console.warn(`Failed to load workflow ${file}:`, error);
          // Continue loading other workflows
        }
      }

      console.log(`Loaded ${workflows.length} workflows from AppData`);
      return workflows;
    } catch (error) {
      console.error('Failed to load workflows from AppData:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Delete a workflow from AppData
   * @param workflowId - ID of workflow to delete
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      const fileName = `${workflowId}.json`;
      const filePath = path.join(this.workflowsPath, fileName);
      
      await fs.unlink(filePath);
      await this.updateWorkflowIndex();
      
      console.log('Workflow deleted from AppData:', fileName);
    } catch (error) {
      console.error('Failed to delete workflow from AppData:', error);
      throw new Error(`Workflow deletion failed: ${error.message}`);
    }
  }

  /**
   * Update workflow index file
   * Creates/updates an index of all workflows for quick loading
   */
  private async updateWorkflowIndex(): Promise<void> {
    try {
      const workflows = await this.loadWorkflows();
      const index = {
        total: workflows.length,
        last_updated: new Date().toISOString(),
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name || 'Untitled Workflow',
          saved_at: w.saved_at,
          steps: w.steps?.length || 0
        }))
      };

      const indexPath = path.join(this.workflowsPath, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to update workflow index:', error);
      // Non-critical error, don't throw
    }
  }

  // ========================================
  // GALLERY STORAGE METHODS
  // ========================================

  /**
   * Save gallery index to AppData
   * @param galleryData - Gallery data object
   */
  async saveGalleryIndex(galleryData: any): Promise<void> {
    try {
      await this.initialize();

      const galleryWithMeta = {
        ...galleryData,
        last_updated: new Date().toISOString(),
        version: '2.0'
      };

      const filePath = path.join(this.galleryPath, 'gallery_index.json');
      await fs.writeFile(filePath, JSON.stringify(galleryWithMeta, null, 2), 'utf8');
      
      console.log('Gallery index saved to AppData');
    } catch (error) {
      console.error('Failed to save gallery index to AppData:', error);
      throw new Error(`Gallery save failed: ${error.message}`);
    }
  }

  /**
   * Load gallery index from AppData
   * @returns Promise<any> - Gallery data object
   */
  async loadGalleryIndex(): Promise<any> {
    try {
      await this.initialize();

      const filePath = path.join(this.galleryPath, 'gallery_index.json');
      const content = await fs.readFile(filePath, 'utf8');
      const galleryData = JSON.parse(content);
      
      console.log('Gallery index loaded from AppData');
      return galleryData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty gallery
        console.log('No gallery index found, returning empty gallery');
        return {
          images: [],
          total_images: 0,
          last_updated: new Date().toISOString()
        };
      }
      
      console.error('Failed to load gallery index from AppData:', error);
      throw new Error(`Gallery load failed: ${error.message}`);
    }
  }

  // ========================================
  // SETTINGS STORAGE METHODS
  // ========================================

  /**
   * Save user settings to AppData
   * @param settings - Settings object
   */
  async saveSettings(settings: any): Promise<void> {
    try {
      await this.initialize();

      const settingsWithMeta = {
        ...settings,
        last_updated: new Date().toISOString(),
        version: '2.0'
      };

      const filePath = path.join(this.settingsPath, 'user_settings.json');
      await fs.writeFile(filePath, JSON.stringify(settingsWithMeta, null, 2), 'utf8');
      
      console.log('Settings saved to AppData');
    } catch (error) {
      console.error('Failed to save settings to AppData:', error);
      throw new Error(`Settings save failed: ${error.message}`);
    }
  }

  /**
   * Load user settings from AppData
   * @returns Promise<any> - Settings object
   */
  async loadSettings(): Promise<any> {
    try {
      await this.initialize();

      const filePath = path.join(this.settingsPath, 'user_settings.json');
      const content = await fs.readFile(filePath, 'utf8');
      const settings = JSON.parse(content);
      
      console.log('Settings loaded from AppData');
      return settings;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default settings
        console.log('No settings found, returning defaults');
        return {
          comfyui_host: '127.0.0.1:8188',
          theme: 'dark',
          auto_save: true
        };
      }
      
      console.error('Failed to load settings from AppData:', error);
      throw new Error(`Settings load failed: ${error.message}`);
    }
  }

  // ========================================
  // BACKUP METHODS
  // ========================================

  /**
   * Create automatic backup
   * @param type - Type of data to backup ('workflows' | 'gallery' | 'settings' | 'all')
   */
  async createBackup(type: 'workflows' | 'gallery' | 'settings' | 'all' = 'all'): Promise<void> {
    try {
      await this.initialize();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (type === 'workflows' || type === 'all') {
        const workflows = await this.loadWorkflows();
        const backupPath = path.join(this.backupsPath, `workflows_backup_${timestamp}.json`);
        await fs.writeFile(backupPath, JSON.stringify(workflows, null, 2), 'utf8');
        console.log('Workflows backup created:', backupPath);
      }
      
      if (type === 'gallery' || type === 'all') {
        const gallery = await this.loadGalleryIndex();
        const backupPath = path.join(this.backupsPath, `gallery_backup_${timestamp}.json`);
        await fs.writeFile(backupPath, JSON.stringify(gallery, null, 2), 'utf8');
        console.log('Gallery backup created:', backupPath);
      }
      
      if (type === 'settings' || type === 'all') {
        const settings = await this.loadSettings();
        const backupPath = path.join(this.backupsPath, `settings_backup_${timestamp}.json`);
        await fs.writeFile(backupPath, JSON.stringify(settings, null, 2), 'utf8');
        console.log('Settings backup created:', backupPath);
      }
      
      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('Failed to create backup:', error);
      // Don't throw - backups are non-critical
    }
  }

  /**
   * Clean up old backup files (keep last 10 of each type)
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupsPath);
      
      const backupTypes = ['workflows', 'gallery', 'settings'];
      
      for (const type of backupTypes) {
        const typeFiles = files
          .filter(file => file.startsWith(`${type}_backup_`))
          .sort()
          .reverse(); // Newest first
        
        // Keep only the 10 newest, delete the rest
        const filesToDelete = typeFiles.slice(10);
        
        for (const file of filesToDelete) {
          try {
            await fs.unlink(path.join(this.backupsPath, file));
            console.log('Deleted old backup:', file);
          } catch (error) {
            console.warn('Failed to delete old backup:', file, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if AppData storage is available and writable
   * @returns Promise<boolean>
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      
      // Test write access
      const testFile = path.join(this.appDataPath, '.test_write_access');
      await fs.writeFile(testFile, 'test', 'utf8');
      await fs.unlink(testFile);
      
      return true;
    } catch (error) {
      console.warn('AppData storage not available:', error);
      return false;
    }
  }

  /**
   * Get storage usage statistics
   * @returns Promise<object> - Storage stats
   */
  async getStorageStats(): Promise<object> {
    try {
      await this.initialize();

      const workflows = await this.loadWorkflows();
      const gallery = await this.loadGalleryIndex();
      const settings = await this.loadSettings();

      return {
        workflows: {
          count: workflows.length,
          last_updated: workflows.length > 0 ? Math.max(...workflows.map(w => new Date(w.saved_at || 0).getTime())) : null
        },
        gallery: {
          count: gallery.images?.length || 0,
          last_updated: gallery.last_updated
        },
        settings: {
          last_updated: settings.last_updated
        },
        storage_path: this.appDataPath
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        error: error.message,
        storage_path: this.appDataPath
      };
    }
  }
}

// Export singleton instance
export const appDataStorage = new AppDataStorage();
