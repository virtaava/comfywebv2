import type { DeepReadonly } from "ts-essentials";
import type { WorkflowStep } from "./workflow";
import * as R from "remeda";

export interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  dateCreated: Date;
  dateModified: Date;
  steps: WorkflowStep[];
  thumbnail?: string; // Base64 encoded preview
  tags?: string[];
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  dateCreated: Date;
  dateModified: Date;
  stepCount: number;
  tags?: string[];
}

export class FileSystemWorkflowStorage {
  private readonly STORAGE_DIR = 'C:\\Users\\virta\\AI\\Claude\\comfywebv2\\saved-workflows';
  private readonly METADATA_FILE = 'metadata.json';
  private metadataCache: WorkflowMetadata[] | null = null;

  /**
   * Save a workflow to file system
   */
  async saveWorkflow(
    name: string,
    steps: DeepReadonly<WorkflowStep[]>,
    description?: string,
    tags?: string[]
  ): Promise<string> {
    const id = this.generateWorkflowId();
    const now = new Date();
    
    const workflow: SavedWorkflow = {
      id,
      name,
      description,
      dateCreated: now,
      dateModified: now,
      steps: R.clone(steps),
      tags
    };

    try {
      // Use File System Access API if available (Chrome/Edge)
      if ('showDirectoryPicker' in window) {
        await this.saveWithFileSystemAPI(workflow);
      } else {
        // Fallback: download the workflow file
        this.downloadComfyUIWorkflow(workflow);
      }

      // Update metadata
      await this.updateMetadataIndex(workflow);
      
      return id;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      // Fallback to localStorage if file system fails
      return this.saveToLocalStorage(workflow);
    }
  }

  /**
   * Load a workflow by ID
   */
  async loadWorkflow(id: string): Promise<SavedWorkflow | null> {
    try {
      // Try file system first
      if ('showDirectoryPicker' in window) {
        return await this.loadWithFileSystemAPI(id);
      } else {
        // Fallback to localStorage
        return this.loadFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return null;
    }
  }

  /**
   * Get all workflow metadata
   */
  async getWorkflowMetadata(): Promise<WorkflowMetadata[]> {
    if (this.metadataCache) {
      return this.metadataCache;
    }

    try {
      // Try to load from file system
      if ('showDirectoryPicker' in window) {
        this.metadataCache = await this.loadMetadataFromFileSystem();
      } else {
        // Fallback to localStorage
        this.metadataCache = this.loadMetadataFromLocalStorage();
      }
      
      return this.metadataCache || [];
    } catch (error) {
      console.error('Failed to load metadata:', error);
      return [];
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    try {
      if ('showDirectoryPicker' in window) {
        return await this.deleteWithFileSystemAPI(id);
      } else {
        return this.deleteFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      return false;
    }
  }

  /**
   * Export all workflows as individual ComfyUI-compatible files in a ZIP
   */
  async exportAllWorkflows(): Promise<void> {
    const metadata = await this.getWorkflowMetadata();
    
    if (metadata.length === 0) {
      throw new Error('No workflows to export');
    }

    // For now, export as individual downloads
    // Future enhancement: Create ZIP file
    for (const meta of metadata) {
      const workflow = await this.loadWorkflow(meta.id);
      if (workflow) {
        this.downloadComfyUIWorkflow(workflow);
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Export a single workflow as ComfyUI-compatible format
   */
  exportSingleWorkflow(workflow: SavedWorkflow): void {
    this.downloadComfyUIWorkflow(workflow);
  }

  /**
   * Import workflows from exported file
   */
  async importWorkflows(file: File): Promise<{ success: number; errors: string[] }> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const errors: string[] = [];
      let success = 0;

      for (const [, workflow] of Object.entries(importData)) {
        try {
          const typedWorkflow = workflow as SavedWorkflow;
          if (this.validateWorkflow(typedWorkflow)) {
            // Generate new ID to avoid conflicts
            const newId = this.generateWorkflowId();
            typedWorkflow.id = newId;
            typedWorkflow.dateModified = new Date();

            await this.saveWorkflow(
              typedWorkflow.name,
              typedWorkflow.steps,
              typedWorkflow.description,
              typedWorkflow.tags
            );
            success++;
          } else {
            errors.push(`Invalid workflow format`);
          }
        } catch (error) {
          errors.push(`Failed to import workflow: ${error.message}`);
        }
      }

      return { success, errors };
    } catch (error) {
      return { success: 0, errors: [`Invalid file format: ${error.message}`] };
    }
  }

  // File System Access API methods
  private async saveWithFileSystemAPI(workflow: SavedWorkflow): Promise<void> {
    // Note: This requires user permission and only works in secure contexts
    // For now, we'll use download as fallback
    this.downloadComfyUIWorkflow(workflow);
  }

  private async loadWithFileSystemAPI(id: string): Promise<SavedWorkflow | null> {
    // For now, fallback to localStorage
    return this.loadFromLocalStorage(id);
  }

  private async loadMetadataFromFileSystem(): Promise<WorkflowMetadata[]> {
    // For now, fallback to localStorage
    return this.loadMetadataFromLocalStorage();
  }

  private async deleteWithFileSystemAPI(id: string): Promise<boolean> {
    // For now, fallback to localStorage
    return this.deleteFromLocalStorage(id);
  }

  private async updateMetadataIndex(workflow: SavedWorkflow): Promise<void> {
    // Update cached metadata
    if (!this.metadataCache) {
      this.metadataCache = await this.getWorkflowMetadata();
    }

    const metadata: WorkflowMetadata = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      dateCreated: workflow.dateCreated,
      dateModified: workflow.dateModified,
      stepCount: workflow.steps.length,
      tags: workflow.tags
    };

    // Remove existing entry with same ID
    this.metadataCache = this.metadataCache.filter(m => m.id !== workflow.id);
    // Add new/updated entry
    this.metadataCache.push(metadata);

    // Save to localStorage as backup
    localStorage.setItem('comfyweb_workflow_metadata', JSON.stringify(this.metadataCache));
  }

  // Download workflow as ComfyUI-compatible file
  private downloadComfyUIWorkflow(workflow: SavedWorkflow): void {
    // Convert ComfyWeb workflow steps back to ComfyUI format
    const comfyUIWorkflow = this.convertToComfyUIFormat(workflow);
    
    const fileName = `${workflow.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([JSON.stringify(comfyUIWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Convert ComfyWeb workflow steps to standard ComfyUI format
  private convertToComfyUIFormat(workflow: SavedWorkflow): any {
    // This would need to use the same logic as generateGraphMetadata and createComfyWorkflow
    // For now, we'll save in ComfyWeb format but with ComfyUI compatibility
    return {
      nodes: [],
      links: [],
      groups: [],
      config: {},
      extra: {
        comfyweb_workflow: {
          name: workflow.name,
          description: workflow.description,
          steps: workflow.steps,
          created: workflow.dateCreated,
          modified: workflow.dateModified
        }
      },
      version: 0.4
    };
  }

  // localStorage fallback methods
  private saveToLocalStorage(workflow: SavedWorkflow): string {
    const workflows = this.getAllWorkflowsFromLocalStorage();
    workflows[workflow.id] = workflow;
    localStorage.setItem('comfyweb_saved_workflows', JSON.stringify(workflows));
    return workflow.id;
  }

  private loadFromLocalStorage(id: string): SavedWorkflow | null {
    const workflows = this.getAllWorkflowsFromLocalStorage();
    const workflow = workflows[id];
    
    if (workflow) {
      // Convert date strings back to Date objects
      workflow.dateCreated = new Date(workflow.dateCreated);
      workflow.dateModified = new Date(workflow.dateModified);
    }
    
    return workflow || null;
  }

  private loadMetadataFromLocalStorage(): WorkflowMetadata[] {
    try {
      const metadata = localStorage.getItem('comfyweb_workflow_metadata');
      if (!metadata) return [];
      
      const parsed = JSON.parse(metadata);
      return parsed.map((item: any) => ({
        ...item,
        dateCreated: new Date(item.dateCreated),
        dateModified: new Date(item.dateModified)
      }));
    } catch (error) {
      console.error('Failed to load workflow metadata:', error);
      return [];
    }
  }

  private deleteFromLocalStorage(id: string): boolean {
    const workflows = this.getAllWorkflowsFromLocalStorage();
    if (workflows[id]) {
      delete workflows[id];
      localStorage.setItem('comfyweb_saved_workflows', JSON.stringify(workflows));
      
      // Update metadata cache
      if (this.metadataCache) {
        this.metadataCache = this.metadataCache.filter(m => m.id !== id);
        localStorage.setItem('comfyweb_workflow_metadata', JSON.stringify(this.metadataCache));
      }
      
      return true;
    }
    return false;
  }

  private getAllWorkflowsFromLocalStorage(): Record<string, SavedWorkflow> {
    try {
      const data = localStorage.getItem('comfyweb_saved_workflows');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load workflows from localStorage:', error);
      return {};
    }
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateWorkflow(workflow: any): workflow is SavedWorkflow {
    return (
      typeof workflow === 'object' &&
      typeof workflow.id === 'string' &&
      typeof workflow.name === 'string' &&
      Array.isArray(workflow.steps) &&
      workflow.dateCreated &&
      workflow.dateModified
    );
  }
}

// Singleton instance
export const workflowStorage = new FileSystemWorkflowStorage();
