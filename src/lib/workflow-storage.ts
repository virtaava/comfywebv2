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

export class WorkflowStorageManager {
  private readonly STORAGE_KEY = 'comfyweb_saved_workflows';
  private readonly METADATA_KEY = 'comfyweb_workflow_metadata';

  /**
   * Save a workflow to local storage
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

    // Save full workflow data
    const workflows = this.getAllWorkflows();
    workflows[id] = workflow;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));

    // Update metadata index
    this.updateMetadataIndex();

    return id;
  }

  /**
   * Load a workflow by ID
   */
  loadWorkflow(id: string): SavedWorkflow | null {
    const workflows = this.getAllWorkflows();
    const workflow = workflows[id];
    
    if (workflow) {
      // Convert date strings back to Date objects
      workflow.dateCreated = new Date(workflow.dateCreated);
      workflow.dateModified = new Date(workflow.dateModified);
    }
    
    return workflow || null;
  }

  /**
   * Get all workflow metadata (for listing)
   */
  getWorkflowMetadata(): WorkflowMetadata[] {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
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

  /**
   * Delete a workflow
   */
  deleteWorkflow(id: string): boolean {
    const workflows = this.getAllWorkflows();
    if (workflows[id]) {
      delete workflows[id];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
      this.updateMetadataIndex();
      return true;
    }
    return false;
  }

  /**
   * Update an existing workflow
   */
  updateWorkflow(
    id: string,
    updates: Partial<Pick<SavedWorkflow, 'name' | 'description' | 'steps' | 'tags'>>
  ): boolean {
    const workflows = this.getAllWorkflows();
    const workflow = workflows[id];
    
    if (!workflow) return false;

    // Update fields
    Object.assign(workflow, updates, {
      dateModified: new Date()
    });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
    this.updateMetadataIndex();
    return true;
  }

  /**
   * Rename a workflow
   */
  renameWorkflow(id: string, newName: string): boolean {
    return this.updateWorkflow(id, { name: newName });
  }

  /**
   * Export all workflows
   */
  exportAllWorkflows(): string {
    const workflows = this.getAllWorkflows();
    return JSON.stringify(workflows, null, 2);
  }

  /**
   * Import workflows from JSON
   */
  importWorkflows(jsonData: string): { success: number; errors: string[] } {
    try {
      const importedWorkflows = JSON.parse(jsonData);
      const errors: string[] = [];
      let success = 0;

      for (const [id, workflow] of Object.entries(importedWorkflows)) {
        try {
          const typedWorkflow = workflow as SavedWorkflow;
          if (this.validateWorkflow(typedWorkflow)) {
            // Generate new ID to avoid conflicts
            const newId = this.generateWorkflowId();
            typedWorkflow.id = newId;
            typedWorkflow.dateCreated = new Date(typedWorkflow.dateCreated);
            typedWorkflow.dateModified = new Date();

            const workflows = this.getAllWorkflows();
            workflows[newId] = typedWorkflow;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workflows));
            success++;
          } else {
            errors.push(`Invalid workflow: ${id}`);
          }
        } catch (error) {
          errors.push(`Failed to import workflow ${id}: ${error.message}`);
        }
      }

      if (success > 0) {
        this.updateMetadataIndex();
      }

      return { success, errors };
    } catch (error) {
      return { success: 0, errors: [`Invalid JSON data: ${error.message}`] };
    }
  }

  /**
   * Search workflows
   */
  searchWorkflows(query: string): WorkflowMetadata[] {
    const metadata = this.getWorkflowMetadata();
    const lowerQuery = query.toLowerCase();
    
    return metadata.filter(workflow => 
      workflow.name.toLowerCase().includes(lowerQuery) ||
      workflow.description?.toLowerCase().includes(lowerQuery) ||
      workflow.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): { 
    workflowCount: number; 
    storageUsed: number; 
    storageAvailable: number;
  } {
    const workflows = this.getAllWorkflows();
    const workflowCount = Object.keys(workflows).length;
    
    const data = localStorage.getItem(this.STORAGE_KEY) || '';
    const storageUsed = new Blob([data]).size;
    
    // Estimate available storage (5MB typical localStorage limit)
    const storageAvailable = 5 * 1024 * 1024 - storageUsed;

    return { workflowCount, storageUsed, storageAvailable };
  }

  private getAllWorkflows(): Record<string, SavedWorkflow> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load workflows from localStorage:', error);
      return {};
    }
  }

  private updateMetadataIndex(): void {
    const workflows = this.getAllWorkflows();
    const metadata: WorkflowMetadata[] = Object.values(workflows).map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      dateCreated: workflow.dateCreated,
      dateModified: workflow.dateModified,
      stepCount: workflow.steps.length,
      tags: workflow.tags
    }));

    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
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
export const workflowStorage = new WorkflowStorageManager();
